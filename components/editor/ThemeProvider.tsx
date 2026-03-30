'use client'

import { useEditorStore } from '@/store/editor'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useEditorStore((s) => s.theme)

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        transition: 'background 200ms ease-in-out, color 200ms ease-in-out',
      }}
    >
      {children}
    </div>
  )
}
