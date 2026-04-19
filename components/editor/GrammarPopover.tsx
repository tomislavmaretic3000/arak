'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { LTMatch } from '@/lib/editor/languageTool'
import { useEditorStore } from '@/store/editor'

interface Props {
  editor: Editor
  matches: LTMatch[]
}

function buildPosMap(editor: Editor): number[] {
  const map: number[] = []
  editor.state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    const pmStart = offset + 1
    for (let i = 0; i < node.textContent.length; i++) map.push(pmStart + i)
  })
  return map
}

export function GrammarPopover({ editor, matches }: Props) {
  const theme = useEditorStore((s) => s.theme)
  const dark  = theme === 'dark'

  const popoverBg   = dark ? '#e8e8e4' : '#1a1a18'
  const textColor   = dark ? 'rgba(28,28,26,0.75)' : 'rgba(255,255,255,0.75)'
  const textHover   = dark ? '#1c1c1a' : '#fff'
  const chipHoverBg = dark ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'

  const [popover, setPopover]   = useState<{ match: LTMatch; x: number; y: number } | null>(null)
  const [focusIdx, setFocusIdx] = useState(0)
  const ref      = useRef<HTMLDivElement>(null)
  const btnRefs  = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest('.lt-spelling, .lt-grammar, .lt-style, .lt-other') as HTMLElement | null
      if (!span) { setPopover(null); return }

      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor)
      const match = matches.find((m) => {
        const end = m.offset + m.length
        if (m.offset >= posMap.length || end > posMap.length) return false
        return result.pos >= posMap[m.offset] && result.pos < posMap[end - 1] + 1
      }) ?? null

      if (!match) { setPopover(null); return }

      const rect = span.getBoundingClientRect()
      setPopover({ match, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      setFocusIdx(0)
      e.stopPropagation()
    }

    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, matches])

  // Focus first button when popover opens
  useEffect(() => {
    if (!popover) return
    const id = setTimeout(() => btnRefs.current[0]?.focus(), 30)
    return () => clearTimeout(id)
  }, [popover])

  // Move focus when focusIdx changes
  useEffect(() => {
    btnRefs.current[focusIdx]?.focus()
  }, [focusIdx])

  useEffect(() => {
    if (!popover) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [popover])

  // Keyboard handler on the container
  const onKeyDown = (e: React.KeyboardEvent) => {
    const count = btnRefs.current.filter(Boolean).length
    if (e.key === 'Escape') {
      e.preventDefault()
      setPopover(null)
      editor.view.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx((i) => Math.min(i + 1, count - 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx((i) => Math.max(i - 1, 0))
    }
    // Enter is handled natively by the focused button's onClick
  }

  const applyReplacement = (replacement: string) => {
    if (!popover) return
    const { match } = popover
    const posMap = buildPosMap(editor)
    const end = match.offset + match.length
    if (match.offset >= posMap.length || end > posMap.length) { setPopover(null); return }
    const from = posMap[match.offset]
    const to   = posMap[end - 1] + 1
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
    setPopover(null)
  }

  if (!popover) return null

  const { match, x, y } = popover
  const label        = match.shortMessage || match.message
  const replacements = match.replacements.slice(0, 5)
  const singleFix    = replacements.length === 1
  const multiChips   = replacements.length > 1

  const chipStyle: React.CSSProperties = {
    height: 36,
    padding: '0 15px',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderRadius: 100,
    color: textColor,
    fontSize: 16,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    cursor: 'pointer',
    transition: 'background 100ms, color 100ms',
    flexShrink: 0,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    outline: 'none',
  }

  const focusedStyle: React.CSSProperties = {
    ...chipStyle,
    background: chipHoverBg,
    color: textHover,
  }

  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = chipHoverBg
    e.currentTarget.style.color = textHover
  }
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    if (focusIdx === idx) return // keep highlight if still focused
    e.currentTarget.style.background = 'none'
    e.currentTarget.style.color = textColor
  }

  const chips: { label: string; value: string }[] = singleFix
    ? [{ label: match.category === 'spelling' ? replacements[0] : label, value: replacements[0] }]
    : multiChips
      ? replacements.map((r) => ({ label: r, value: r }))
      : []

  return createPortal(
    <div
      ref={ref}
      className="format-toolbar-enter"
      onKeyDown={onKeyDown}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        transform: 'translateX(-50%)',
        zIndex: 150,
        background: popoverBg,
        borderRadius: 100,
        padding: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 2,
        maxWidth: 360,
      }}
    >
      {chips.map((chip, i) => (
        <button
          key={chip.value}
          ref={(el) => { btnRefs.current[i] = el }}
          onClick={() => applyReplacement(chip.value)}
          onFocus={() => setFocusIdx(i)}
          style={focusIdx === i ? focusedStyle : chipStyle}
          onMouseEnter={(e) => { setFocusIdx(i); onEnter(e) }}
          onMouseLeave={(e) => onLeave(e, i)}
        >
          {chip.label}
        </button>
      ))}

      {replacements.length === 0 && (
        <div style={{ padding: '9px 15px', fontSize: 16, color: textColor, letterSpacing: '0.01em' }}>
          {label}
        </div>
      )}
    </div>,
    document.body
  )
}
