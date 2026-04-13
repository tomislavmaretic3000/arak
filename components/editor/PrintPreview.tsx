'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { useFormatStore, PAPER_SIZES, type PaperFormat } from '@/store/format'
import { useEditorStore, FONT_SIZE_MAP, SPACING_MAP } from '@/store/editor'

// ── Build the print document ──────────────────────────────────────────────────

function buildPrintDoc(
  html: string,
  title: string,
  paperFormat: PaperFormat,
  marginTop: number,
  marginRight: number,
  marginBottom: number,
  marginLeft: number,
  font: string,
  fontSize: string,
  lineHeight: string,
  letterSpacing: string,
  wordSpacing: string,
): string {
  const fontFamily =
    font === 'serif' ? "'Noto Serif', Georgia, serif"
    : font === 'mono' ? "'Noto Sans Mono', 'Courier New', monospace"
    : "'Noto Sans', Helvetica, Arial, sans-serif"

  const googleFont =
    font === 'serif'
      ? 'Noto+Serif:ital,wght@0,300;0,400;0,500;1,400'
      : font === 'mono'
      ? 'Noto+Sans+Mono:wght@300;400'
      : 'Noto+Sans:ital,wght@0,300;0,400;0,500;1,400'

  const pageSize = paperFormat === 'letter' ? '8.5in 11in' : 'A4'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${googleFont}&display=swap" rel="stylesheet">
<style>
  @page {
    size: ${pageSize};
    margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html {
    background: white;
  }

  body {
    margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
    color: #1a1a18;
    font-family: ${fontFamily};
    font-size: ${fontSize};
    line-height: ${lineHeight};
    letter-spacing: ${letterSpacing};
    word-spacing: ${wordSpacing};
    -webkit-font-smoothing: antialiased;
  }

  /* ── TipTap content ── */
  p          { margin: 0 0 1em; orphans: 3; widows: 3; }
  h1         { font-size: 2em;    font-weight: 500; margin: 1.4em 0 0.4em; line-height: 1.2;  break-after: avoid; }
  h2         { font-size: 1.45em; font-weight: 500; margin: 1.2em 0 0.35em; line-height: 1.25; break-after: avoid; }
  h3         { font-size: 1.15em; font-weight: 500; margin: 1em 0 0.3em;   line-height: 1.3;  break-after: avoid; }
  ul, ol     { padding-left: 1.5em; margin: 0 0 1em; }
  li         { margin-bottom: 0.2em; orphans: 3; widows: 3; }
  ul         { list-style-type: disc; }
  ol         { list-style-type: decimal; }
  blockquote {
    border-left: 3px solid #d4d4ce;
    padding-left: 1em;
    margin: 1em 0;
    font-style: italic;
    color: #5a5a54;
    break-inside: avoid;
  }
  code {
    font-family: 'Noto Sans Mono', 'Courier New', monospace;
    font-size: 0.85em;
    background: #f0f0ec;
    padding: 0.1em 0.3em;
    border-radius: 3px;
  }
  pre {
    background: #f0f0ec;
    border-radius: 6px;
    padding: 1em 1.2em;
    margin: 1em 0;
    overflow-x: auto;
    font-size: 0.85em;
    break-inside: avoid;
  }
  pre code    { background: none; padding: 0; }
  hr          { border: none; border-top: 1px solid #d4d4ce; margin: 2em 0; }
  a           { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  strong      { font-weight: 600; }
  em          { font-style: italic; }
  mark        { background: #d4d4ce; border-radius: 2px; padding: 0 1px; }
  table       { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; break-inside: avoid; }
  th, td      { border: 1px solid #d4d4ce; padding: 0.5em 0.75em; text-align: left; }
  th          { background: #f0f0ec; font-weight: 500; }

  /* Text alignment classes from TipTap */
  .tiptap, [data-text-align="center"], p[style*="text-align: center"] { text-align: center; }
  [style*="text-align: right"]   { text-align: right; }
  [style*="text-align: justify"] { text-align: justify; }

  /* Page break node → actual print page break */
  [data-page-break] {
    break-before: page;
    page-break-before: always;
    height: 0;
    display: block;
  }

  /* Print: strip body margin (already set via @page) */
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>${html}</body>
</html>`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  editor: Editor
  onClose: () => void
}

export function PrintPreview({ editor, onClose }: Props) {
  const { title, marginTop, marginRight, marginBottom, marginLeft, paperFormat } = useFormatStore()
  const { font, fontSize: fontSizeKey, spacing } = useEditorStore()
  const fontSize = FONT_SIZE_MAP[fontSizeKey]
  const { lineHeight, letterSpacing, wordSpacing } = SPACING_MAP[spacing]

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  const paperSize = paperFormat !== 'none' ? PAPER_SIZES[paperFormat] : PAPER_SIZES.a4
  const paperW = paperSize.width  // px at 96dpi
  const paperH = paperSize.height

  const buildDoc = useCallback(() => {
    return buildPrintDoc(
      editor.getHTML(),
      title || 'untitled',
      paperFormat,
      marginTop, marginRight, marginBottom, marginLeft,
      font, fontSize, lineHeight, letterSpacing, wordSpacing,
    )
  }, [editor, title, paperFormat, marginTop, marginRight, marginBottom, marginLeft, font, fontSize, lineHeight, letterSpacing, wordSpacing])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    setLoaded(false)
    iframe.srcdoc = buildDoc()
  }, [buildDoc])

  // Resize iframe to content height after fonts settle
  const handleLoad = useCallback(() => {
    setLoaded(true)
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const resize = () => {
      const h = iframe.contentDocument!.documentElement.scrollHeight
      if (h > 0) iframe.style.height = `${Math.max(paperH, h)}px`
    }
    resize()
    // Re-measure after Google Fonts load
    setTimeout(resize, 600)
    setTimeout(resize, 1500)
  }, [paperH])

  const handlePrint = useCallback(() => {
    iframeRef.current?.contentWindow?.print()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); handlePrint() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, handlePrint])

  const CHROME_H = 56

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(24,24,22,0.97)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top chrome ── */}
      <div
        style={{
          height: CHROME_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, fontWeight: 500 }}>
            {title || 'untitled'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12 }}>
            {paperFormat === 'letter' ? 'US Letter' : 'A4'} · {marginTop}/{marginRight}/{marginBottom}/{marginLeft}px
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onClose}
            style={btnStyle(false)}
            onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, btnHover)}
            onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, btnStyle(false))}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            style={btnStyle(true)}
            onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { background: '#fff' })}
            onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, btnStyle(true))}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Scrollable preview ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            width: paperW,
            maxWidth: '100%',
            flexShrink: 0,
            boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
            background: 'white',
            position: 'relative',
            minHeight: paperH,
          }}
        >
          {!loaded && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.25)', fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
            }}>
              Loading…
            </div>
          )}
          <iframe
            ref={iframeRef}
            onLoad={handleLoad}
            style={{
              display: 'block',
              width: '100%',
              minHeight: paperH,
              border: 'none',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 250ms',
            }}
            title="Print preview"
          />
        </div>
      </div>
    </div>
  )
}

// ── Button styles ─────────────────────────────────────────────────────────────

const BASE_BTN: React.CSSProperties = {
  border: 'none',
  borderRadius: 7,
  fontFamily: "'Helvetica Neue', sans-serif",
  fontSize: 13,
  cursor: 'pointer',
  padding: '7px 16px',
  transition: 'background 120ms',
}

function btnStyle(primary: boolean): React.CSSProperties {
  return primary
    ? { ...BASE_BTN, background: 'rgba(255,255,255,0.88)', color: '#1a1a18', fontWeight: 500 }
    : { ...BASE_BTN, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }
}

const btnHover: React.CSSProperties = {
  background: 'rgba(255,255,255,0.13)',
}
