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
function IconUnderline() {
  return <svg {...S}><path d="M5 4v5a4 4 0 0 0 8 0V4"/><line x1="3" y1="14" x2="15" y2="14"/></svg>
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
function IconH2() {
  return <svg {...S}><path d="M3 4v10M3 9h6M9 4v10"/><path d="M13 8.5c0-1 2.5-1.5 2.5 0 0 2-2.5 2-2.5 3.5H16"/></svg>
}
function IconH3() {
  return <svg {...S}><path d="M3 4v10M3 9h5M8 4v10"/><path d="M12 7.5c0-.8 2.5-1.5 2.5.5s-2.5 1-2.5 1 2.5.5 2.5 2-.8 2.5-2.5 1.5"/></svg>
}
function IconBulletList() {
  return <svg {...S}><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/></svg>
}
function IconOrderedList() {
  return <svg {...S}><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/><text x="2" y="7.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="2" y="11.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="2" y="15.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg>
}
function IconTable() {
  return <svg {...S}><rect x="3" y="3" width="12" height="12" rx="1"/><line x1="3" y1="7" x2="15" y2="7"/><line x1="3" y1="11" x2="15" y2="11"/><line x1="9" y1="3" x2="9" y2="15"/></svg>
}
function IconDivider() {
  return <svg {...S}><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="6" x2="5" y2="6"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="13" y1="6" x2="15" y2="6"/><line x1="13" y1="12" x2="15" y2="12"/></svg>
}
function IconPageBreak() {
  return <svg {...S}><rect x="4" y="2" width="10" height="6" rx="1"/><rect x="4" y="10" width="10" height="6" rx="1"/><line x1="4" y1="9" x2="14" y2="9" strokeDasharray="2 1.5"/></svg>
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
        <Btn icon={<IconUnderline />} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />

        <Sep />

        <Btn icon={<AlignIcon />} title={`Align ${align} (click to cycle)`} onClick={cycleAlign} />

        <Sep />

        <Btn icon={<IconH1 />} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />
        <Btn icon={<IconH2 />} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
        <Btn icon={<IconH3 />} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} />

        <Sep />

        <Btn icon={<IconBulletList />} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
        <Btn icon={<IconOrderedList />} title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />

        <Sep />

        <Btn icon={<IconTable />} title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Btn icon={<IconDivider />} title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <Btn icon={<IconPageBreak />} title="Page break (Cmd+Enter)" onClick={() => editor.chain().focus().insertPageBreak().run()} />
      </div>
    </BubbleMenu>
  )
}
