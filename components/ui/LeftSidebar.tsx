'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/ui'
import { useDocumentsStore, type DocEntry } from '@/store/documents'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateLabel(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getPreview(content: DocEntry['content']): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim().slice(0, 140)
  // TipTap JSON — walk nodes for text
  function walk(node: Record<string, unknown>): string {
    if (node.type === 'text') return (node.text as string) ?? ''
    const children = (node.content as Record<string, unknown>[]) ?? []
    return children.map(walk).join(' ')
  }
  return walk(content as Record<string, unknown>).trim().slice(0, 140)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeftSidebar() {
  const { leftOpen, closeAll } = useUIStore()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { docs, activeWriteId, activeFormatId, createDoc, removeDoc, setActiveWrite, setActiveFormat } =
    useDocumentsStore()

  const allDocs = docs
    .filter((d) => !query || d.title.toLowerCase().includes(query.toLowerCase()) ||
      getPreview(d.content).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const activeId = activeWriteId || activeFormatId

  const handleNewWrite = () => {
    const doc = createDoc('write')
    useEditorStore.getState().setContent('')
    useFilesStore.getState().setTitle('untitled')
    router.push('/write')
  }

  const handleNewFormat = () => {
    const doc = createDoc('format')
    router.push('/format')
  }

  const handleSelect = (doc: DocEntry) => {
    if (doc.mode === 'write') {
      setActiveWrite(doc.id)
      router.push('/write')
    } else {
      setActiveFormat(doc.id)
      router.push('/format')
    }
    // intentionally NOT closing sidebar — user browses files
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeDoc(id)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '480px',
        zIndex: 30,
        background: 'var(--bg)',
        borderRight: '1px solid var(--subtle)',
        transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 180ms ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '1.25rem 1.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            color: 'var(--fg)',
            opacity: 0.4,
          }}
        >
          arak
        </span>

        {/* New doc buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <NewBtn label="+ write" onClick={handleNewWrite} />
          <NewBtn label="+ format" onClick={handleNewFormat} />
        </div>
      </div>

      {/* ── Filter ── */}
      <div style={{ padding: '0.5rem 1.5rem 0.75rem', flexShrink: 0 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter..."
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--subtle)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontFamily: 'var(--font-noto-sans)',
            color: 'var(--fg)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ height: '1px', background: 'var(--subtle)', flexShrink: 0 }} />

      {/* ── File list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem 2rem' }}>
        {allDocs.length === 0 && (
          <p
            style={{
              fontFamily: 'var(--font-noto-sans)',
              fontSize: '12px',
              color: 'var(--muted)',
              padding: '1rem 0.75rem',
              opacity: 0.6,
            }}
          >
            no documents
          </p>
        )}
        {allDocs.map((doc) => (
          <DocRow
            key={doc.id}
            doc={doc}
            isActive={doc.id === activeId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* ── Close hint ── */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--subtle)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={closeAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '11px',
            color: 'var(--muted)',
            opacity: 0.5,
            letterSpacing: '0.04em',
            padding: '2px 0',
          }}
        >
          close ⌘[
        </button>
      </div>
    </div>
  )
}

// ── DocRow ────────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  isActive,
  onSelect,
  onDelete,
}: {
  doc: DocEntry
  isActive: boolean
  onSelect: (doc: DocEntry) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const preview = getPreview(doc.content)
  const trimmed = preview.length >= 140 ? preview.slice(0, 120) + '...' : preview

  return (
    <div
      onClick={() => onSelect(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0.85rem 0.75rem',
        borderRadius: '8px',
        cursor: 'pointer',
        background: isActive
          ? 'var(--fg)'
          : hovered
          ? 'var(--surface)'
          : 'transparent',
        marginBottom: '2px',
        transition: 'background 120ms ease-in-out',
      }}
    >
      {/* Preview text */}
      {trimmed && (
        <p
          style={{
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '12px',
            lineHeight: '1.55',
            color: isActive ? 'var(--bg)' : 'var(--muted)',
            opacity: isActive ? 0.7 : 0.75,
            margin: '0 0 0.5rem',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {trimmed}
        </p>
      )}

      {/* Footer: title + date + delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: isActive ? 'var(--bg)' : 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {doc.title || 'untitled'}
        </span>

        <span
          style={{
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '10px',
            color: isActive ? 'var(--bg)' : 'var(--muted)',
            opacity: 0.6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {doc.mode === 'format' ? 'fmt · ' : ''}{dateLabel(doc.updatedAt)}
        </span>

        {hovered && (
          <button
            onClick={(e) => onDelete(e, doc.id)}
            title="Delete"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--bg)' : 'var(--muted)',
              fontSize: '14px',
              padding: '0 2px',
              opacity: 0.5,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ── NewBtn ────────────────────────────────────────────────────────────────────

function NewBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: '1px solid var(--subtle)',
        borderRadius: '5px',
        cursor: 'pointer',
        fontFamily: 'var(--font-noto-sans)',
        fontSize: '11px',
        color: 'var(--muted)',
        padding: '3px 8px',
        letterSpacing: '0.02em',
        transition: 'border-color 120ms, color 120ms',
      }}
    >
      {label}
    </button>
  )
}
