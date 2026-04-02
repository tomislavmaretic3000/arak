'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'

export function DocumentTitle() {
  const pathname = usePathname()
  const writeTitle = useFilesStore((s) => s.title)
  const formatTitle = useFormatStore((s) => s.title)

  useEffect(() => {
    const title = pathname === '/write' ? writeTitle : formatTitle
    document.title = title ? `${title} — arak` : 'arak'
  }, [pathname, writeTitle, formatTitle])

  return null
}
