'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { useEditorStore, FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useSearchStore } from '@/store/search'
import { useDocumentsStore } from '@/store/documents'
import { useUIStore } from '@/store/ui'
import { parseParagraphs, getCurrentSegmentIndex } from '@/lib/editor/sentences'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'
import { AnimatedPlaceholder } from './AnimatedPlaceholder'
import nlp from 'compromise'

// POS color map — subtle, readable on all themes
const POS_COLORS: Record<string, string> = {
  Noun:      'var(--pos-noun)',
  Verb:      'var(--pos-verb)',
  Adjective: 'var(--pos-adj)',
  Adverb:    'var(--pos-adv)',
}

function posHighlightContent(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const lines = text.split('\n')
  lines.forEach((line, li) => {
    if (line.trim() === '') {
      parts.push('\n')
      return
    }
    const doc = nlp(line)
    const terms = doc.json({ offset: true }) as Array<{ terms: Array<{ text: string; offset: { start: number; length: number }; tags: string[] }> }>
    const tokens: Array<{ text: string; color?: string }> = []
    let cursor = 0
    terms.forEach((phrase) =>
      phrase.terms.forEach((term) => {
        const start = term.offset.start
        if (start > cursor) tokens.push({ text: line.slice(cursor, start) })
        const tag = (['Noun','Verb','Adjective','Adverb'] as const).find((t) => term.tags.includes(t))
        tokens.push({ text: term.text, color: tag ? POS_COLORS[tag] : undefined })
        cursor = start + term.offset.length
      })
    )
    if (cursor < line.length) tokens.push({ text: line.slice(cursor) })
    tokens.forEach((tok, ti) =>
      parts.push(
        tok.color
          ? <span key={`${li}-${ti}`} style={{ color: tok.color }}>{tok.text}</span>
          : <span key={`${li}-${ti}`}>{tok.text}</span>
      )
    )
    if (li < lines.length - 1) parts.push('\n')
  })
  return <>{parts}</>
}

export function WriteEditor() {
  const { content, focusMode: focusModeStore, posHighlight, showWordCount, font, fontSize, lineHeight, setContent } =
    useEditorStore()
  const menuOpen = useUIStore((s) => s.menuOpen)
  const focusMode = focusModeStore && !menuOpen
  const { title, setTitle, markSaved } = useFilesStore()
  const isEmpty = content.trim() === ''
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

  const fontFamily =
    font === 'serif'
      ? 'var(--font-noto-serif)'
      : font === 'mono'
      ? 'var(--font-noto-mono)'
      : 'var(--font-noto-sans)'

  const fontSizePx  = FONT_SIZE_MAP[fontSize]
  const lineHeightV = LINE_HEIGHT_MAP[lineHeight]

  const textStyle: React.CSSProperties = {
    fontSize: fontSizePx,
    lineHeight: lineHeightV,
    letterSpacing: '0.01em',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    padding: 0,
    margin: 0,
  }

  // ── Bootstrap documents store on first mount ──────────────────────────────
  useEffect(() => {
    const writeDocs = docs.filter((d) => d.mode === 'write')
    if (writeDocs.length === 0) {
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
    if (typeof doc.content === 'string') {
      setContent(doc.content)
      setTitle(doc.title)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWriteId])

  // ── Auto-resize ───────────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [content])

  // ── Scroll to current search match ───────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta || !searchOpen || matches.length === 0) return
    const match = matches[currentMatchIndex]
    if (!match) return
    ta.focus()
    ta.setSelectionRange(match.start, match.end)
    setCursorPos(match.start)
    ta.scrollIntoView({ block: 'center' })
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
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); openSearch('search'); return }
      if (mod && e.shiftKey && e.key === 'f') { e.preventDefault(); openSearch('replace'); return }
      if (searchOpen && mod && e.key === 'g') {
        e.preventDefault()
        e.shiftKey ? goToPrev() : goToNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, handleOpen, openSearch, searchOpen, goToNext, goToPrev])

  // ── Tab key: insert 2 spaces ──────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const ta = e.currentTarget
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const next = content.slice(0, start) + '  ' + content.slice(end)
        setContent(next)
        if (activeWriteId) updateDoc(activeWriteId, { content: next })
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2
          ta.selectionEnd = start + 2
        })
      }
    },
    [content, setContent, activeWriteId, updateDoc]
  )

  // ── Editor event handlers ─────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setContent(val)
      setCursorPos(e.target.selectionStart)
      if (activeWriteId) updateDoc(activeWriteId, { content: val })
    },
    [setContent, activeWriteId, updateDoc]
  )

  const handleKeyUp = useCallback(() => {
    setCursorPos(textareaRef.current?.selectionStart ?? 0)
  }, [])

  const handlePointerUp = useCallback(() => {
    setCursorPos(textareaRef.current?.selectionStart ?? 0)
  }, [])

  // ── Mirror content ────────────────────────────────────────────────────────
  const paragraphs = useMemo(() => parseParagraphs(content), [content])
  const currentParaIdx = useMemo(
    () => getCurrentSegmentIndex(paragraphs, cursorPos),
    [paragraphs, cursorPos]
  )

  const wordCount = useMemo(() => {
    if (!content.trim()) return 0
    return content.trim().split(/\s+/).filter(Boolean).length
  }, [content])

  const charCount = content.length

  const minRead = Math.max(1, Math.round(wordCount / 238))

  const mirrorContent = useMemo(() => {
    // Search mode: render with match highlights
    if (searchOpen && matches.length > 0) {
      const parts: React.ReactNode[] = []
      let lastEnd = 0
      matches.forEach((match, i) => {
        if (lastEnd < match.start) {
          parts.push(<span key={`t-${lastEnd}`}>{content.slice(lastEnd, match.start)}</span>)
        }
        parts.push(
          <span
            key={`m-${match.start}`}
            style={{
              background: i === currentMatchIndex
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

    // Combined: focus dimming + POS coloring
    if (focusMode && posHighlight && content) {
      if (paragraphs.length === 0) return posHighlightContent(content)
      return (
        <>
          {paragraphs.map((seg, i) => {
            const trailingNL = seg.text.endsWith('\n')
            const lineText = trailingNL ? seg.text.slice(0, -1) : seg.text
            return (
              <span
                key={seg.start}
                style={{
                  opacity: i === currentParaIdx ? 1 : 0.3,
                  transition: 'opacity 180ms ease-in-out',
                }}
              >
                {lineText ? posHighlightContent(lineText) : null}
                {trailingNL ? '\n' : null}
              </span>
            )
          })}
        </>
      )
    }

    // POS highlight only
    if (posHighlight && content) {
      return posHighlightContent(content)
    }

    // Focus mode only: paragraph dimming
    if (focusMode) {
      if (!content) return null
      if (paragraphs.length === 0) return <span>{content}</span>
      return (
        <>
          {paragraphs.map((seg, i) => (
            <span
              key={seg.start}
              style={{
                opacity: i === currentParaIdx ? 1 : 0.3,
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
    searchOpen, matches, currentMatchIndex,
    posHighlight, focusMode, content, paragraphs, currentParaIdx,
  ])

  const showMirror = searchOpen || focusMode || posHighlight

  return (
    <div
      key={activeWriteId ?? 'write'}
      className="content-enter write-editor-container"
      style={{
        maxWidth: '65ch',
        fontSize: fontSizePx,
        margin: '0 auto',
        padding: '18vh 2rem 12rem',
      }}
    >
      {/* ── Word count ── */}
      {showWordCount && (
        <WordCount words={wordCount} chars={charCount} minRead={minRead} />
      )}

      {/* ── Editor area ── */}
      <div style={{ position: 'relative' }}>
        {/* Animated placeholder */}
        {isEmpty && (
          <AnimatedPlaceholder
            fontFamily={fontFamily}
            fontSize={fontSizePx}
            lineHeight={lineHeightV}
          />
        )}

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
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPointerUp={handlePointerUp}
          autoFocus
          spellCheck
          placeholder=""
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
            color: showMirror ? 'transparent' : 'var(--fg)',
            caretColor: isEmpty ? 'transparent' : 'var(--fg)',
          }}
        />
      </div>
    </div>
  )
}

function WordCount({ words, chars, minRead }: { words: number; chars: number; minRead: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        textAlign: 'left',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '12px',
        lineHeight: 1.7,
        letterSpacing: '0.02em',
        color: hovered ? 'var(--fg)' : 'var(--muted)',
        opacity: hovered ? 0.7 : 0.35,
        transition: 'color 150ms, opacity 150ms',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      <div>{words} {words === 1 ? 'word' : 'words'}</div>
      <div>{chars} {chars === 1 ? 'character' : 'characters'}</div>
      <div>{minRead} min read</div>
    </div>
  )
}
