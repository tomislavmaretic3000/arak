'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
  Minus,
  Trash2,
} from 'lucide-react'

const ICON = { size: 15, strokeWidth: 1.5 }
const BTN  = 32

function Btn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        width: BTN, height: BTN,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: 'none', borderRadius: '50%', cursor: 'pointer',
        color: 'rgba(255,255,255,0.6)',
        transition: 'background 100ms, color 100ms',
        padding: 0, flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' }}
    >
      {icon}
    </button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', flexShrink: 0, alignSelf: 'center', margin: '0 2px' }} />
}

interface Props { editor: Editor }

export function TableToolbar({ editor }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const raf = useRef<number | null>(null)

  const updatePos = useCallback(() => {
    if (!editor.isActive('table')) { setPos(null); return }
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    setPos({ top: coords.bottom + 10, left: coords.left })
  }, [editor])

  useEffect(() => {
    const handler = () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(updatePos)
    }
    editor.on('selectionUpdate', handler)
    editor.on('transaction', handler)
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', handler)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [editor, updatePos])

  if (!pos) return null

  const run = (fn: () => boolean) => { fn(); editor.commands.focus() }

  return (
    <div
      className="format-toolbar-enter"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 50,
        background: '#1a1a18',
        borderRadius: 100,
        padding: '3px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Btn icon={<ArrowLeftToLine  {...ICON}/>} title="Add column left"   onClick={() => run(() => editor.chain().addColumnBefore().run())} />
      <Btn icon={<ArrowRightToLine {...ICON}/>} title="Add column right"  onClick={() => run(() => editor.chain().addColumnAfter().run())} />
      <Btn icon={<ArrowUpToLine    {...ICON}/>} title="Add row above"     onClick={() => run(() => editor.chain().addRowBefore().run())} />
      <Btn icon={<ArrowDownToLine  {...ICON}/>} title="Add row below"     onClick={() => run(() => editor.chain().addRowAfter().run())} />
      <Sep />
      <Btn icon={<Minus    {...ICON}/>}  title="Delete column" onClick={() => run(() => editor.chain().deleteColumn().run())} />
      <Btn icon={<Trash2   {...ICON}/>}  title="Delete table"  onClick={() => run(() => editor.chain().deleteTable().run())} />
    </div>
  )
}
