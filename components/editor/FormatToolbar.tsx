'use client'

import { useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'

// ── SVG Icons ────────────────────────────────────────────────────────────────

const S = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function IconBold()         { return <svg {...S}><path d="M5 9h5a2.5 2.5 0 0 0 0-5H5v5Zm0 0h5.5a2.5 2.5 0 0 1 0 5H5V9Z"/></svg> }
function IconItalic()       { return <svg {...S}><line x1="11" y1="4" x2="7" y2="14"/><line x1="8" y1="4" x2="14" y2="4"/><line x1="4" y1="14" x2="10" y2="14"/></svg> }
function IconAlignLeft()    { return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="11" y2="9"/><line x1="3" y1="13" x2="14" y2="13"/></svg> }
function IconAlignCenter()  { return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="5" y1="9" x2="13" y2="9"/><line x1="4" y1="13" x2="14" y2="13"/></svg> }
function IconAlignRight()   { return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="7" y1="9" x2="15" y2="9"/><line x1="4" y1="13" x2="15" y2="13"/></svg> }
function IconAlignJustify() { return <svg {...S}><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="13" x2="15" y2="13"/></svg> }
function IconH()            { return <svg {...S}><line x1="4" y1="4" x2="4" y2="14"/><line x1="14" y1="4" x2="14" y2="14"/><line x1="4" y1="9" x2="14" y2="9"/></svg> }
function IconH1()           { return <svg {...S}><path d="M4 4v10M4 9h6M10 4v10M14 14V9l-1.5 1"/></svg> }
function IconH2()           { return <svg {...S}><path d="M3 4v10M3 9h6M9 4v10"/><path d="M13 8.5c0-1 2.5-1.5 2.5 0 0 2-2.5 2-2.5 3.5H16"/></svg> }
function IconH3()           { return <svg {...S}><path d="M3 4v10M3 9h5M8 4v10"/><path d="M12 7.5c0-.8 2.5-1.5 2.5.5s-2.5 1-2.5 1 2.5.5 2.5 2-.8 2.5-2.5 1.5"/></svg> }
function IconBulletList()   { return <svg {...S}><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/></svg> }
function IconOrderedList()  { return <svg {...S}><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/><text x="2" y="7.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="2" y="11.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="2" y="15.5" fontSize="5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg> }

// ── Atoms ─────────────────────────────────────────────────────────────────────

const BTN = 32

function Btn({ icon, title, onClick, active }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        width: BTN, height: BTN,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.45)',
        transition: 'background 100ms, color 100ms',
        padding: 0, flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {icon}
    </button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 2px', flexShrink: 0, alignSelf: 'center' }} />
}

function SubDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />
}

// ── Expandable group: trigger + vertical sub-options below ────────────────────

function Expandable({ trigger, open, children }: { trigger: React.ReactNode; open: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: BTN }}>
      {trigger}
      {open && (
        <>
          <SubDivider />
          {children}
        </>
      )}
    </div>
  )
}

// ── FormatToolbar ─────────────────────────────────────────────────────────────

type Group = 'align' | 'heading' | 'list' | null

export function FormatToolbar({ editor }: { editor: Editor }) {
  const [openGroup, setOpenGroup] = useState<Group>(null)

  const align = editor.isActive({ textAlign: 'justify' }) ? 'justify'
    : editor.isActive({ textAlign: 'center' }) ? 'center'
    : editor.isActive({ textAlign: 'right' }) ? 'right'
    : 'left'

  const activeHeading = editor.isActive('heading', { level: 1 }) ? 1
    : editor.isActive('heading', { level: 2 }) ? 2
    : editor.isActive('heading', { level: 3 }) ? 3
    : null

  const AlignIcon   = align === 'center' ? IconAlignCenter : align === 'right' ? IconAlignRight : align === 'justify' ? IconAlignJustify : IconAlignLeft
  const HeadingIcon = activeHeading === 1 ? IconH1 : activeHeading === 2 ? IconH2 : activeHeading === 3 ? IconH3 : IconH
  const ListIcon    = editor.isActive('orderedList') ? IconOrderedList : IconBulletList

  function toggle(g: Exclude<Group, null>) { setOpenGroup(prev => prev === g ? null : g) }

  function applyAlign(v: string)    { editor.chain().focus().setTextAlign(v).run();          setOpenGroup(null) }
  function applyHeading(l: 1|2|3)   { editor.chain().focus().toggleHeading({ level: l }).run(); setOpenGroup(null) }
  function applyList(t: 'bullet'|'ordered') {
    if (t === 'bullet') editor.chain().focus().toggleBulletList().run()
    else editor.chain().focus().toggleOrderedList().run()
    setOpenGroup(null)
  }

  return (
    <BubbleMenu editor={editor}>
      <div
        className="format-toolbar-enter"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 1,
          background: '#1a1a18',
          borderRadius: 10,
          padding: '3px 4px',
        }}
      >
        {/* Bold & Italic — no sub-options */}
        <Btn icon={<IconBold />}   title="Bold"   onClick={() => editor.chain().focus().toggleBold().run()}   active={editor.isActive('bold')} />
        <Btn icon={<IconItalic />} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />

        <Sep />

        {/* Alignment */}
        <Expandable open={openGroup === 'align'} trigger={
          <Btn icon={<AlignIcon />} title="Alignment" onClick={() => toggle('align')} active={openGroup === 'align'} />
        }>
          <Btn icon={<IconAlignLeft />}    title="Left"    onClick={() => applyAlign('left')}    active={align === 'left'} />
          <Btn icon={<IconAlignCenter />}  title="Center"  onClick={() => applyAlign('center')}  active={align === 'center'} />
          <Btn icon={<IconAlignRight />}   title="Right"   onClick={() => applyAlign('right')}   active={align === 'right'} />
          <Btn icon={<IconAlignJustify />} title="Justify" onClick={() => applyAlign('justify')} active={align === 'justify'} />
        </Expandable>

        {/* Heading */}
        <Expandable open={openGroup === 'heading'} trigger={
          <Btn icon={<HeadingIcon />} title="Heading" onClick={() => toggle('heading')} active={openGroup === 'heading' || activeHeading !== null} />
        }>
          <Btn icon={<IconH1 />} title="Heading 1" onClick={() => applyHeading(1)} active={activeHeading === 1} />
          <Btn icon={<IconH2 />} title="Heading 2" onClick={() => applyHeading(2)} active={activeHeading === 2} />
          <Btn icon={<IconH3 />} title="Heading 3" onClick={() => applyHeading(3)} active={activeHeading === 3} />
        </Expandable>

        {/* List */}
        <Expandable open={openGroup === 'list'} trigger={
          <Btn icon={<ListIcon />} title="List" onClick={() => toggle('list')} active={openGroup === 'list' || editor.isActive('bulletList') || editor.isActive('orderedList')} />
        }>
          <Btn icon={<IconBulletList />}  title="Bullet list"  onClick={() => applyList('bullet')}  active={editor.isActive('bulletList')} />
          <Btn icon={<IconOrderedList />} title="Ordered list" onClick={() => applyList('ordered')} active={editor.isActive('orderedList')} />
        </Expandable>
      </div>
    </BubbleMenu>
  )
}
