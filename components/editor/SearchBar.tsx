'use client'

import { useEffect, useRef } from 'react'
import { useSearchStore } from '@/store/search'
import { useEditorStore } from '@/store/editor'
import { findMatches, replaceOne, replaceAll } from '@/lib/editor/search'

export function SearchBar() {
  const {
    isOpen,
    mode,
    query,
    replaceText,
    matches,
    currentMatchIndex,
    close,
    setQuery,
    setReplaceText,
    setMatches,
    goToNext,
    goToPrev,
  } = useSearchStore()

  const { content, setContent } = useEditorStore()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // Recompute matches whenever query or content changes
  useEffect(() => {
    setMatches(findMatches(content, query))
  }, [query, content, setMatches])

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [isOpen])

  // Escape closes the panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  const handleReplaceOne = () => {
    const match = matches[currentMatchIndex]
    if (!match) return
    const { text } = replaceOne(content, match, replaceText)
    setContent(text)
  }

  const handleReplaceAll = () => {
    if (!query) return
    setContent(replaceAll(content, query, replaceText))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.shiftKey ? goToPrev() : goToNext()
    }
  }

  const matchLabel =
    matches.length === 0
      ? query ? 'no matches' : ''
      : `${currentMatchIndex + 1} / ${matches.length}`

  return (
    <div
      role="search"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1.5rem',
        zIndex: 50,
        transform: isOpen ? 'translateY(0)' : 'translateY(calc(-100% - 1.5rem))',
        transition: 'transform 180ms ease-in-out',
        pointerEvents: isOpen ? 'auto' : 'none',
        background: 'var(--bg)',
        border: '1px solid var(--subtle)',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '280px',
        fontFamily: 'var(--font-noto-sans)',
      }}
    >
      {/* ── Search row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="search..."
          aria-label="Search"
          style={inputStyle}
        />

        {/* Match counter */}
        <span
          style={{
            fontSize: '11px',
            color: 'var(--muted)',
            minWidth: '48px',
            textAlign: 'right',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {matchLabel}
        </span>

        {/* Prev */}
        <button
          onClick={goToPrev}
          disabled={matches.length === 0}
          aria-label="Previous match"
          style={navButtonStyle}
        >
          ↑
        </button>

        {/* Next */}
        <button
          onClick={goToNext}
          disabled={matches.length === 0}
          aria-label="Next match"
          style={navButtonStyle}
        >
          ↓
        </button>

        {/* Close */}
        <button
          onClick={close}
          aria-label="Close search"
          style={{ ...navButtonStyle, marginLeft: '2px', opacity: 0.5 }}
        >
          ×
        </button>
      </div>

      {/* ── Replace row ── */}
      {mode === 'replace' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={replaceInputRef}
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReplaceOne()}
            placeholder="replace with..."
            aria-label="Replace with"
            style={inputStyle}
          />
          <button
            onClick={handleReplaceOne}
            disabled={matches.length === 0}
            style={actionButtonStyle}
          >
            replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            style={actionButtonStyle}
          >
            all
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared inline styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--surface)',
  border: '1px solid var(--subtle)',
  borderRadius: '5px',
  padding: '5px 8px',
  fontSize: '13px',
  color: 'var(--fg)',
  fontFamily: 'var(--font-noto-sans)',
  outline: 'none',
  minWidth: 0,
}

const navButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--muted)',
  fontSize: '14px',
  padding: '2px 4px',
  borderRadius: '4px',
  lineHeight: 1,
  flexShrink: 0,
}

const actionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--subtle)',
  borderRadius: '5px',
  cursor: 'pointer',
  color: 'var(--muted)',
  fontSize: '11px',
  padding: '4px 8px',
  fontFamily: 'var(--font-noto-sans)',
  letterSpacing: '0.02em',
  flexShrink: 0,
}
