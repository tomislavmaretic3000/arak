'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useCommandBarStore } from '@/store/commandBar'
import { useSearchStore } from '@/store/search'
import { useEditorStore } from '@/store/editor'
import { editorRefs } from '@/store/editorRefs'
import { findMatches, replaceOne, replaceAll } from '@/lib/editor/search'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEditorText(pathname: string): string {
  if (pathname === '/write')  return editorRefs.write?.getText({ blockSeparator: '\n' }) ?? useEditorStore.getState().content
  if (pathname === '/format') return editorRefs.format?.getText({ blockSeparator: '\n' }) ?? ''
  return ''
}

function plainTextToDoc(text: string) {
  if (!text) return { type: 'doc', content: [{ type: 'paragraph' }] }
  return {
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  }
}

// ── Commands ──────────────────────────────────────────────────────────────────

interface Cmd {
  id: string
  label: string
  action: () => void
  checked?: () => boolean
}

function buildCommands(open: (mode?: 'command' | 'find' | 'replace') => void): Cmd[] {
  return [
    {
      id: 'find', label: 'Find in document',
      action: () => open('find'),
    },
    {
      id: 'replace', label: 'Find & Replace',
      action: () => open('replace'),
    },
    {
      id: 'grammar', label: 'Grammar Check',
      action: () => { const s = useEditorStore.getState(); s.setGrammarCheck(!s.grammarCheck) },
      checked: () => useEditorStore.getState().grammarCheck,
    },
    {
      id: 'focus', label: 'Focus Mode',
      action: () => { const s = useEditorStore.getState(); s.setFocusMode(!s.focusMode) },
      checked: () => useEditorStore.getState().focusMode,
    },
    {
      id: 'wordcount', label: 'Word Count',
      action: () => { const s = useEditorStore.getState(); s.setShowWordCount(!s.showWordCount) },
      checked: () => useEditorStore.getState().showWordCount,
    },
    {
      id: 'pos', label: 'POS Highlight',
      action: () => { const s = useEditorStore.getState(); s.setPosHighlight(!s.posHighlight) },
      checked: () => useEditorStore.getState().posHighlight,
    },
    {
      id: 'font-sans', label: 'Font: Sans',
      action: () => useEditorStore.getState().setFont('sans'),
      checked: () => useEditorStore.getState().font === 'sans',
    },
    {
      id: 'font-serif', label: 'Font: Serif',
      action: () => useEditorStore.getState().setFont('serif'),
      checked: () => useEditorStore.getState().font === 'serif',
    },
    {
      id: 'font-mono', label: 'Font: Mono',
      action: () => useEditorStore.getState().setFont('mono'),
      checked: () => useEditorStore.getState().font === 'mono',
    },
    {
      id: 'theme-light', label: 'Theme: Light',
      action: () => useEditorStore.getState().setTheme('light'),
      checked: () => useEditorStore.getState().theme === 'light',
    },
    {
      id: 'theme-dark', label: 'Theme: Dark',
      action: () => useEditorStore.getState().setTheme('dark'),
      checked: () => useEditorStore.getState().theme === 'dark',
    },
    {
      id: 'theme-shade', label: 'Theme: Shade',
      action: () => useEditorStore.getState().setTheme('shade'),
      checked: () => useEditorStore.getState().theme === 'shade',
    },
    {
      id: 'export', label: 'Export / Print',
      action: () => window.dispatchEvent(new CustomEvent('arak:print')),
    },
  ]
}

// ── Row height / geometry — must match dot: top 24px, height 27px → center 37.5px ──
const ROW_H    = 44   // input row height
const PADDING  = 4    // pill padding (same as format toolbar)
const BAR_TOP  = Math.round(37.5 - (ROW_H / 2) - PADDING) // = 37.5 - 22 - 4 = 11.5 → 12

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandBar() {
  const { isOpen, mode, open, close } = useCommandBarStore()
  const {
    query, setQuery, replaceText, setReplaceText,
    matches, currentMatchIndex, setMatches, goToNext, goToPrev,
    open: openSearch, close: closeSearch,
  } = useSearchStore()

  const pathname     = usePathname()
  const inputRef     = useRef<HTMLInputElement>(null)
  const replaceRef   = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [cmdQuery, setCmdQuery]       = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [, forceUpdate]               = useState(0)

  const isFindMode    = mode === 'find' || mode === 'replace'
  const isReplaceMode = mode === 'replace'
  const isCmdMode     = mode === 'command'

  const COMMANDS = useMemo(() => buildCommands(open), [open])

  // ── Search store sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && isFindMode) openSearch(isReplaceMode ? 'replace' : 'search')
    else closeSearch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  // matches are computed inside WriteEditor/FormatEditor directly from live text

  // ── Focus ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const id = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
    return () => clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    if (isCmdMode) { setCmdQuery(''); setSelectedIdx(0) }
  }, [mode, isCmdMode])

  // ── Keyboard globals ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) { e.preventDefault(); close() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && !e.shiftKey && e.key === 'k') { e.preventDefault(); open('command') }
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); open('find') }
      if (mod &&  e.shiftKey && e.key === 'F') { e.preventDefault(); open('replace') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [isOpen, close])

  // ── Commands ──────────────────────────────────────────────────────────────
  const filteredCmds = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase()
    return q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS
  }, [cmdQuery, COMMANDS])

  useEffect(() => { setSelectedIdx(0) }, [filteredCmds])

  const execCommand = useCallback((cmd: Cmd) => {
    cmd.action()
    forceUpdate((n) => n + 1)
    if (cmd.checked === undefined) close() // non-toggle closes
  }, [close])

  // ── Replace ops ───────────────────────────────────────────────────────────
  const handleReplaceOne = useCallback(() => {
    const match = matches[currentMatchIndex]
    if (!match || !replaceText) return
    if (pathname === '/write' && editorRefs.write) {
      const { text: next } = replaceOne(editorRefs.write.getText({ blockSeparator: '\n' }), match, replaceText)
      editorRefs.write.commands.setContent(plainTextToDoc(next))
    }
  }, [matches, currentMatchIndex, replaceText, pathname])

  const handleReplaceAll = useCallback(() => {
    if (!query || pathname !== '/write' || !editorRefs.write) return
    const next = replaceAll(editorRefs.write.getText({ blockSeparator: '\n' }), query, replaceText)
    editorRefs.write.commands.setContent(plainTextToDoc(next))
  }, [query, replaceText, pathname])

  // ── Cmd keyboard ─────────────────────────────────────────────────────────
  const handleCmdKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filteredCmds.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const c = filteredCmds[selectedIdx]; if (c) execCommand(c) }
  }, [filteredCmds, selectedIdx, execCommand])

  const handleFindKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goToPrev() : goToNext() }
  }, [goToNext, goToPrev])

  const matchLabel = query ? (matches.length === 0 ? 'no matches' : `${currentMatchIndex + 1} / ${matches.length}`) : ''
  const hasResults = isCmdMode && filteredCmds.length > 0

  if (!isOpen) return null

  return createPortal(
    <div
      ref={containerRef}
      className="cmdbar-enter"
      style={{
        position: 'fixed',
        top: BAR_TOP,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 460,
        maxWidth: 'calc(100vw - 32px)',
        background: '#1a1a18',
        borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
        padding: PADDING,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* ── Input row ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: ROW_H, paddingInline: 12, gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={isCmdMode ? cmdQuery : query}
          onChange={(e) => isCmdMode ? setCmdQuery(e.target.value) : setQuery(e.target.value)}
          onKeyDown={isCmdMode ? handleCmdKey : handleFindKey}
          placeholder={isCmdMode ? 'Search commands…' : isReplaceMode ? 'Find…' : 'Find in document…'}
          spellCheck={false}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#fff', fontSize: 15, letterSpacing: '0.01em',
            caretColor: 'rgba(255,255,255,0.7)',
          }}
        />

        {/* Match counter */}
        {isFindMode && matchLabel && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', flexShrink: 0 }}>
            {matchLabel}
          </span>
        )}

        {/* Nav arrows */}
        {isFindMode && matches.length > 0 && (
          <div style={{ display: 'flex', gap: 2 }}>
            {(['↑', '↓'] as const).map((arrow) => (
              <button
                key={arrow}
                onMouseDown={(e) => { e.preventDefault(); arrow === '↑' ? goToPrev() : goToNext() }}
                style={navBtn}
              >
                {arrow}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Replace row ── */}
      {isReplaceMode && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginInline: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', height: ROW_H, paddingInline: 12, gap: 8 }}>
            <input
              ref={replaceRef}
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleReplaceOne() } }}
              placeholder="Replace with…"
              spellCheck={false}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 15, letterSpacing: '0.01em',
                caretColor: 'rgba(255,255,255,0.7)',
              }}
            />
            <button onMouseDown={(e) => { e.preventDefault(); handleReplaceOne() }} disabled={matches.length === 0} style={actionBtn}>replace</button>
            <button onMouseDown={(e) => { e.preventDefault(); handleReplaceAll() }} disabled={!query} style={actionBtn}>all</button>
          </div>
        </>
      )}

      {/* ── Command list ── */}
      {hasResults && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginInline: 4 }} />
          <div style={{ padding: '4px 0', maxHeight: 240, overflowY: 'auto' }}>
            {filteredCmds.map((cmd, i) => {
              const active    = i === selectedIdx
              const isChecked = cmd.checked?.()
              return (
                <div
                  key={cmd.id}
                  onMouseDown={(e) => { e.preventDefault(); execCommand(cmd) }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    height: 36, paddingInline: 12,
                    borderRadius: 12,
                    marginInline: 4,
                    cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, color: active ? '#fff' : 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
                    {cmd.label}
                  </span>
                  {isChecked !== undefined && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: isChecked ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.15)',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* No results */}
      {isCmdMode && cmdQuery && filteredCmds.length === 0 && (
        <div style={{ padding: '10px 16px 10px', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          No results
        </div>
      )}
    </div>,
    document.body
  )
}

// ── Shared button styles ──────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width: 28, height: 28, border: 'none', borderRadius: 8,
  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
  fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const actionBtn: React.CSSProperties = {
  flexShrink: 0, height: 28, padding: '0 10px',
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
  color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer',
  letterSpacing: '0.02em',
}
