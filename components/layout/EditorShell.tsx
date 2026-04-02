'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'
import { AppSidebar } from '@/components/ui/AppSidebar'
import { DocumentTitle } from '@/components/editor/DocumentTitle'

export function EditorShell({ children }: { children: React.ReactNode }) {
  const { menuOpen, closeMenu, toggleMenu } = useUIStore()

  // Escape closes the menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, closeMenu])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <DocumentTitle />

      {/* ── Content area — shifts left when sidebar opens ── */}
      <div
        style={{
          paddingRight: menuOpen ? 'var(--sidebar-width)' : '0',
          transition: 'padding-right 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>

      {/* ── View mode overlay — click to close sidebar and return focus ── */}
      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{
            position: 'fixed',
            inset: 0,
            right: 'var(--sidebar-width)',
            zIndex: 95,
            cursor: 'text',
          }}
        />
      )}

      {/* ── The dot ── */}
      <button
        onClick={toggleMenu}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        style={{
          position: 'fixed',
          top: '24px',
          right: 'calc(var(--sidebar-width) - 40px)',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--fg)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 200,
          padding: 0,
          transition: 'opacity 150ms',
          opacity: menuOpen ? 0.5 : 1,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />

      {/* ── Sidebar ── */}
      <AppSidebar />
    </div>
  )
}
