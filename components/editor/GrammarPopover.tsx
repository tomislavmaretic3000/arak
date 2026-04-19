'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { EditorView } from '@tiptap/pm/view'
import type { EditorState } from '@tiptap/pm/state'
import type { LTMatch } from '@/lib/editor/languageTool'
import { useEditorStore } from '@/store/editor'

interface Props {
  editor: Editor
  matches: LTMatch[]
}

function buildPosMap(state: EditorState): number[] {
  const map: number[] = []
  state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    const pmStart = offset + 1
    for (let i = 0; i < node.textContent.length; i++) map.push(pmStart + i)
  })
  return map
}

function matchAtPos(pos: number, matches: LTMatch[], posMap: number[]): LTMatch | null {
  return matches.find((m) => {
    const end = m.offset + m.length
    if (m.offset >= posMap.length || end > posMap.length) return false
    return pos >= posMap[m.offset] && pos <= posMap[end - 1] + 1
  }) ?? null
}

function spanForMatch(view: EditorView, match: LTMatch, posMap: number[]): HTMLElement | null {
  try {
    const { node } = view.domAtPos(posMap[match.offset])
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement
    return el?.closest('.lt-spelling, .lt-grammar, .lt-style, .lt-other') as HTMLElement | null
  } catch { return null }
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
  const ref          = useRef<HTMLDivElement>(null)

  // Stable refs to avoid stale closures in event handlers
  const matchesRef    = useRef(matches)
  const popoverRef    = useRef(popover)
  const focusIdxRef   = useRef(focusIdx)
  const dismissedRef  = useRef<number | null>(null)
  const chipsRef      = useRef<{ label: string; value: string }[]>([])

  useEffect(() => { matchesRef.current = matches }, [matches])
  useEffect(() => { popoverRef.current = popover }, [popover])
  useEffect(() => { focusIdxRef.current = focusIdx }, [focusIdx])

  // ── Apply replacement (stable via ref) ───────────────────────────────────
  const applyRef = useRef((replacement: string, match: LTMatch) => {
    const posMap = buildPosMap(editor.state)
    const end = match.offset + match.length
    if (match.offset >= posMap.length || end > posMap.length) { setPopover(null); return }
    const from = posMap[match.offset]
    const to   = posMap[end - 1] + 1
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
    setPopover(null)
  })
  useEffect(() => {
    applyRef.current = (replacement: string, match: LTMatch) => {
      const posMap = buildPosMap(editor.state)
      const end = match.offset + match.length
      if (match.offset >= posMap.length || end > posMap.length) { setPopover(null); return }
      const from = posMap[match.offset]
      const to   = posMap[end - 1] + 1
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
      setPopover(null)
    }
  }, [editor])

  // ── Transaction listener — fires after every PM state change ─────────────
  useEffect(() => {
    const onTransaction = () => {
      const { selection } = editor.state
      if (!selection.empty) { setPopover(null); return }

      const posMap = buildPosMap(editor.state)
      const match  = matchAtPos(selection.anchor, matchesRef.current, posMap)

      if (!match) {
        dismissedRef.current = null
        setPopover(null)
        return
      }

      if (dismissedRef.current !== null && dismissedRef.current !== match.offset) {
        dismissedRef.current = null
      }
      if (dismissedRef.current === match.offset) return

      const span = spanForMatch(editor.view, match, posMap)
      if (!span) return

      const rect = span.getBoundingClientRect()
      setPopover((prev) => {
        if (prev?.match.offset === match.offset) return prev
        setFocusIdx(0)
        return { match, x: rect.left + rect.width / 2, y: rect.bottom + 6 }
      })
    }

    editor.on('transaction', onTransaction)
    return () => { editor.off('transaction', onTransaction) }
  }, [editor])

  // ── Click on underlined word ──────────────────────────────────────────────
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest('.lt-spelling, .lt-grammar, .lt-style, .lt-other') as HTMLElement | null
      if (!span) { setPopover(null); return }

      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor.state)
      const match  = matchAtPos(result.pos, matchesRef.current, posMap)
      if (!match) { setPopover(null); return }

      dismissedRef.current = null
      const rect = span.getBoundingClientRect()
      setPopover({ match, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      setFocusIdx(0)
      e.stopPropagation()
    }

    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor])

  // ── Keyboard — intercept on editor DOM (capture) so editor keeps focus ───
  // Editor retains focus; we intercept arrows/enter/escape before PM sees them.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const current = popoverRef.current
      if (!current) return

      const chips = chipsRef.current
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        dismissedRef.current = current.match.offset
        setPopover(null)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (chips.length < 2) return
        e.preventDefault()
        e.stopPropagation()
        setFocusIdx((i) => Math.min(i + 1, chips.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (chips.length < 2) return
        e.preventDefault()
        e.stopPropagation()
        setFocusIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (chips.length === 0) return
        e.preventDefault()
        e.stopPropagation()
        const chip = chips[focusIdxRef.current] ?? chips[0]
        applyRef.current(chip.value, current.match)
      }
    }

    editor.view.dom.addEventListener('keydown', onKeyDown, true) // capture
    return () => editor.view.dom.removeEventListener('keydown', onKeyDown, true)
  }, [editor])

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!popover) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [popover])

  if (!popover) return null

  const { match, x, y } = popover
  const label        = match.shortMessage || match.message
  const replacements = match.replacements.slice(0, 5)
  const singleFix    = replacements.length === 1
  const multiChips   = replacements.length > 1

  const chips: { label: string; value: string }[] = singleFix
    ? [{ label: match.category === 'spelling' ? replacements[0] : label, value: replacements[0] }]
    : multiChips
      ? replacements.map((r) => ({ label: r, value: r }))
      : []

  // Keep chipsRef in sync for the keydown handler
  chipsRef.current = chips

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

  const focusedStyle: React.CSSProperties = { ...chipStyle, background: chipHoverBg, color: textHover }

  const onMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    setFocusIdx(i)
    e.currentTarget.style.background = chipHoverBg
    e.currentTarget.style.color = textHover
  }
  const onMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    if (focusIdx === i) return
    e.currentTarget.style.background = 'none'
    e.currentTarget.style.color = textColor
  }

  return createPortal(
    <div
      ref={ref}
      className="format-toolbar-enter"
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
          onMouseDown={(e) => { e.preventDefault(); applyRef.current(chip.value, match) }}
          style={focusIdx === i ? focusedStyle : chipStyle}
          onMouseEnter={(e) => onMouseEnter(e, i)}
          onMouseLeave={(e) => onMouseLeave(e, i)}
        >
          {chip.label}
        </button>
      ))}

      {chips.length === 0 && (
        <div style={{ padding: '9px 15px', fontSize: 16, color: textColor, letterSpacing: '0.01em' }}>
          {label}
        </div>
      )}
    </div>,
    document.body
  )
}
