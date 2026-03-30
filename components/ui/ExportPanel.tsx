'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useFormatStore } from '@/store/format'
import {
  buildHtmlDocument,
  writeModeToHtml,
  formatModeToHtml,
  downloadHtml,
  downloadTxt,
} from '@/lib/export/html'
import { printAsPdf } from '@/lib/export/pdf'

const FONT_STACKS: Record<string, string> = {
  serif: "'Noto Serif', Georgia, serif",
  sans:  "'Noto Sans', system-ui, sans-serif",
  mono:  "'Noto Sans Mono', monospace",
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ExportPanel({ isOpen, onClose }: Props) {
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  const writeContent = useEditorStore((s) => s.content)
  const font = useEditorStore((s) => s.font)
  const writeTitle = useFilesStore((s) => s.title)
  const formatContent = useFormatStore((s) => s.content)
  const formatTitle = useFormatStore((s) => s.title)

  const title = isWrite ? (writeTitle || 'untitled') : (formatTitle || 'untitled')
  const fontStack = FONT_STACKS[font] ?? FONT_STACKS.serif

  const getBodyHtml = useCallback((): string => {
    if (isWrite) return writeModeToHtml(writeContent)
    if (formatContent) return formatModeToHtml(formatContent as Record<string, unknown>)
    return '<p></p>'
  }, [isWrite, writeContent, formatContent])

  const getPlainText = useCallback((): string => {
    if (isWrite) return writeContent
    if (!formatContent) return ''
    // Extract plain text by walking TipTap JSON
    function walk(node: Record<string, unknown>): string {
      if (node.type === 'text') return (node.text as string) ?? ''
      const children = (node.content as Record<string, unknown>[]) ?? []
      const sep = ['paragraph', 'heading', 'blockquote', 'listItem'].includes(node.type as string)
        ? '\n'
        : ''
      return children.map(walk).join('') + sep
    }
    return walk(formatContent as Record<string, unknown>).trim()
  }, [isWrite, writeContent, formatContent])

  const handleExportTxt = () => {
    downloadTxt(getPlainText(), `${title}.txt`)
    onClose()
  }

  const handleExportHtml = () => {
    const html = buildHtmlDocument(title, getBodyHtml(), fontStack)
    downloadHtml(html, `${title}.html`)
    onClose()
  }

  const handleExportPdf = () => {
    const html = buildHtmlDocument(title, getBodyHtml(), fontStack)
    printAsPdf(html)
    onClose()
  }

  // Escape closes
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <div
      role="dialog"
      aria-label="Export document"
      style={{
        position: 'fixed',
        bottom: '3.5rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${isOpen ? '0' : '12px'})`,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'transform 160ms ease-in-out, opacity 160ms ease-in-out',
        zIndex: 40,
        background: 'var(--bg)',
        border: '1px solid var(--subtle)',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        padding: '10px',
        display: 'flex',
        gap: '6px',
        fontFamily: 'var(--font-noto-sans)',
      }}
    >
      {[
        { label: 'txt', title: 'Plain text', action: handleExportTxt },
        { label: 'html', title: 'HTML file', action: handleExportHtml },
        { label: 'pdf', title: 'PDF (print dialog)', action: handleExportPdf },
      ].map(({ label, title: tip, action }) => (
        <button
          key={label}
          onClick={action}
          title={tip}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--subtle)',
            borderRadius: '7px',
            cursor: 'pointer',
            padding: '7px 16px',
            fontSize: '12px',
            fontFamily: 'var(--font-noto-sans)',
            color: 'var(--muted)',
            letterSpacing: '0.04em',
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'var(--subtle)'
            el.style.color = 'var(--fg)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'var(--surface)'
            el.style.color = 'var(--muted)'
          }}
        >
          .{label}
        </button>
      ))}
    </div>
  )
}
