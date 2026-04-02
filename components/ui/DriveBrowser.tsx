'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'
import { useDocumentsStore } from '@/store/documents'
import { useDriveStore } from '@/store/drive'
import { listDriveFiles, readDriveFile, saveToDrive, type DriveFile } from '@/lib/drive/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateLabel(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getPlainText(content: Record<string, unknown>): string {
  function walk(node: Record<string, unknown>): string {
    if (node.type === 'text') return (node.text as string) ?? ''
    return ((node.content as Record<string, unknown>[]) ?? []).map(walk).join('')
  }
  return walk(content)
}

function DocIcon({ mimeType }: { mimeType: string }) {
  const isDoc = mimeType === 'application/vnd.google-apps.document'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" fill={isDoc ? '#4285f4' : '#5f6368'} opacity="0.15" />
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={isDoc ? '#4285f4' : '#5f6368'} strokeWidth="1.2" opacity="0.5" />
      <rect x="7" y="8"  width="10" height="1.5" rx="0.75" fill={isDoc ? '#4285f4' : '#5f6368'} opacity="0.5" />
      <rect x="7" y="11" width="10" height="1.5" rx="0.75" fill={isDoc ? '#4285f4' : '#5f6368'} opacity="0.4" />
      <rect x="7" y="14" width="7"  height="1.5" rx="0.75" fill={isDoc ? '#4285f4' : '#5f6368'} opacity="0.3" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DriveBrowser({ isOpen, onClose }: Props) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  const writeContent = useEditorStore((s) => s.content)
  const setWriteContent = useEditorStore((s) => s.setContent)
  const writeTitle = useFilesStore((s) => s.title)
  const setWriteTitle = useFilesStore((s) => s.setTitle)
  const formatContent = useFormatStore((s) => s.content)
  const formatTitle = useFormatStore((s) => s.title)

  const { docs, activeWriteId, activeFormatId } = useDocumentsStore()
  const activeDocId = isWrite ? activeWriteId : activeFormatId

  const { linkFile, getDriveId, getDriveName } = useDriveStore()
  const linkedDriveId = activeDocId ? getDriveId(activeDocId) : null

  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [opStatus, setOpStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const token = session?.accessToken

  // Load files on open
  useEffect(() => {
    if (!isOpen || !token) return
    fetchFiles('')
    setTimeout(() => searchRef.current?.focus(), 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token])

  // Escape closes
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const fetchFiles = useCallback(async (q: string) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const results = await listDriveFiles(token, q)
      setFiles(results)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  const handleSearch = (val: string) => {
    setSearchQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchFiles(val), 350)
  }

  const handleOpen = useCallback(async (file: DriveFile) => {
    if (!token) return
    setOpStatus('opening…')
    setError(null)
    try {
      const content = await readDriveFile(token, file)
      const name = file.name.replace(/\.txt$/, '')
      if (isWrite) {
        setWriteContent(content)
        setWriteTitle(name)
      } else {
        useFormatStore.getState().setContent({
          type: 'doc',
          content: content.split('\n\n').map((para) => ({
            type: 'paragraph',
            content: para.trim() ? [{ type: 'text', text: para.trim() }] : [],
          })),
        })
        useFormatStore.getState().setTitle(name)
      }
      if (activeDocId) linkFile(activeDocId, file.id, file.name)
      setOpStatus(null)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setOpStatus(null)
    }
  }, [token, isWrite, activeDocId, setWriteContent, setWriteTitle, linkFile, onClose])

  const handleSave = useCallback(async (asNew = false) => {
    if (!token) return
    setOpStatus('saving…')
    setError(null)
    try {
      const title = isWrite ? writeTitle : formatTitle
      const content = isWrite
        ? writeContent
        : getPlainText((formatContent ?? {}) as Record<string, unknown>)
      const filename = (title || 'untitled').trim()
      const existingId = (!asNew && linkedDriveId) ? linkedDriveId : undefined
      const savedId = await saveToDrive(token, content, filename, existingId)
      if (activeDocId) linkFile(activeDocId, savedId, `${filename}.txt`)
      await fetchFiles(searchQuery)
      setOpStatus('saved')
      setTimeout(() => setOpStatus(null), 2000)
    } catch (e) {
      setError((e as Error).message)
      setOpStatus(null)
    }
  }, [token, isWrite, writeTitle, formatTitle, writeContent, formatContent, linkedDriveId, activeDocId, linkFile, fetchFiles, searchQuery])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 54,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 55,
          width: 'min(860px, 92vw)',
          maxHeight: '80vh',
          background: 'var(--bg)',
          border: '1px solid var(--subtle)',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-noto-sans)',
          animation: 'contentEnter 180ms ease-out both',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid var(--subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', opacity: 0.7 }}>
            Google Drive
          </span>

          {/* Search */}
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="search files…"
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--subtle)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontFamily: 'var(--font-noto-sans)',
              color: 'var(--fg)',
              outline: 'none',
            }}
          />

          {/* Auth status */}
          {status === 'authenticated' && session?.user?.email && (
            <span style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {session.user.email}
            </span>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '18px', lineHeight: 1,
              padding: '0 2px', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Save bar (if authenticated) ── */}
        {status === 'authenticated' && (
          <div
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid var(--subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              background: 'var(--surface)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 1 }}>
              {linkedDriveId
                ? `linked: ${getDriveName(activeDocId ?? '') ?? ''}`
                : 'not linked to a Drive file'}
            </span>
            {opStatus && (
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{opStatus}</span>
            )}
            {error && (
              <span style={{ fontSize: '12px', color: '#c0392b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</span>
            )}
            {linkedDriveId && (
              <ActionBtn onClick={() => handleSave(false)} disabled={!!opStatus}>
                save
              </ActionBtn>
            )}
            <ActionBtn onClick={() => handleSave(true)} disabled={!!opStatus} secondary>
              save as new
            </ActionBtn>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

          {/* Not signed in */}
          {status === 'unauthenticated' && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Connect your Google account to browse and save files.
              </p>
              <button
                onClick={() => signIn('google')}
                style={{
                  background: 'var(--fg)', color: 'var(--bg)',
                  border: 'none', borderRadius: '7px',
                  padding: '10px 20px', fontSize: '13px',
                  fontFamily: 'var(--font-noto-sans)', cursor: 'pointer',
                }}
              >
                Connect Google Drive
              </button>
            </div>
          )}

          {status === 'loading' && (
            <p style={{ fontSize: '13px', color: 'var(--muted)', padding: '2rem 0' }}>connecting…</p>
          )}

          {status === 'authenticated' && (
            <>
              {loading && (
                <p style={{ fontSize: '13px', color: 'var(--muted)', padding: '1rem 0' }}>loading…</p>
              )}

              {!loading && files.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--muted)', padding: '1rem 0' }}>
                  {searchQuery ? 'no files match your search' : 'no .txt or Google Doc files found'}
                </p>
              )}

              {/* Grid */}
              {!loading && files.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      isLinked={file.id === linkedDriveId}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              )}

              {/* Sign out */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--subtle)' }}>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-noto-sans)',
                    padding: 0, opacity: 0.6,
                  }}
                >
                  sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── FileCard ──────────────────────────────────────────────────────────────────

function FileCard({
  file,
  isLinked,
  onOpen,
}: {
  file: DriveFile
  isLinked: boolean
  onOpen: (f: DriveFile) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDoc = file.mimeType === 'application/vnd.google-apps.document'
  const displayName = file.name.replace(/\.txt$/, '')

  return (
    <button
      onClick={() => onOpen(file)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '14px',
        background: isLinked
          ? 'var(--fg)'
          : hovered
          ? 'var(--surface)'
          : 'transparent',
        border: `1px solid ${isLinked ? 'var(--fg)' : hovered ? 'var(--subtle)' : 'var(--subtle)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 120ms, border-color 120ms',
        width: '100%',
      }}
    >
      <DocIcon mimeType={file.mimeType} />
      <div style={{ width: '100%', minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'var(--font-noto-sans)',
            color: isLinked ? 'var(--bg)' : 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: '3px',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-noto-sans)',
            color: isLinked ? 'var(--bg)' : 'var(--muted)',
            opacity: 0.65,
          }}
        >
          {isDoc ? 'Google Doc · ' : ''}{dateLabel(file.modifiedTime)}
        </div>
      </div>
    </button>
  )
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

function ActionBtn({
  children,
  onClick,
  disabled,
  secondary,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  secondary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: secondary ? 'var(--surface)' : 'var(--fg)',
        color: secondary ? 'var(--muted)' : 'var(--bg)',
        border: secondary ? '1px solid var(--subtle)' : 'none',
        borderRadius: '6px',
        padding: '5px 12px',
        fontSize: '12px',
        fontFamily: 'var(--font-noto-sans)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}
