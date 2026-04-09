'use client'

import { useEditorStore, FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/store/editor'

const ABOUT_TEXT = `Arak is a minimal writing environment designed to get out of your way and let you focus on the words.

It offers two modes — a plain writing surface for drafting, and a format view for structuring your text with headings, lists, and rich layout.

You can open and save documents from your device or directly from Google Drive, with recent files always a click away.

The appearance is fully adjustable: choose your typeface, text size, and theme — including a Shade mode with a subtle ambient overlay for evening writing sessions.

Focus mode dims everything outside the current paragraph, and word class highlighting colours nouns, verbs, adjectives, and adverbs to help you see the rhythm and balance of your writing.

A live word count tracks your progress quietly in the corner, out of the way until you need it.`

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
