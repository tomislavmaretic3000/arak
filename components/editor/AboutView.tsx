'use client'

import { useEditorStore, FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/store/editor'

const ABOUT_TEXT = `Arak is a minimal writing environment.

Built for focused writing without distractions.

More to come.`

export function AboutView() {
  const { font, fontSize, lineHeight } = useEditorStore()

  const fontFamily =
    font === 'serif'
      ? 'var(--font-noto-serif)'
      : font === 'mono'
      ? 'var(--font-noto-mono)'
      : 'var(--font-noto-sans)'

  const fontSizePx  = FONT_SIZE_MAP[fontSize]
  const lineHeightV = LINE_HEIGHT_MAP[lineHeight]

  return (
    <div
      style={{
        maxWidth: '65ch',
        fontSize: fontSizePx,
        margin: '0 auto',
        padding: '18vh 2rem 12rem',
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: fontSizePx,
          lineHeight: lineHeightV,
          color: 'var(--fg)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          userSelect: 'text',
          cursor: 'default',
        }}
      >
        {ABOUT_TEXT}
      </div>
    </div>
  )
}
