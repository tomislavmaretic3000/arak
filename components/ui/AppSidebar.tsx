'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/store/ui'
import { useEditorStore, type Theme, type Font, type SizeOption } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'
import { useDocumentsStore } from '@/store/documents'
import { useDriveStore } from '@/store/drive'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'
import { listDriveFiles, readDriveFile, saveToDrive, type DriveFile } from '@/lib/drive/api'
import {
  buildHtmlDocument, writeModeToHtml, formatModeToHtml,
  downloadHtml, downloadTxt,
} from '@/lib/export/html'
import { printAsPdf } from '@/lib/export/pdf'

// ── Types ─────────────────────────────────────────────────────────────────────

type Level = 'main' | 'save' | 'export' | 'open' | 'open-drive' | 'recent' | 'settings'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateLabel(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getPreview(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim()
  function walk(node: Record<string, unknown>): string {
    if (node.type === 'text') return (node.text as string) ?? ''
    return ((node.content as Record<string, unknown>[]) ?? []).map(walk).join('')
  }
  return walk(content as Record<string, unknown>).trim()
}

// ── Item styles ───────────────────────────────────────────────────────────────

const ITEM: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '0.15em 0',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: '28px',
  fontWeight: 400,
  letterSpacing: '-0.04em',
  lineHeight: 1.25,
  color: 'var(--fg)',
  transition: 'opacity 120ms',
}

const SUB_ITEM: React.CSSProperties = {
  ...ITEM,
  opacity: 0.55,
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { menuOpen, closeMenu } = useUIStore()
  const [level, setLevel] = useState<Level>('main')
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  const { theme, font, fontSize, lineHeight, setTheme, setFont, setFontSize, setLineHeight } = useEditorStore()
  const writeContent = useEditorStore((s) => s.content)
  const setWriteContent = useEditorStore((s) => s.setContent)
  const writeTitle = useFilesStore((s) => s.title)
  const setWriteTitle = useFilesStore((s) => s.setTitle)
  const formatTitle = useFormatStore((s) => s.title)
  const formatContent = useFormatStore((s) => s.content)

  const { docs, activeWriteId, activeFormatId, createDoc, setActiveWrite, setActiveFormat } = useDocumentsStore()
  const activeDocId = isWrite ? activeWriteId : activeFormatId
  const { linkFile, getDriveId, getDriveName } = useDriveStore()
  const linkedDriveId = activeDocId ? getDriveId(activeDocId) : null

  const { data: session } = useSession()
  const token = session?.accessToken as string | undefined

  // Reset to main level when sidebar closes
  useEffect(() => {
    if (!menuOpen) setTimeout(() => setLevel('main'), 300)
  }, [menuOpen])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleNew = useCallback(() => {
    if (isWrite) {
      const doc = createDoc('write')
      useEditorStore.getState().setContent('')
      useFilesStore.getState().setTitle('untitled')
      setActiveWrite(doc.id)
    } else {
      const doc = createDoc('format')
      setActiveFormat(doc.id)
    }
    closeMenu()
  }, [isWrite, createDoc, setActiveWrite, setActiveFormat, closeMenu])

  const handleFormat = useCallback(() => {
    router.push(isWrite ? '/format' : '/write')
    closeMenu()
  }, [isWrite, router, closeMenu])

  const handleSaveDevice = useCallback(async () => {
    const title = isWrite ? writeTitle : formatTitle
    const content = isWrite ? writeContent : getPreview(formatContent)
    await saveToFile(content, (title || 'untitled') + '.txt')
    closeMenu()
  }, [isWrite, writeTitle, formatTitle, writeContent, formatContent, closeMenu])

  const handleSaveCloud = useCallback(async () => {
    if (!token) { signIn('google'); return }
    const title = isWrite ? writeTitle : formatTitle
    const content = isWrite ? writeContent : getPreview(formatContent)
    setStatus('saving…')
    try {
      const id = await saveToDrive(token, content, title || 'untitled', linkedDriveId ?? undefined)
      if (activeDocId) linkFile(activeDocId, id, `${title || 'untitled'}.txt`)
      setStatus('saved')
      setTimeout(() => { setStatus(null); closeMenu() }, 1000)
    } catch { setStatus('error'); setTimeout(() => setStatus(null), 2000) }
  }, [token, isWrite, writeTitle, formatTitle, writeContent, formatContent, linkedDriveId, activeDocId, linkFile, closeMenu])

  const handleExport = useCallback((format: 'pdf' | 'txt' | 'html') => {
    const title = isWrite ? writeTitle : formatTitle
    const font_ = useEditorStore.getState().font
    const fontStack = font_ === 'serif' ? "'Noto Serif', serif" : font_ === 'mono' ? "'Noto Sans Mono', monospace" : "'Noto Sans', sans-serif"
    const bodyHtml = isWrite ? writeModeToHtml(writeContent) : formatModeToHtml((formatContent ?? {}) as Record<string, unknown>)
    const html = buildHtmlDocument(title || 'untitled', bodyHtml, fontStack)
    if (format === 'pdf') printAsPdf(html)
    else if (format === 'html') downloadHtml(html, (title || 'untitled') + '.html')
    else downloadTxt(isWrite ? writeContent : getPreview(formatContent), (title || 'untitled') + '.txt')
    closeMenu()
  }, [isWrite, writeTitle, formatTitle, writeContent, formatContent, closeMenu])

  const handleOpenDevice = useCallback(async () => {
    const result = await loadFromFile()
    if (!result) return
    setWriteContent(result.content)
    setWriteTitle(result.name)
    router.push('/write')
    closeMenu()
  }, [setWriteContent, setWriteTitle, router, closeMenu])

  const handleOpenDrive = useCallback(async () => {
    if (!token) { signIn('google'); return }
    setLevel('open-drive')
    setDriveLoading(true)
    setDriveError(null)
    try {
      const files = await listDriveFiles(token)
      setDriveFiles(files)
    } catch (e) { setDriveError((e as Error).message) }
    finally { setDriveLoading(false) }
  }, [token])

  const handleOpenFile = useCallback(async (file: DriveFile) => {
    if (!token) return
    try {
      const content = await readDriveFile(token, file)
      const name = file.name.replace(/\.txt$/, '')
      setWriteContent(content)
      setWriteTitle(name)
      if (activeDocId) linkFile(activeDocId, file.id, file.name)
      router.push('/write')
      closeMenu()
    } catch (e) { setDriveError((e as Error).message) }
  }, [token, setWriteContent, setWriteTitle, activeDocId, linkFile, router, closeMenu])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        zIndex: 100,
        background: 'var(--sidebar-bg)',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div style={{ padding: '72px 40px 48px', flex: 1 }}>

        {/* ── Main level ── */}
        {level === 'main' && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2.5em' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1em' }}>
              <MenuItem onClick={handleFormat}>{isWrite ? 'Format' : 'Write'}</MenuItem>
              <MenuItem onClick={() => setLevel('save')}>Save</MenuItem>
              <MenuItem onClick={() => setLevel('export')}>Export</MenuItem>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1em' }}>
              <MenuItem onClick={() => setLevel('open')}>Open</MenuItem>
              <MenuItem onClick={handleNew}>New</MenuItem>
              <MenuItem onClick={() => setLevel('recent')}>Recent</MenuItem>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1em' }}>
              <MenuItem onClick={() => setLevel('settings')}>Settings</MenuItem>
            </div>
          </nav>
        )}

        {/* ── Save level ── */}
        {level === 'save' && (
          <SubLevel title="Save" onBack={() => setLevel('main')}>
            <MenuItem onClick={handleSaveDevice}>Device</MenuItem>
            <MenuItem onClick={handleSaveCloud}>
              {status ? status : 'Cloud'}
            </MenuItem>
          </SubLevel>
        )}

        {/* ── Export level ── */}
        {level === 'export' && (
          <SubLevel title="Export" onBack={() => setLevel('main')}>
            <MenuItem onClick={() => handleExport('pdf')}>PDF</MenuItem>
            <MenuItem onClick={() => handleExport('txt')}>TXT</MenuItem>
            <MenuItem onClick={() => handleExport('html')}>HTML</MenuItem>
          </SubLevel>
        )}

        {/* ── Open level ── */}
        {level === 'open' && (
          <SubLevel title="Open" onBack={() => setLevel('main')}>
            <MenuItem onClick={handleOpenDevice}>Device</MenuItem>
            <MenuItem onClick={handleOpenDrive}>
              {session ? 'Google Drive' : 'Google Drive ↗'}
            </MenuItem>
          </SubLevel>
        )}

        {/* ── Open Drive file list ── */}
        {level === 'open-drive' && (
          <SubLevel title="Google Drive" onBack={() => setLevel('open')}>
            {driveLoading && <Hint>loading…</Hint>}
            {driveError && <Hint>{driveError}</Hint>}
            {!driveLoading && driveFiles.length === 0 && !driveError && (
              <Hint>no files found</Hint>
            )}
            {!driveLoading && driveFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.5rem' }}>
                {driveFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleOpenFile(f)}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: f.id === linkedDriveId ? 'var(--fg)' : 'none',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '15px',
                      fontWeight: 400,
                      color: f.id === linkedDriveId ? 'var(--bg)' : 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {f.name.replace(/\.txt$/, '')}
                    </div>
                    <div style={{
                      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontSize: '11px',
                      color: f.id === linkedDriveId ? 'var(--bg)' : 'var(--muted)',
                      opacity: 0.6,
                      marginTop: '2px',
                    }}>
                      {f.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc · ' : ''}
                      {new Date(f.modifiedTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {session?.user?.email && (
              <div style={{ marginTop: '2rem' }}>
                <button
                  onClick={() => signOut()}
                  style={{ ...SUB_ITEM, fontSize: '13px', opacity: 0.4 }}
                >
                  sign out ({session.user.email})
                </button>
              </div>
            )}
          </SubLevel>
        )}

        {/* ── Recent ── */}
        {level === 'recent' && (
          <SubLevel title="Recent" onBack={() => setLevel('main')}>
            {docs.length === 0 && <Hint>no documents yet</Hint>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.5rem' }}>
              {[...docs].sort((a, b) => b.updatedAt - a.updatedAt).map((doc) => {
                const preview = getPreview(doc.content)
                const trimmed = preview.length > 130 ? preview.slice(0, 130) + '…' : preview
                const isActive = doc.id === (doc.mode === 'write' ? activeWriteId : activeFormatId)
                return (
                  <RecentItem
                    key={doc.id}
                    doc={doc}
                    isActive={isActive}
                    trimmed={trimmed}
                    onClick={() => {
                      if (doc.mode === 'write') { setActiveWrite(doc.id); router.push('/write') }
                      else { setActiveFormat(doc.id); router.push('/format') }
                    }}
                  />
                )
              })}
            </div>
          </SubLevel>
        )}

        {/* ── Settings ── */}
        {level === 'settings' && (
          <SubLevel title="Settings" onBack={() => setLevel('main')}>
            <SettingRow label="Theme">
              <Chips
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'shade', label: 'Shade' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={theme}
                onChange={(v) => setTheme(v as Theme)}
              />
            </SettingRow>
            <SettingRow label="Font">
              <Chips
                options={[
                  { value: 'serif', label: 'Serif' },
                  { value: 'sans', label: 'Sans' },
                  { value: 'mono', label: 'Mono' },
                ]}
                value={font}
                onChange={(v) => setFont(v as Font)}
              />
            </SettingRow>
            <SettingRow label="Size">
              <Chips
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Big' },
                ]}
                value={fontSize}
                onChange={(v) => setFontSize(v as SizeOption)}
              />
            </SettingRow>
            <SettingRow label="Spacing">
              <Chips
                options={[
                  { value: 'small', label: 'Tight' },
                  { value: 'medium', label: 'Normal' },
                  { value: 'large', label: 'Loose' },
                ]}
                value={lineHeight}
                onChange={(v) => setLineHeight(v as SizeOption)}
              />
            </SettingRow>
          </SubLevel>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...ITEM, opacity: hovered ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

function SubLevel({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '13px',
          color: 'var(--muted)',
          letterSpacing: '0.02em',
          padding: '0 0 1.5rem',
          display: 'block',
          opacity: 0.6,
        }}
      >
        ← back
      </button>
      <div
        style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '28px',
          fontWeight: 400,
          letterSpacing: '-0.04em',
          lineHeight: 1.25,
          color: 'var(--fg)',
          marginBottom: '1.25rem',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1em' }}>
        {children}
      </div>
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize: '14px',
      color: 'var(--muted)',
      opacity: 0.6,
      margin: '0.5rem 0',
    }}>
      {children}
    </p>
  )
}

function RecentItem({
  doc,
  isActive,
  trimmed,
  onClick,
}: {
  doc: { id: string; title: string; mode: string; updatedAt: number }
  isActive: boolean
  trimmed: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        background: isActive ? 'var(--subtle)' : hovered ? 'var(--surface)' : 'none',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
    >
      {trimmed && (
        <p style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '18px',
          lineHeight: 1.5,
          color: 'var(--fg)',
          margin: '0 0 6px',
        }}>
          {trimmed}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {doc.title || 'untitled'}
        </span>
        <span style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '16px',
          color: 'var(--muted)',
          opacity: 0.8,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {doc.mode === 'format' ? 'fmt · ' : ''}{dateLabel(doc.updatedAt)}
        </span>
      </div>
    </button>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '11px',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        opacity: 0.55,
        marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            background: value === opt.value ? 'var(--fg)' : 'var(--surface)',
            color: value === opt.value ? 'var(--bg)' : 'var(--muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
