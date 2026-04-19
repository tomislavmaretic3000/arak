'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { EditorView } from '@tiptap/pm/view'
import type { EditorState } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'
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
  const btnRefs      = useRef<(HTMLButtonElement | null)[]>([])
  const dismissedRef = useRef<number | null>(null) // match.offset dismissed via Escape
  const matchesRef   = useRef(matches)
  useEffect(() => { matchesRef.current = matches }, [matches])

  // ── Click on underlined word ──────────────────────────────────────────────
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest('.lt-spelling, .lt-grammar, .lt-style, .lt-other') as HTMLElement | null
      if (!span) { setPopover(null); return }

      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor.state)
      const match  = matchAtPos(result.pos, matches, posMap)
      if (!match) { setPopover(null); return }

      dismissedRef.current = null
      const rect = span.getBoundingClientRect()
      setPopover({ match, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      setFocusIdx(0)
      e.stopPropagation()
    }

    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, matches])

  // ── Caret detection via PM plugin update() ────────────────────────────────
  // PM plugin view.update() fires on every transaction (incl. pure selection
  // changes), which is more reliable than TipTap's selectionUpdate event.
  useEffect(() => {
    const pluginKey = new PluginKey('grammarCaretDetect')
    const plugin = new Plugin({
      key: pluginKey,
      view() {
        return {
          update(view: EditorView) {
            const { selection } = view.state
            if (!selection.empty) { setPopover(null); return }

            const posMap = buildPosMap(view.state)
            const match  = matchAtPos(selection.anchor, matchesRef.current, posMap)

            if (!match) {
              dismissedRef.current = null
              setPopover(null)
              return
            }

            // Reset dismiss guard when cursor moves to a different match
            if (dismissedRef.current !== null && dismissedRef.current !== match.offset) {
              dismissedRef.current = null
            }
            if (dismissedRef.current === match.offset) return

            const span = spanForMatch(view, match, posMap)
            if (!span) return

            const rect = span.getBoundingClientRect()
            setPopover((prev) => {
              if (prev?.match.offset === match.offset) return prev
              setFocusIdx(0)
              return { match, x: rect.left + rect.width / 2, y: rect.bottom + 6 }
            })
          },
        }
      },
    })

    const { state } = editor.view
    editor.view.updateState(state.reconfigure({ plugins: [...state.plugins, plugin] }))
    return () => {
      const s = editor.view.state
      editor.view.updateState(s.reconfigure({ plugins: s.plugins.filter((p) => p !== plugin) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // ── Auto-focus first chip when popover opens ─────────────────────────────
  useEffect(() => {
    if (!popover) return
    const id = setTimeout(() => btnRefs.current[0]?.focus(), 30)
    return () => clearTimeout(id)
  }, [popover])

  useEffect(() => {
    btnRefs.current[focusIdx]?.focus()
  }, [focusIdx])

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    if (!popover) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [popover])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    const count = btnRefs.current.filter(Boolean).length
    if (e.key === 'Escape') {
      e.preventDefault()
      if (popover) dismissedRef.current = popover.match.offset
      setPopover(null)
      editor.view.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx((i) => Math.min(i + 1, count - 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx((i) => Math.max(i - 1, 0))
    }
  }

  const applyReplacement = (replacement: string) => {
    if (!popover) return
    const { match } = popover
    const posMap = buildPosMap(editor.state)
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

  const focusedStyle: React.CSSProperties = { ...chipStyle, background: chipHoverBg, color: textHover }

  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = chipHoverBg
    e.currentTarget.style.color = textHover
  }
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    if (focusIdx === idx) return
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
