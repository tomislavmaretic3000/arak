'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useCommandBarStore } from '@/store/commandBar'
import { useSearchStore } from '@/store/search'
import { useEditorStore } from '@/store/editor'
import { editorRefs } from '@/store/editorRefs'
import { findMatches, replaceOne, replaceAll } from '@/lib/editor/search'

// ── Plain-text content from active editor ─────────────────────────────────────

function getEditorText(pathname: string): string {
  if (pathname === '/write')  return editorRefs.write?.getText({ blockSeparator: '\n' }) ?? useEditorStore.getState().content
  if (pathname === '/format') return editorRefs.format?.getText({ blockSeparator: '\n' }) ?? ''
  return ''
}

// ── TipTap doc from plain text (write mode) ───────────────────────────────────

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
  group: string
  action: () => void
  checked?: () => boolean
  value?: () => string
}

const COMMANDS: Cmd[] = [
  // Tools
  {
    id: 'grammar', label: 'Grammar Check', group: 'Tools',
    action: () => { const s = useEditorStore.getState(); s.setGrammarCheck(!s.grammarCheck) },
    checked: () => useEditorStore.getState().grammarCheck,
  },
  {
    id: 'focus', label: 'Focus Mode', group: 'Tools',
    action: () => { const s = useEditorStore.getState(); s.setFocusMode(!s.focusMode) },
    checked: () => useEditorStore.getState().focusMode,
  },
  {
    id: 'wordcount', label: 'Word Count', group: 'Tools',
    action: () => { const s = useEditorStore.getState(); s.setShowWordCount(!s.showWordCount) },
    checked: () => useEditorStore.getState().showWordCount,
  },
  {
    id: 'pos', label: 'POS Highlight', group: 'Tools',
    action: () => { const s = useEditorStore.getState(); s.setPosHighlight(!s.posHighlight) },
    checked: () => useEditorStore.getState().posHighlight,
  },
  // Font
  {
    id: 'font-sans', label: 'Font: Sans', group: 'Font',
    action: () => useEditorStore.getState().setFont('sans'),
    checked: () => useEditorStore.getState().font === 'sans',
  },
  {
    id: 'font-serif', label: 'Font: Serif', group: 'Font',
    action: () => useEditorStore.getState().setFont('serif'),
    checked: () => useEditorStore.getState().font === 'serif',
  },
  {
    id: 'font-mono', label: 'Font: Mono', group: 'Font',
    action: () => useEditorStore.getState().setFont('mono'),
    checked: () => useEditorStore.getState().font === 'mono',
  },
  // Theme
  {
    id: 'theme-light', label: 'Theme: Light', group: 'Theme',
    action: () => useEditorStore.getState().setTheme('light'),
    checked: () => useEditorStore.getState().theme === 'light',
  },
  {
    id: 'theme-dark', label: 'Theme: Dark', group: 'Theme',
    action: () => useEditorStore.getState().setTheme('dark'),
    checked: () => useEditorStore.getState().theme === 'dark',
  },
  {
    id: 'theme-shade', label: 'Theme: Shade', group: 'Theme',
    action: () => useEditorStore.getState().setTheme('shade'),
    checked: () => useEditorStore.getState().theme === 'shade',
  },
  // Export
  {
    id: 'export', label: 'Export / Print', group: 'File',
    action: () => window.dispatchEvent(new CustomEvent('arak:print')),
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandBar() {
  const { isOpen, mode, open, close } = useCommandBarStore()
  const {
    query, setQuery, replaceText, setReplaceText,
    matches, currentMatchIndex, setMatches, goToNext, goToPrev,
    open: openSearch, close: closeSearch,
  } = useSearchStore()

  const pathname = usePathname()
  const inputRef   = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [cmdQuery, setCmdQuery]     = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  // Track state that needs re-render for checked commands
  const [, forceUpdate] = useState(0)

  const isFindMode    = mode === 'find' || mode === 'replace'
  const isReplaceMode = mode === 'replace'
  const isCmdMode     = mode === 'command'

  // ── Open / close searchStore in tandem ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && isFindMode) {
      openSearch(isReplaceMode ? 'replace' : 'search')
    } else {
      closeSearch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  // ── Compute search matches ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isFindMode) return
    setMatches(findMatches(getEditorText(pathname), query))
  }, [isOpen, isFindMode, query, pathname, setMatches])

  // ── Focus input on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const id = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 30)
    return () => clearTimeout(id)
  }, [isOpen])

  // ── Reset command state on mode change ──────────────────────────────────────
  useEffect(() => {
    if (isCmdMode) { setCmdQuery(''); setSelectedIdx(0) }
  }, [mode, isCmdMode])

  // ── Global Esc ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) { e.preventDefault(); close() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  // ── Cmd+K / Cmd+F / Cmd+Shift+F global ─────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && !e.shiftKey && e.key === 'k') { e.preventDefault(); open('command'); return }
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); open('find'); return }
      if (mod && e.shiftKey  && e.key === 'F') { e.preventDefault(); open('replace'); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ── Outside click ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [isOpen, close])

  // ── Filtered commands ───────────────────────────────────────────────────────
  const filteredCmds = useMemo(() => {
    if (!cmdQuery.trim()) return COMMANDS
    const q = cmdQuery.toLowerCase()
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
  }, [cmdQuery])

  useEffect(() => { setSelectedIdx(0) }, [filteredCmds])

  // ── Execute selected command ────────────────────────────────────────────────
  const execCommand = useCallback((cmd: Cmd) => {
    cmd.action()
    forceUpdate((n) => n + 1)
    // For non-toggle commands, close. Toggles stay open for quick changes.
    const isToggle = cmd.checked !== undefined
    if (!isToggle) close()
  }, [close])

  // ── Replace operations ──────────────────────────────────────────────────────
  const handleReplaceOne = useCallback(() => {
    const match = matches[currentMatchIndex]
    if (!match || !replaceText) return

    if (pathname === '/write' && editorRefs.write) {
      const text = editorRefs.write.getText({ blockSeparator: '\n' })
      const { text: newText } = replaceOne(text, match, replaceText)
      editorRefs.write.commands.setContent(plainTextToDoc(newText))
    }
  }, [matches, currentMatchIndex, replaceText, pathname])

  const handleReplaceAll = useCallback(() => {
    if (!query) return

    if (pathname === '/write' && editorRefs.write) {
      const text = editorRefs.write.getText({ blockSeparator: '\n' })
      const newText = replaceAll(text, query, replaceText)
      editorRefs.write.commands.setContent(plainTextToDoc(newText))
    }
  }, [query, replaceText, pathname])

  // ── Keyboard in command mode ────────────────────────────────────────────────
  const handleCmdKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, filteredCmds.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filteredCmds[selectedIdx]
      if (cmd) execCommand(cmd)
    }
  }, [filteredCmds, selectedIdx, execCommand])

  // ── Keyboard in find mode ───────────────────────────────────────────────────
  const handleFindKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.shiftKey ? goToPrev() : goToNext()
    }
  }, [goToNext, goToPrev])

  const matchLabel = !query ? '' : matches.length === 0 ? 'no matches' : `${currentMatchIndex + 1} / ${matches.length}`

  if (!isOpen) return null

  return createPortal(
    <div
      ref={containerRef}
      className="cmdbar-enter"
      style={{
        position: 'fixed',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 520,
        maxWidth: 'calc(100vw - 32px)',
        background: '#1a1a18',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
        overflow: 'hidden',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* ── Main input ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 52 }}>
        {/* Mode label */}
        <span style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.28)',
          marginRight: 10,
          letterSpacing: '0.04em',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          {isCmdMode ? '⌘' : isFindMode && !isReplaceMode ? '↓↑' : '↕'}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={isCmdMode ? cmdQuery : query}
          onChange={(e) => isCmdMode ? setCmdQuery(e.target.value) : setQuery(e.target.value)}
          onKeyDown={isCmdMode ? handleCmdKeyDown : handleFindKeyDown}
          placeholder={
            isCmdMode        ? 'Search commands…' :
            isReplaceMode    ? 'Find…' :
                               'Find in document…'
          }
          spellCheck={false}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 15,
            letterSpacing: '0.01em',
            caretColor: 'rgba(255,255,255,0.7)',
          }}
        />

        {/* Match counter (find mode) */}
        {isFindMode && matchLabel && (
          <span style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.04em',
            flexShrink: 0,
            marginLeft: 10,
          }}>
            {matchLabel}
          </span>
        )}

        {/* Navigation arrows (find mode) */}
        {isFindMode && matches.length > 0 && (
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            {[{ label: '↑', fn: goToPrev }, { label: '↓', fn: goToNext }].map(({ label, fn }) => (
              <button
                key={label}
                onMouseDown={(e) => { e.preventDefault(); fn() }}
                style={{
                  width: 28, height: 28,
                  border: 'none', borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Replace row ── */}
      {isReplaceMode && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, gap: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', flexShrink: 0, userSelect: 'none' }}>→</span>
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
                color: '#fff', fontSize: 15, letterSpacing: '0.01em', caretColor: 'rgba(255,255,255,0.7)',
              }}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); handleReplaceOne() }}
              disabled={matches.length === 0}
              style={replBtnStyle}
            >
              replace
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); handleReplaceAll() }}
              disabled={!query}
              style={replBtnStyle}
            >
              all
            </button>
          </div>
        </>
      )}

      {/* ── Command list ── */}
      {isCmdMode && filteredCmds.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px 0' }}>
            {filteredCmds.map((cmd, i) => {
              const active   = i === selectedIdx
              const isChecked = cmd.checked?.()
              return (
                <div
                  key={cmd.id}
                  onMouseDown={(e) => { e.preventDefault(); execCommand(cmd) }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    height: 38,
                    cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    transition: 'background 80ms',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontSize: 14,
                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    letterSpacing: '0.01em',
                  }}>
                    {cmd.label}
                  </span>
                  {isChecked !== undefined && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isChecked ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)',
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* No results */}
      {isCmdMode && filteredCmds.length === 0 && (
        <div style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
          No commands found
        </div>
      )}
    </div>,
    document.body
  )
}

const replBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  height: 28,
  padding: '0 10px',
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  cursor: 'pointer',
  letterSpacing: '0.02em',
}
