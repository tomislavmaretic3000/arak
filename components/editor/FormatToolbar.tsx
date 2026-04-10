'use client'

import { useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading, Heading1, Heading2, Heading3,
  List, ListOrdered,
  Quote, Link,
} from 'lucide-react'

// ── Atoms ─────────────────────────────────────────────────────────────────────

const ICON = { size: 18, strokeWidth: 1.5 }
const BTN  = 36

function Btn({ icon, title, onClick, active }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        width: BTN, height: BTN,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
        border: 'none', borderRadius: '50%', cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
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

  const AlignIcon   = align === 'center' ? <AlignCenter {...ICON}/> : align === 'right' ? <AlignRight {...ICON}/> : align === 'justify' ? <AlignJustify {...ICON}/> : <AlignLeft {...ICON}/>
  const HeadingIcon = activeHeading === 1 ? <Heading1 {...ICON}/> : activeHeading === 2 ? <Heading2 {...ICON}/> : activeHeading === 3 ? <Heading3 {...ICON}/> : <Heading {...ICON}/>
  const ListIcon    = editor.isActive('orderedList') ? <ListOrdered {...ICON}/> : <List {...ICON}/>

  function toggle(g: Exclude<Group, null>) { setOpenGroup(prev => prev === g ? null : g) }

  function applyAlign(v: string)    { editor.chain().focus().setTextAlign(v).run(); setOpenGroup(null) }
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
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          gap: 2, background: '#1a1a18', borderRadius: 100, padding: '4px 10px',
        }}
      >
        <Btn icon={<Bold {...ICON}/>}   title="Bold"   onClick={() => editor.chain().focus().toggleBold().run()}   active={editor.isActive('bold')} />
        <Btn icon={<Italic {...ICON}/>} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
        <Btn icon={<Quote {...ICON}/>}  title="Quote"  onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
        <Btn icon={<Link {...ICON}/>}   title="Link"   onClick={() => {
          const url = window.prompt('URL', editor.getAttributes('link').href ?? '')
          if (url === null) return
          if (url === '') { editor.chain().focus().unsetLink().run(); return }
          editor.chain().focus().setLink({ href: url }).run()
        }} active={editor.isActive('link')} />

        {/* Align group — trigger hidden when open to avoid duplicate */}
        {openGroup !== 'align'
          ? <Btn icon={AlignIcon} title="Alignment" onClick={() => toggle('align')} active={false} />
          : <>
              <Btn icon={<AlignLeft {...ICON}/>}    title="Left"    onClick={() => applyAlign('left')}    active={align === 'left'} />
              <Btn icon={<AlignCenter {...ICON}/>}  title="Center"  onClick={() => applyAlign('center')}  active={align === 'center'} />
              <Btn icon={<AlignRight {...ICON}/>}   title="Right"   onClick={() => applyAlign('right')}   active={align === 'right'} />
              <Btn icon={<AlignJustify {...ICON}/>} title="Justify" onClick={() => applyAlign('justify')} active={align === 'justify'} />
            </>
        }

        {/* Heading group — trigger hidden when open */}
        {openGroup !== 'heading'
          ? <Btn icon={HeadingIcon} title="Heading" onClick={() => toggle('heading')} active={activeHeading !== null} />
          : <>
              <Btn icon={<Heading1 {...ICON}/>} title="Heading 1" onClick={() => applyHeading(1)} active={activeHeading === 1} />
              <Btn icon={<Heading2 {...ICON}/>} title="Heading 2" onClick={() => applyHeading(2)} active={activeHeading === 2} />
              <Btn icon={<Heading3 {...ICON}/>} title="Heading 3" onClick={() => applyHeading(3)} active={activeHeading === 3} />
            </>
        }

        {/* List group — trigger hidden when open */}
        {openGroup !== 'list'
          ? <Btn icon={ListIcon} title="List" onClick={() => toggle('list')} active={editor.isActive('bulletList') || editor.isActive('orderedList')} />
          : <>
              <Btn icon={<List {...ICON}/>}        title="Bullet list"  onClick={() => applyList('bullet')}  active={editor.isActive('bulletList')} />
              <Btn icon={<ListOrdered {...ICON}/>} title="Ordered list" onClick={() => applyList('ordered')} active={editor.isActive('orderedList')} />
            </>
        }
      </div>
    </BubbleMenu>
  )
}
