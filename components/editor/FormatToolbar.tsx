'use client'

import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'

// ── SVG Icons ────────────────────────────────────────────────────────────────

const S = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function IconBold() {
  return <svg {...S}><path d="M5 9h5a2.5 2.5 0 0 0 0-5H5v5Zm0 0h5.5a2.5 2.5 0 0 1 0 5H5V9Z"/></svg>
}
function IconItalic() {
  return <svg {...S}><line x1="11" y1="4" x2="7" y2="14"/><line x1="8" y1="4" x2="14" y2="4"/><line x1="4" y1="14" x2="10" y2="14"/></svg>
}
function IconAlignLeft() {
  return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="11" y2="9"/><line x1="3" y1="13" x2="14" y2="13"/></svg>
}
function IconAlignCenter() {
  return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="5" y1="9" x2="13" y2="9"/><line x1="4" y1="13" x2="14" y2="13"/></svg>
}
function IconAlignRight() {
  return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="7" y1="9" x2="15" y2="9"/><line x1="4" y1="13" x2="15" y2="13"/></svg>
}
function IconH1() {
  return <svg {...S}><path d="M4 4v10M4 9h6M10 4v10M14 14V9l-1.5 1"/></svg>
}
function IconBulletList() {
  return <svg {...S}><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/></svg>
}

// ── Separator ────────────────────────────────────────────────────────────────

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 3px', flexShrink: 0 }} />
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function Btn({ icon, title, onClick, active }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.75)',
        transition: 'background 100ms, color 100ms',
        padding: 0,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {icon}
    </button>
  )
}

// ── FormatToolbar ─────────────────────────────────────────────────────────────

export function FormatToolbar({ editor }: { editor: Editor }) {
  const align = editor.isActive({ textAlign: 'center' }) ? 'center' : editor.isActive({ textAlign: 'right' }) ? 'right' : 'left'

  const cycleAlign = () => {
    if (align === 'left') editor.chain().focus().setTextAlign('center').run()
    else if (align === 'center') editor.chain().focus().setTextAlign('right').run()
    else editor.chain().focus().setTextAlign('left').run()
  }

  const AlignIcon = align === 'center' ? IconAlignCenter : align === 'right' ? IconAlignRight : IconAlignLeft

  return (
    <BubbleMenu editor={editor}>
      <div
        className="format-toolbar-enter"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#1a1a18',
          borderRadius: 10,
          padding: '4px 6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <Btn icon={<IconBold />} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
        <Btn icon={<IconItalic />} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />

        <Sep />

        <Btn icon={<AlignIcon />} title={`Align ${align} (click to cycle)`} onClick={cycleAlign} />

        <Sep />

        <Btn icon={<IconH1 />} title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />

        <Sep />

        <Btn icon={<IconBulletList />} title="List" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
      </div>
    </BubbleMenu>
  )
}
