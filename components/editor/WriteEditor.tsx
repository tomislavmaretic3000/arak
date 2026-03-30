'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPos, setCursorPos] = useState(0)
  const rafRef = useRef<number>(0)

  const fontFamily =
    font === 'serif'
      ? 'var(--font-noto-serif)'
      : font === 'mono'
      ? 'var(--font-noto-mono)'
      : 'var(--font-noto-sans)'

  // ── Auto-resize textarea ──────────────────────────────────────────────────
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
    const target = absoluteCaretY - window.innerHeight * 0.42

    window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [typewriterMode])

  const scheduleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(scrollToTypewriter)
  }, [scrollToTypewriter])

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
      if (mod && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (mod && e.key === 'o') {
        e.preventDefault()
        handleOpen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, handleOpen])

  // ── Editor event handlers ─────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
      setCursorPos(e.target.selectionStart)
      scheduleScroll()
    },
    [setContent, scheduleScroll]
  )

  const handleKeyUp = useCallback(() => {
    const pos = textareaRef.current?.selectionStart ?? 0
    setCursorPos(pos)
    scheduleScroll()
  }, [scheduleScroll])

  const handlePointerUp = useCallback(() => {
    setCursorPos(textareaRef.current?.selectionStart ?? 0)
  }, [])

  // ── Focus-mode mirror content ─────────────────────────────────────────────
  const segments = useMemo(() => parseSentences(content), [content])
  const currentIdx = useMemo(
    () => getCurrentSegmentIndex(segments, cursorPos),
    [segments, cursorPos]
  )

  const mirrorContent = useMemo(() => {
    if (!focusMode) return null

    if (!content) {
      return (
        <span style={{ color: 'var(--muted)', opacity: 0.5 }}>
          start writing...
        </span>
      )
    }

    if (segments.length === 0) return <span>{content}</span>

    return (
      <>
        {segments.map((seg, i) => (
          <span
            key={seg.start}
            style={{
              opacity: i === currentIdx ? 1 : 0.2,
              transition: 'opacity 180ms ease-in-out',
            }}
          >
            {seg.text}
          </span>
        ))}
      </>
    )
  }, [content, focusMode, segments, currentIdx])

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
        onChange={(e) => setTitle(e.target.value)}
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
        {focusMode && (
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
          placeholder={focusMode ? '' : 'start writing...'}
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
            color: focusMode ? 'transparent' : 'var(--fg)',
            caretColor: 'var(--fg)',
          }}
        />
      </div>
    </div>
  )
}
