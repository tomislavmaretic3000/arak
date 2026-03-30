'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUIStore } from '@/store/ui'
import { useDocumentsStore, type DocEntry } from '@/store/documents'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'

function timeLabel(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function LeftSidebar() {
  const { leftOpen, closeAll } = useUIStore()
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { docs, activeWriteId, activeFormatId, createDoc, removeDoc, setActiveWrite, setActiveFormat } =
    useDocumentsStore()

  const writeDocs = docs.filter(
    (d) => d.mode === 'write' && d.title.toLowerCase().includes(query.toLowerCase())
  )
  const formatDocs = docs.filter(
    (d) => d.mode === 'format' && d.title.toLowerCase().includes(query.toLowerCase())
  )

  const handleNewWrite = () => {
    const doc = createDoc('write')
    // Clear editor for new doc
    useEditorStore.getState().setContent('')
    useFilesStore.getState().setTitle('untitled')
    router.push('/write')
    closeAll()
  }

  const handleNewFormat = () => {
    createDoc('format')
    router.push('/format')
    closeAll()
  }

  const handleSelectDoc = (doc: DocEntry) => {
    if (doc.mode === 'write') {
      setActiveWrite(doc.id)
      router.push('/write')
    } else {
      setActiveFormat(doc.id)
      router.push('/format')
    }
    closeAll()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeDoc(id)
  }

  const isWriteActive = pathname === '/write'
  const isFormatActive = pathname === '/format'

  return (
    <>
      {/* Slide-in panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '240px',
          zIndex: 30,
          background: 'var(--bg)',
          borderRight: '1px solid var(--subtle)',
          transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 160ms ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* App name */}
        <div
          style={{
            padding: '1.5rem 1.25rem 1rem',
            fontFamily: 'var(--font-noto-sans)',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.08em',
            color: 'var(--fg)',
            opacity: 0.5,
          }}
        >
          arak
        </div>

        {/* Mode switcher */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '0 1rem 1rem',
          }}
        >
          {[
            { label: 'write', href: '/write', active: isWriteActive },
            { label: 'format', href: '/format', active: isFormatActive },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              onClick={closeAll}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '5px 0',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-noto-sans)',
                letterSpacing: '0.03em',
                color: active ? 'var(--fg)' : 'var(--muted)',
                background: active ? 'var(--surface)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 120ms, color 120ms',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--subtle)', margin: '0 1rem' }} />

        {/* Search */}
        <div style={{ padding: '0.75rem 1rem' }}>
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
              padding: '5px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-noto-sans)',
              color: 'var(--fg)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Scrollable doc list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
          {/* Write docs */}
          <DocSection
            label="write"
            docs={writeDocs}
            activeId={activeWriteId}
            onSelect={handleSelectDoc}
            onDelete={handleDelete}
            onNew={handleNewWrite}
          />

          {/* Format docs */}
          <DocSection
            label="format"
            docs={formatDocs}
            activeId={activeFormatId}
            onSelect={handleSelectDoc}
            onDelete={handleDelete}
            onNew={handleNewFormat}
          />
        </div>
      </div>
    </>
  )
}

function DocSection({
  label,
  docs,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: {
  label: string
  docs: DocEntry[]
  activeId: string | null
  onSelect: (doc: DocEntry) => void
  onDelete: (e: React.MouseEvent, id: string) => void
  onNew: () => void
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.25rem 0.75rem',
          marginBottom: '2px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-noto-sans)',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <button
          onClick={onNew}
          title={`New ${label} document`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 2px',
          }}
        >
          +
        </button>
      </div>

      {docs.length === 0 && (
        <div
          style={{
            padding: '4px 0.75rem',
            fontSize: '12px',
            color: 'var(--muted)',
            opacity: 0.5,
            fontFamily: 'var(--font-noto-sans)',
          }}
        >
          no documents
        </div>
      )}

      {docs.map((doc) => (
        <DocRow
          key={doc.id}
          doc={doc}
          isActive={doc.id === activeId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

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

  return (
    <div
      onClick={() => onSelect(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        background: isActive ? 'var(--surface)' : hovered ? 'var(--surface)' : 'transparent',
        transition: 'background 100ms',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            fontFamily: 'var(--font-noto-sans)',
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: isActive ? 1 : 0.8,
          }}
        >
          {doc.title || 'untitled'}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-noto-sans)',
            marginTop: '1px',
          }}
        >
          {timeLabel(doc.updatedAt)}
        </div>
      </div>

      {hovered && (
        <button
          onClick={(e) => onDelete(e, doc.id)}
          title="Delete"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '14px',
            padding: '0 2px',
            marginLeft: '4px',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
