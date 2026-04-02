'use client'

import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: '⌘ [', desc: 'open documents' },
  { keys: '⌘ ]', desc: 'open settings' },
  { keys: '⌘ N', desc: 'new document' },
  { keys: '⌘ S', desc: 'save to file' },
  { keys: '⌘ O', desc: 'open from file' },
  { keys: '⌘ F', desc: 'find' },
  { keys: '⌘ ⇧ F', desc: 'find & replace' },
  { keys: '⌘ G', desc: 'next match' },
  { keys: '⌘ ⇧ G', desc: 'previous match' },
  { keys: '⌘ ⇧ E', desc: 'export' },
  { keys: '⌘ ⇧ D', desc: 'google drive' },
  { keys: '⌘ /', desc: 'keyboard shortcuts' },
  { keys: 'Esc', desc: 'close panel / return focus' },
  { keys: 'Tab', desc: 'indent (write mode)' },
]

export function KeyboardHelp({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 55,
          background: 'rgba(0,0,0,0.08)',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 56,
          background: 'var(--bg)',
          border: '1px solid var(--subtle)',
          borderRadius: '10px',
          padding: '1.75rem 2rem',
          width: '320px',
          maxWidth: '90vw',
          fontFamily: 'var(--font-noto-sans)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', opacity: 0.7 }}>
            keyboard shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '16px',
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {SHORTCUTS.map(({ keys, desc }) => (
            <div
              key={keys}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{desc}</span>
              <kbd
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-noto-mono)',
                  color: 'var(--fg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--subtle)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
