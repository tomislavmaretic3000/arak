'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useSearchStore } from '@/store/search'
import { useDocumentsStore } from '@/store/documents'
import { getCaretY } from '@/lib/editor/caret'
import { parseSentences, getCurrentSegmentIndex } from '@/lib/editor/sentences'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'

const FONT_SIZE = '18px'
const LINE_HEIGHT = '1.75'

const textStyle: React.CSSProperties = {
  fontSize: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  padding: 0,
  margin: 0,
}

export function WriteEditor() {
  const { content, focusMode, typewriterMode, font, setContent } =
    useEditorStore()
  const { title, setTitle, markSaved } = useFilesStore()
  const {
    isOpen: searchOpen,
    matches,
    currentMatchIndex,
    open: openSearch,
    goToNext,
    goToPrev,
  } = useSearchStore()

  const { docs, activeWriteId, createDoc, updateDoc, setActiveWrite } =
    useDocumentsStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPos, setCursorPos] = useState(0)
  const rafRef = useRef<number>(0)

  // ── Bootstrap documents store on first mount ──────────────────────────────
  useEffect(() => {
    const writeDocs = docs.filter((d) => d.mode === 'write')
    if (writeDocs.length === 0) {
      // Migrate existing content from legacy stores
      const existing = useEditorStore.getState()
      const filesMeta = useFilesStore.getState()
      const doc = createDoc('write', filesMeta.title || 'untitled')
      updateDoc(doc.id, { content: existing.content || '' })
    } else if (!activeWriteId || !docs.find((d) => d.id === activeWriteId)) {
      setActiveWrite(writeDocs[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load active doc into editor when it changes ───────────────────────────
  useEffect(() => {
    if (!activeWriteId) return
    const doc = docs.find((d) => d.id === activeWriteId)
    if (!doc) return
    const editorContent = useEditorStore.getState().content
    // Only load if the doc's content differs (i.e. user switched docs)
    if (typeof doc.content === 'string' && doc.content !== editorContent) {
      setContent(doc.content)
      setTitle(doc.title)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWriteId])

  const fontFamily =
    font === 'serif'
      ? 'var(--font-noto-serif)'
      : font === 'mono'
      ? 'var(--font-noto-mono)'
      : 'var(--font-noto-sans)'

  // ── Auto-resize ───────────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [content])

  // ── Typewriter scroll ─────────────────────────────────────────────────────
  const scrollToTypewriter = useCallback(() => {
    const ta = textareaRef.current
    if (!ta || !typewriterMode) return
    const caretY = getCaretY(ta, ta.selectionStart)
    const taRect = ta.getBoundingClientRect()
    const absoluteCaretY = taRect.top + window.scrollY + caretY
    window.scrollTo({
      top: Math.max(0, absoluteCaretY - window.innerHeight * 0.42),
      behavior: 'smooth',
    })
  }, [typewriterMode])

  const scheduleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(scrollToTypewriter)
  }, [scrollToTypewriter])

  // ── Scroll to current search match ───────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta || !searchOpen || matches.length === 0) return
    const match = matches[currentMatchIndex]
    if (!match) return

    // Set textarea selection to highlight the match
    ta.focus()
    ta.setSelectionRange(match.start, match.end)
    setCursorPos(match.start)

    // Scroll match into view
    const caretY = getCaretY(ta, match.start)
    const taRect = ta.getBoundingClientRect()
    const absoluteY = taRect.top + window.scrollY + caretY
    window.scrollTo({
      top: Math.max(0, absoluteY - window.innerHeight * 0.42),
      behavior: 'smooth',
    })
  }, [currentMatchIndex, matches, searchOpen])

  // ── File operations ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const filename = (title || 'untitled').trim() + '.txt'
    const saved = await saveToFile(content, filename)
    if (saved) markSaved()
  }, [content, title, markSaved])

  const handleOpen = useCallback(async () => {
    const result = await loadFromFile()
    if (!result) return
    setContent(result.content)
    setTitle(result.name)
    markSaved()
  }, [setContent, setTitle, markSaved])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') { e.preventDefault(); handleSave(); return }
      if (mod && e.key === 'o') { e.preventDefault(); handleOpen(); return }
      if (mod && !e.shiftKey && e.key === 'f') {
        e.preventDefault()
        openSearch('search')
        return
      }
      if (mod && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        openSearch('replace')
        return
      }
      // Navigate matches with Cmd+G / Cmd+Shift+G while search is open
      if (searchOpen && mod && e.key === 'g') {
        e.preventDefault()
        e.shiftKey ? goToPrev() : goToNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, handleOpen, openSearch, searchOpen, goToNext, goToPrev])

  // ── Editor event handlers ─────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setContent(val)
      setCursorPos(e.target.selectionStart)
      scheduleScroll()
      // Persist to documents store
      if (activeWriteId) updateDoc(activeWriteId, { content: val })
    },
    [setContent, scheduleScroll, activeWriteId, updateDoc]
  )

  const handleKeyUp = useCallback(() => {
    const pos = textareaRef.current?.selectionStart ?? 0
    setCursorPos(pos)
    scheduleScroll()
  }, [scheduleScroll])

  const handlePointerUp = useCallback(() => {
    setCursorPos(textareaRef.current?.selectionStart ?? 0)
  }, [])

  // ── Mirror content ────────────────────────────────────────────────────────
  const sentences = useMemo(() => parseSentences(content), [content])
  const currentSentenceIdx = useMemo(
    () => getCurrentSegmentIndex(sentences, cursorPos),
    [sentences, cursorPos]
  )

  const mirrorContent = useMemo(() => {
    // Search mode: render with match highlights (suspends focus dimming)
    if (searchOpen && matches.length > 0) {
      const parts: React.ReactNode[] = []
      let lastEnd = 0

      matches.forEach((match, i) => {
        if (lastEnd < match.start) {
          parts.push(
            <span key={`t-${lastEnd}`}>{content.slice(lastEnd, match.start)}</span>
          )
        }
        parts.push(
          <span
            key={`m-${match.start}`}
            style={{
              background:
                i === currentMatchIndex
                  ? 'rgba(220, 160, 40, 0.45)'
                  : 'rgba(220, 160, 40, 0.18)',
              borderRadius: '2px',
              transition: 'background 150ms ease-in-out',
            }}
          >
            {content.slice(match.start, match.end)}
          </span>
        )
        lastEnd = match.end
      })

      if (lastEnd < content.length) {
        parts.push(<span key={`t-${lastEnd}`}>{content.slice(lastEnd)}</span>)
      }

      return <>{parts}</>
    }

    // Focus mode: sentence dimming
    if (focusMode) {
      if (!content) {
        return (
          <span style={{ color: 'var(--muted)', opacity: 0.5 }}>
            start writing...
          </span>
        )
      }
      if (sentences.length === 0) return <span>{content}</span>
      return (
        <>
          {sentences.map((seg, i) => (
            <span
              key={seg.start}
              style={{
                opacity: i === currentSentenceIdx ? 1 : 0.2,
                transition: 'opacity 180ms ease-in-out',
              }}
            >
              {seg.text}
            </span>
          ))}
        </>
      )
    }

    return null
  }, [
    searchOpen,
    matches,
    currentMatchIndex,
    focusMode,
    content,
    sentences,
    currentSentenceIdx,
  ])

  const showMirror = searchOpen || focusMode

  return (
    <div
      style={{
        maxWidth: '65ch',
        margin: '0 auto',
        padding: '18vh 2rem 45vh',
      }}
    >
      {/* ── Document title ── */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          if (activeWriteId) updateDoc(activeWriteId, { title: e.target.value })
        }}
        placeholder="untitled"
        style={{
          display: 'block',
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily,
          fontSize: '13px',
          letterSpacing: '0.04em',
          color: 'var(--muted)',
          opacity: 0.6,
          marginBottom: '3rem',
          padding: 0,
          textTransform: 'lowercase',
        }}
      />

      {/* ── Editor area ── */}
      <div style={{ position: 'relative' }}>
        {/* Mirror layer */}
        {showMirror && (
          <div
            aria-hidden="true"
            style={{
              ...textStyle,
              fontFamily,
              position: 'absolute',
              inset: 0,
              color: 'var(--fg)',
              pointerEvents: 'none',
              userSelect: 'none',
              overflow: 'hidden',
            }}
          >
            {mirrorContent}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          onPointerUp={handlePointerUp}
          autoFocus
          spellCheck
          placeholder={showMirror ? '' : 'start writing...'}
          style={{
            ...textStyle,
            fontFamily,
            display: 'block',
            width: '100%',
            minHeight: '60vh',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            // Hide text behind mirror when mirror is active
            color: showMirror ? 'transparent' : 'var(--fg)',
            caretColor: 'var(--fg)',
          }}
        />
      </div>
    </div>
  )
}
