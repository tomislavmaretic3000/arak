'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/store/editor'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useEditorStore((s) => s.theme)

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') {
      delete html.dataset.theme
    } else {
      html.dataset.theme = theme
    }
  }, [theme])

  return (
    <>
      {children}
      {theme === 'shade' && (
        <video
          src="/leafs.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </>
  )
}
