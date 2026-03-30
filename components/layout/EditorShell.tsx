'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'
import { LeftSidebar } from '@/components/ui/LeftSidebar'
import { RightSidebar } from '@/components/ui/RightSidebar'
import { Counters } from '@/components/ui/Counters'

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { leftOpen, rightOpen, openLeft, openRight, closeAll } = useUIStore()
  const anyOpen = leftOpen || rightOpen

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === '[') { e.preventDefault(); leftOpen ? closeAll() : openLeft() }
      if (mod && e.key === ']') { e.preventDefault(); rightOpen ? closeAll() : openRight() }
      if (e.key === 'Escape' && anyOpen) closeAll()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [leftOpen, rightOpen, anyOpen, openLeft, openRight, closeAll])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Backdrop (click to close) ── */}
      {anyOpen && (
        <div
          onClick={closeAll}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 25,
            background: 'transparent',
          }}
        />
      )}

      {/* ── Sidebars ── */}
      <LeftSidebar />
      <RightSidebar />

      {/* ── Edge triggers ── */}
      <SidebarTrigger
        side="left"
        isOpen={leftOpen}
        onToggle={() => leftOpen ? closeAll() : openLeft()}
      />
      <SidebarTrigger
        side="right"
        isOpen={rightOpen}
        onToggle={() => rightOpen ? closeAll() : openRight()}
      />

      {/* ── Page content ── */}
      {children}

      {/* ── Counters overlay ── */}
      <Counters />
    </div>
  )
}

// ── Sidebar trigger buttons ───────────────────────────────────────────────────

function SidebarTrigger({
  side,
  isOpen,
  onToggle,
}: {
  side: 'left' | 'right'
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={side === 'left' ? 'Documents (⌘[)' : 'Settings (⌘])'}
      style={{
        position: 'fixed',
        top: '1.25rem',
        [side]: '1rem',
        zIndex: 20,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '6px',
        opacity: isOpen ? 0.6 : 0.2,
        transition: 'opacity 200ms ease-in-out',
        color: 'var(--fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.65'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = isOpen ? '0.6' : '0.2'
      }}
    >
      {side === 'left' ? <LeftIcon /> : <RightIcon />}
    </button>
  )
}

function LeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="4" height="12" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="7" y="4" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
      <rect x="7" y="7.25" width="6" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
      <rect x="7" y="10.5" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function RightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.36 11.36l1.42 1.42M3.22 12.78l1.41-1.41M11.36 4.64l1.42-1.42"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}
