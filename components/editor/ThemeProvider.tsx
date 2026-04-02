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

  return <>{children}</>
}
