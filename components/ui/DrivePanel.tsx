'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'
import { useDocumentsStore } from '@/store/documents'
import { useDriveStore } from '@/store/drive'
import { listDriveFiles, readDriveFile, saveToDrive, type DriveFile } from '@/lib/drive/api'
import { openGooglePicker } from '@/lib/drive/picker'
import { formatModeToHtml } from '@/lib/export/html'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getPlainTextFromFormat(content: Record<string, unknown>): string {
  function walk(node: Record<string, unknown>): string {
    if (node.type === 'text') return (node.text as string) ?? ''
    const children = (node.content as Record<string, unknown>[]) ?? []
    return children.map(walk).join('')
  }
  return walk(content)
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DrivePanel({ isOpen, onClose }: Props) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  // Editor state
  const writeContent = useEditorStore((s) => s.content)
  const setWriteContent = useEditorStore((s) => s.setContent)
  const writeTitle = useFilesStore((s) => s.title)
  const setWriteTitle = useFilesStore((s) => s.setTitle)
  const formatContent = useFormatStore((s) => s.content)
  const formatTitle = useFormatStore((s) => s.title)

  // Documents
  const { docs, activeWriteId, activeFormatId } = useDocumentsStore()
  const activeDocId = isWrite ? activeWriteId : activeFormatId

  // Drive links
  const { linkFile, unlinkFile, getDriveId, getDriveName } = useDriveStore()
  const linkedDriveId = activeDocId ? getDriveId(activeDocId) : null
  const linkedDriveName = activeDocId ? getDriveName(activeDocId) : null

  // UI state
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [status2, setStatus2] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = session?.accessToken
  const hasPicker = !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  // Load recent Drive files when panel opens + authenticated
  useEffect(() => {
    if (!isOpen || !token) return
    setLoadingFiles(true)
    setError(null)
    listDriveFiles(token)
      .then(setFiles)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingFiles(false))
  }, [isOpen, token])

  // Escape closes
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── File operations ───────────────────────────────────────────────────────

  const loadFile = useCallback(async (file: DriveFile) => {
    if (!token) return
    setStatus2('loading…')
    setError(null)
    try {
      const content = await readDriveFile(token, file)
      const name = file.name.replace(/\.txt$/, '')

      if (isWrite) {
        setWriteContent(content)
        setWriteTitle(name)
      }
      // For format mode, load plain text into the format store as a paragraph
      // (TipTap will interpret it when the editor initialises)
      if (!isWrite) {
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
      setStatus2('opened')
      setTimeout(() => setStatus2(null), 2000)
    } catch (e) {
      setError((e as Error).message)
      setStatus2(null)
    }
  }, [token, isWrite, activeDocId, setWriteContent, setWriteTitle, linkFile])

  const saveFile = useCallback(async (asNew = false) => {
    if (!token) return
    setStatus2('saving…')
    setError(null)
    try {
      const title = isWrite ? writeTitle : formatTitle
      const content = isWrite
        ? writeContent
        : getPlainTextFromFormat((formatContent ?? {}) as Record<string, unknown>)

      const filename = (title || 'untitled').trim()
      const existingId = (!asNew && linkedDriveId) ? linkedDriveId : undefined
      const savedId = await saveToDrive(token, content, filename, existingId)

      if (activeDocId) linkFile(activeDocId, savedId, `${filename}.txt`)
      // Refresh file list
      listDriveFiles(token).then(setFiles).catch(() => {})
      setStatus2('saved')
      setTimeout(() => setStatus2(null), 2000)
    } catch (e) {
      setError((e as Error).message)
      setStatus2(null)
    }
  }, [token, isWrite, writeTitle, formatTitle, writeContent, formatContent, linkedDriveId, activeDocId, linkFile])

  const handleBrowse = useCallback(async () => {
    if (!token) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) { setError('NEXT_PUBLIC_GOOGLE_API_KEY not set'); return }
    try {
      const picked = await openGooglePicker(token, apiKey)
      if (picked) await loadFile(picked as DriveFile)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [token, loadFile])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 44 }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          zIndex: 45,
          background: 'var(--bg)',
          borderLeft: '1px solid var(--subtle)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 180ms ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-noto-sans)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.25rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--subtle)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', opacity: 0.7 }}>
            Google Drive
          </span>
          <button
            onClick={onClose}
            style={ghostBtn}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {/* ── Not signed in ── */}
          {status === 'unauthenticated' && (
            <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Connect your Google account to open and save documents from Drive.
              </p>
              <button
                onClick={() => signIn('google')}
                style={primaryBtn}
              >
                Connect Google Drive
              </button>
            </div>
          )}

          {status === 'loading' && (
            <p style={mutedText}>Connecting…</p>
          )}

          {/* ── Signed in ── */}
          {status === 'authenticated' && session && (
            <>
              {/* User info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                  {session.user?.email}
                </span>
                <button onClick={() => signOut()} style={ghostBtn}>
                  sign out
                </button>
              </div>

              {/* Linked file */}
              {linkedDriveName && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--subtle)',
                    borderRadius: '7px',
                    padding: '8px 10px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {linkedDriveName}
                  </span>
                  <button
                    onClick={() => activeDocId && unlinkFile(activeDocId)}
                    style={ghostBtn}
                    title="Unlink"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Save buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
                {linkedDriveId && (
                  <button
                    onClick={() => saveFile(false)}
                    disabled={!!status2}
                    style={{ ...primaryBtn, flex: 1 }}
                  >
                    {status2 === 'saving…' ? 'saving…' : 'save'}
                  </button>
                )}
                <button
                  onClick={() => saveFile(true)}
                  disabled={!!status2}
                  style={{ ...secondaryBtn, flex: 1 }}
                >
                  save as new
                </button>
              </div>

              {/* Status / error */}
              {status2 && status2 !== 'saving…' && (
                <p style={{ ...mutedText, color: status2 === 'saved' || status2 === 'opened' ? 'var(--fg)' : 'var(--muted)' }}>
                  {status2}
                </p>
              )}
              {error && (
                <p style={{ fontSize: '12px', color: '#c0392b', marginBottom: '0.75rem' }}>
                  {error}
                </p>
              )}

              <div style={{ height: '1px', background: 'var(--subtle)', margin: '0.5rem 0 1rem' }} />

              {/* Browse with Picker */}
              {hasPicker && (
                <button onClick={handleBrowse} style={{ ...secondaryBtn, width: '100%', marginBottom: '1rem' }}>
                  browse Drive…
                </button>
              )}

              {/* Recent files list */}
              <p style={{ fontSize: '10px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                recent
              </p>

              {loadingFiles && <p style={mutedText}>loading…</p>}

              {!loadingFiles && files.length === 0 && (
                <p style={mutedText}>no .txt or Google Doc files found</p>
              )}

              {files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => loadFile(f)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: linkedDriveId === f.id ? 'var(--surface)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 8px',
                    cursor: 'pointer',
                    marginBottom: '2px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    {f.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc · ' : ''}
                    {timeLabel(f.modifiedTime)}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Shared inline styles ──────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  background: 'var(--fg)',
  color: 'var(--bg)',
  border: 'none',
  borderRadius: '7px',
  padding: '8px 14px',
  fontSize: '12px',
  fontFamily: 'var(--font-noto-sans)',
  cursor: 'pointer',
  letterSpacing: '0.02em',
}

const secondaryBtn: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--muted)',
  border: '1px solid var(--subtle)',
  borderRadius: '7px',
  padding: '7px 12px',
  fontSize: '12px',
  fontFamily: 'var(--font-noto-sans)',
  cursor: 'pointer',
  letterSpacing: '0.02em',
}

const ghostBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--muted)',
  fontSize: '13px',
  fontFamily: 'var(--font-noto-sans)',
  padding: '2px 4px',
  borderRadius: '4px',
  flexShrink: 0,
}

const mutedText: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--muted)',
  marginBottom: '0.5rem',
}
