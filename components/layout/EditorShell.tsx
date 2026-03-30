'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/ui'
import { LeftSidebar } from '@/components/ui/LeftSidebar'
import { RightSidebar } from '@/components/ui/RightSidebar'
import { Counters } from '@/components/ui/Counters'
import { ExportPanel } from '@/components/ui/ExportPanel'
import { DrivePanel } from '@/components/ui/DrivePanel'

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { leftOpen, rightOpen, openLeft, openRight, closeAll } = useUIStore()
  const anyOpen = leftOpen || rightOpen
  const [exportOpen, setExportOpen] = useState(false)
  const [driveOpen, setDriveOpen] = useState(false)

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === '[') { e.preventDefault(); leftOpen ? closeAll() : openLeft(); return }
      if (mod && e.key === ']') { e.preventDefault(); rightOpen ? closeAll() : openRight(); return }
      if (mod && e.shiftKey && e.key === 'e') { e.preventDefault(); setExportOpen((v) => !v); return }
      if (mod && e.shiftKey && e.key === 'd') { e.preventDefault(); setDriveOpen((v) => !v); return }
      if (e.key === 'Escape') {
        if (anyOpen) { closeAll(); return }
        if (exportOpen) { setExportOpen(false); return }
        if (driveOpen) { setDriveOpen(false); return }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [leftOpen, rightOpen, anyOpen, exportOpen, openLeft, openRight, closeAll])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Backdrop ── */}
      {anyOpen && (
        <div
          onClick={closeAll}
          style={{ position: 'fixed', inset: 0, zIndex: 25, background: 'transparent' }}
        />
      )}
      {exportOpen && (
        <div
          onClick={() => setExportOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'transparent' }}
        />
      )}

      {/* ── Drive panel ── */}
      <DrivePanel isOpen={driveOpen} onClose={() => setDriveOpen(false)} />

      {/* ── Sidebars ── */}
      <LeftSidebar />
      <RightSidebar />

      {/* ── Edge triggers ── */}
      <SidebarTrigger side="left"  isOpen={leftOpen}  onToggle={() => leftOpen  ? closeAll() : openLeft()} />
      <SidebarTrigger side="right" isOpen={rightOpen} onToggle={() => rightOpen ? closeAll() : openRight()} />

      {/* ── Drive trigger ── */}
      <button
        onClick={() => setDriveOpen((v) => !v)}
        title="Google Drive (⌘⇧D)"
        style={{
          position: 'fixed',
          bottom: '1.4rem',
          left: '3rem',
          zIndex: 20,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          opacity: driveOpen ? 0.6 : 0.2,
          transition: 'opacity 200ms ease-in-out',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.65' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = driveOpen ? '0.6' : '0.2' }}
      >
        <DriveIcon />
      </button>

      {/* ── Export trigger (bottom-center) ── */}
      <button
        onClick={() => setExportOpen((v) => !v)}
        title="Export (⌘⇧E)"
        style={{
          position: 'fixed',
          bottom: '1.4rem',
          left: '1rem',
          zIndex: 20,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          opacity: exportOpen ? 0.6 : 0.2,
          transition: 'opacity 200ms ease-in-out',
          color: 'var(--fg)',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.65' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = exportOpen ? '0.6' : '0.2' }}
      >
        <ExportIcon />
      </button>

      {/* ── Export panel ── */}
      <ExportPanel isOpen={exportOpen} onClose={() => setExportOpen(false)} />

      {/* ── Page content ── */}
      {children}

      {/* ── Counters overlay ── */}
      <Counters />
    </div>
  )
}

// ── Trigger buttons ───────────────────────────────────────────────────────────

function SidebarTrigger({ side, isOpen, onToggle }: {
  side: 'left' | 'right'; isOpen: boolean; onToggle: () => void
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
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.65' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = isOpen ? '0.6' : '0.2' }}
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

function ExportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1v9M4 6.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11v2h11v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  )
}

function DriveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M5.5 2L1 10h4l4.5-8H5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.5 2l4.5 8H10L5.5 2H9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.7" />
      <path d="M1 10l2.5 3h8L14 10H1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.5" />
    </svg>
  )
}
