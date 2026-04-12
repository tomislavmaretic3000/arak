'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/store/ui'
import { useEditorStore, type Theme, type Font, type SizeOption, type SpacingOption } from '@/store/editor'
import { type PaperFormat } from '@/store/format'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'
import { useDocumentsStore } from '@/store/documents'
import { useDriveStore } from '@/store/drive'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'
import { listDriveFolder, readDriveFile, saveToDrive, type DriveFile } from '@/lib/drive/api'
import { Folder, FileText, ChevronLeft } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Level = 'main' | 'open-drive' | 'settings'

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
  const [openExpanded, setOpenExpanded] = useState(false)
  const [saveExpanded, setSaveExpanded] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'Google Drive' }])
  const [status, setStatus] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  const { theme, font, fontSize, spacing, focusMode: focusModeStore, posHighlight, showWordCount, setTheme, setFont, setFontSize, setSpacing, setFocusMode, setPosHighlight, setShowWordCount } = useEditorStore()
  const writeContent = useEditorStore((s) => s.content)
  const setWriteContent = useEditorStore((s) => s.setContent)
  const writeTitle = useFilesStore((s) => s.title)
  const setWriteTitle = useFilesStore((s) => s.setTitle)
  const formatTitle = useFormatStore((s) => s.title)
  const formatContent = useFormatStore((s) => s.content)
  const paperFormat = useFormatStore((s) => s.paperFormat)
  const setPaperFormat = useFormatStore((s) => s.setPaperFormat)

  const { activeWriteId, activeFormatId, createDoc, setActiveWrite, setActiveFormat } = useDocumentsStore()
  const activeDocId = isWrite ? activeWriteId : activeFormatId
  const { linkFile, getDriveId } = useDriveStore()
  const linkedDriveId = activeDocId ? getDriveId(activeDocId) : null

  const { data: session } = useSession()
  const token = session?.accessToken as string | undefined

  // Reset to main level when sidebar closes
  useEffect(() => {
    if (!menuOpen) setTimeout(() => { setLevel('main'); setOpenExpanded(false); setSaveExpanded(false) }, 300)
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
    if (isWrite) {
      // Convert plain text to TipTap JSON paragraphs for format mode
      const paragraphs = (writeContent || '').split('\n').map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      }))
      const json = { type: 'doc', content: paragraphs }
      useFormatStore.getState().setContent(json)
      useFormatStore.getState().setTitle(writeTitle || 'untitled')
    } else {
      // Extract plain text from TipTap JSON for write mode
      const text = getPreview(formatContent)
      useEditorStore.getState().setContent(text)
      useFilesStore.getState().setTitle(formatTitle || 'untitled')
    }
    router.push(isWrite ? '/format' : '/write')
    closeMenu()
  }, [isWrite, writeContent, writeTitle, formatContent, formatTitle, router, closeMenu])

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

  const handleOpenDevice = useCallback(async () => {
    const result = await loadFromFile()
    if (!result) return
    setWriteContent(result.content)
    setWriteTitle(result.name)
    router.push('/write')
    closeMenu()
  }, [setWriteContent, setWriteTitle, router, closeMenu])

  const loadFolder = useCallback(async (folderId: string) => {
    if (!token) return
    setDriveLoading(true)
    setDriveError(null)
    try {
      const files = await listDriveFolder(token, folderId)
      setDriveFiles(files)
    } catch (e) { setDriveError((e as Error).message) }
    finally { setDriveLoading(false) }
  }, [token])

  const handleOpenDrive = useCallback(async () => {
    if (!token) { signIn('google'); return }
    setFolderStack([{ id: 'root', name: 'Google Drive' }])
    setLevel('open-drive')
    loadFolder('root')
  }, [token, loadFolder])

  const handleOpenFolder = useCallback((folder: DriveFile) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }])
    loadFolder(folder.id)
  }, [loadFolder])

  const handleFolderBack = useCallback(() => {
    setFolderStack((prev) => {
      const next = prev.slice(0, -1)
      loadFolder(next[next.length - 1].id)
      return next
    })
  }, [loadFolder])

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
      data-lenis-prevent
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
      <div className="sidebar-inner" style={{ padding: '18vh 32px 48px 48px', flex: 1 }}>

        {/* ── Main level ── */}
        {level === 'main' && (
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1em', paddingBottom: '2em' }}>
              <MenuItem onClick={handleNew}>New</MenuItem>
              <MenuItem onClick={() => { setOpenExpanded(v => !v); setSaveExpanded(false) }}>Open</MenuItem>
              {openExpanded && (
                <>
                  <SubItem onClick={handleOpenDevice}>Open from Device</SubItem>
                  <SubItem onClick={handleOpenDrive}>Open from Cloud</SubItem>
                </>
              )}
              <MenuItem onClick={() => { setSaveExpanded(v => !v); setOpenExpanded(false) }}>Save</MenuItem>
              {saveExpanded && (
                <>
                  <SubItem onClick={handleSaveDevice}>Save to Device</SubItem>
                  <SubItem onClick={handleSaveCloud}>{status || 'Save to Cloud'}</SubItem>
                </>
              )}
              <MenuItem onClick={handleFormat}>{isWrite ? 'Format' : 'Write'}</MenuItem>
            </div>
            <div style={{ borderTop: '1px solid var(--subtle)', paddingTop: '2em', display: 'flex', flexDirection: 'column', gap: '0.1em' }}>
              <MenuItem onClick={() => setLevel('settings')}>Settings</MenuItem>
              <MenuItem onClick={() => { router.push('/about'); closeMenu() }}>About</MenuItem>
            </div>
          </nav>
        )}

        {/* ── Open Drive file list ── */}
        {level === 'open-drive' && (
          <SubLevel
            title={folderStack[folderStack.length - 1].name}
            onBack={folderStack.length > 1 ? handleFolderBack : () => setLevel('main')}
          >
            {driveLoading && <Hint>loading…</Hint>}
            {driveError && <Hint>{driveError}</Hint>}
            {!driveLoading && driveFiles.length === 0 && !driveError && (
              <Hint>empty</Hint>
            )}
            {!driveLoading && driveFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {driveFiles.map((f, i) => (
                  <DriveRow
                    key={f.id}
                    file={f}
                    isActive={f.id === linkedDriveId}
                    isLast={i === driveFiles.length - 1}
                    onClick={() =>
                      f.mimeType === 'application/vnd.google-apps.folder'
                        ? handleOpenFolder(f)
                        : handleOpenFile(f)
                    }
                  />
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


        {/* ── Settings ── */}
        {level === 'settings' && (
          <SubLevel title="Settings" onBack={() => setLevel('main')}>
            <SettingRow label="Text size">
              <PillGroup
                options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Big' }]}
                value={fontSize}
                onChange={(v) => setFontSize(v as SizeOption)}
              />
            </SettingRow>
            <SettingRow label="Spacing">
              <PillGroup
                options={[{ value: 'small', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Loose' }]}
                value={spacing}
                onChange={(v) => setSpacing(v as SpacingOption)}
              />
            </SettingRow>
            <SettingRow label="Type style">
              <PillGroup
                options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]}
                value={font}
                onChange={(v) => setFont(v as Font)}
              />
            </SettingRow>
            <SettingRow label="Appearance">
              <PillGroup
                options={[{ value: 'light', label: 'Light' }, { value: 'shade', label: 'Shade' }, { value: 'dark', label: 'Dark' }]}
                value={theme}
                onChange={(v) => setTheme(v as Theme)}
              />
            </SettingRow>
            <SettingRow label="Highlight paragraph">
              <Toggle value={focusModeStore} onChange={setFocusMode} />
            </SettingRow>
            <SettingRow label="Mark word classes">
              <Toggle value={posHighlight} onChange={setPosHighlight} />
            </SettingRow>
            <SettingRow label="Word count">
              <Toggle value={showWordCount} onChange={setShowWordCount} />
            </SettingRow>

            {/* ── Format-only: Page settings ── */}
            {!isWrite && (
              <>
                <SettingRow label="Paper">
                  <PillGroup
                    options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'none', label: 'Off' }]}
                    value={paperFormat}
                    onChange={(v) => setPaperFormat(v as PaperFormat)}
                  />
                </SettingRow>
              </>
            )}
          </SubLevel>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...ITEM, paddingLeft: '1.1em', opacity: hovered ? 0.7 : 0.38 }}
    >
      {children}
    </button>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...ITEM, opacity: hovered ? 1 : 0.45 }}
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
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '28px',
          fontWeight: 400,
          letterSpacing: '-0.04em',
          lineHeight: 1.25,
          color: 'var(--fg)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '1.25rem',
          opacity: 0.75,
        }}
      >
        <ChevronLeft size={22} strokeWidth={1.5} style={{ flexShrink: 0, marginLeft: '-4px' }} />
        {title}
      </button>
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

function DriveRow({
  file,
  isActive,
  isLast,
  onClick,
}: {
  file: DriveFile
  isActive: boolean
  isLast: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder'
  const sizeKb = file.size ? `${Math.round(parseInt(file.size) / 1024) || 1} kb` : null
  const time = dateLabel(new Date(file.modifiedTime).getTime())

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: '14px',
    lineHeight: 1.3,
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  return (
    <div>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          background: isActive ? 'var(--item-active)' : hovered ? 'var(--item-hover)' : 'none',
          border: 'none',
          borderRadius: '6px',
          padding: '11px 10px',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
      >
        {/* Icon */}
        <span style={{ color: 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {isFolder
            ? <Folder size={15} strokeWidth={1.5} />
            : <FileText size={15} strokeWidth={1.5} />
          }
        </span>

        {/* Filename */}
        <span style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '14px',
          lineHeight: 1.3,
          fontWeight: 500,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {file.name}
        </span>

        {/* Size + time */}
        {!isFolder && (
          <span style={{ ...labelStyle, display: 'flex', gap: '8px' }}>
            {sizeKb && <span>{sizeKb}</span>}
            <span>{time}</span>
          </span>
        )}
        {isFolder && (
          <span style={labelStyle}>{time}</span>
        )}
      </button>
      {!isLast && (
        <div style={{ height: '1px', background: 'var(--subtle)', margin: '0 10px' }} />
      )}
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.4em 0',
      gap: '16px',
    }}>
      <span style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '28px',
        fontWeight: 400,
        letterSpacing: '-0.04em',
        lineHeight: 1.25,
        color: 'var(--fg)',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '100px',
        background: value ? 'var(--muted)' : 'var(--subtle)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 150ms',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: value ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: value ? 'var(--bg)' : 'var(--muted)',
        transition: 'left 150ms',
      }} />
    </div>
  )
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--subtle)',
      borderRadius: '100px',
      padding: '3px',
      gap: '2px',
      minWidth: '216px',
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            background: value === opt.value ? 'var(--muted)' : 'transparent',
            color: value === opt.value ? 'var(--bg)' : 'var(--fg)',
            border: 'none',
            borderRadius: '100px',
            padding: '7px 0',
            fontSize: '13px',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
