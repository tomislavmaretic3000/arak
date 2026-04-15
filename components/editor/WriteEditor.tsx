'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState } from '@tiptap/pm/state'
import { useEditorStore, FONT_SIZE_MAP, SPACING_MAP } from '@/store/editor'
import { useFilesStore } from '@/store/files'
import { useSearchStore } from '@/store/search'
import { useDocumentsStore } from '@/store/documents'
import { useUIStore } from '@/store/ui'
import { createDebouncedChecker, type LTMatch } from '@/lib/editor/languageTool'
import { GrammarPopover } from './GrammarPopover'
import { AnimatedPlaceholder } from './AnimatedPlaceholder'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'
import nlp from 'compromise'

// ── POS colors ────────────────────────────────────────────────────────────────
const POS_COLORS: Record<string, string> = {
  Noun:      'var(--pos-noun)',
  Verb:      'var(--pos-verb)',
  Adjective: 'var(--pos-adj)',
  Adverb:    'var(--pos-adv)',
}

// ── Content conversion ────────────────────────────────────────────────────────

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

// ── Position maps ─────────────────────────────────────────────────────────────

// Grammar posMap: doc.textContent index → PM position (no separator entries)
function buildGrammarPosMap(state: EditorState): number[] {
  const map: number[] = []
  state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    const start = offset + 1
    for (let i = 0; i < node.textContent.length; i++) map.push(start + i)
  })
  return map
}

// Search posMap: getText({ blockSeparator: '\n' }) index → PM position
// null entries represent the '\n' separator characters between blocks
function buildSearchPosMap(state: EditorState): Array<number | null> {
  const map: Array<number | null> = []
  let first = true
  state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    if (!first) map.push(null) // the '\n' separator char
    first = false
    const start = offset + 1
    for (let i = 0; i < node.textContent.length; i++) map.push(start + i)
  })
  return map
}

// ── WriteEditor ───────────────────────────────────────────────────────────────

export function WriteEditor() {
  const {
    content, focusMode: focusModeStore, posHighlight, showWordCount,
    grammarCheck, font, fontSize, spacing, setContent,
  } = useEditorStore()
  const menuOpen  = useUIStore((s) => s.menuOpen)
  const focusMode = focusModeStore && !menuOpen
  const { title, setTitle, markSaved }  = useFilesStore()
  const { isOpen: searchOpen, matches, currentMatchIndex, open: openSearch, goToNext, goToPrev } = useSearchStore()
  const { docs, activeWriteId, createDoc, updateDoc, setActiveWrite } = useDocumentsStore()

  // ── Refs so plugins never read stale values ───────────────────────────────
  const focusModeRef    = useRef(focusMode)
  const posHighlightRef = useRef(posHighlight)
  const grammarCheckRef = useRef(grammarCheck)
  useEffect(() => { focusModeRef.current    = focusMode    }, [focusMode])
  useEffect(() => { posHighlightRef.current = posHighlight }, [posHighlight])
  useEffect(() => { grammarCheckRef.current = grammarCheck }, [grammarCheck])

  // ── Grammar state ─────────────────────────────────────────────────────────
  const [ltMatches, setLtMatches] = useState<LTMatch[]>([])
  const ltMatchesRef   = useRef<LTMatch[]>([])
  const debouncedCheck = useRef(createDebouncedChecker(1800))

  // ── Stable plugin keys ────────────────────────────────────────────────────
  const grammarKey = useMemo(() => new PluginKey<DecorationSet>('writeGrammar'), [])
  const searchKey  = useMemo(() => new PluginKey<DecorationSet>('writeSearch'),  [])
  const focusKey   = useMemo(() => new PluginKey('writeFocus'),   [])
  const posKey     = useMemo(() => new PluginKey('writePos'),     [])

  // ── Font / spacing ────────────────────────────────────────────────────────
  const fontFamily =
    font === 'serif' ? 'var(--font-noto-serif)'
    : font === 'mono' ? 'var(--font-noto-mono)'
    : 'var(--font-noto-sans)'
  const fontSizePx = FONT_SIZE_MAP[fontSize]
  const { lineHeight, letterSpacing, wordSpacing } = SPACING_MAP[spacing]

  const editorStyle = useMemo(() => [
    `font-family: ${fontFamily}`,
    `font-size: ${fontSizePx}`,
    `line-height: ${lineHeight}`,
    `letter-spacing: ${letterSpacing}`,
    `word-spacing: ${wordSpacing}`,
    'outline: none',
    'color: var(--fg)',
  ].join(';'), [fontFamily, fontSizePx, lineHeight, letterSpacing, wordSpacing])

  // ── Extensions (created once) ─────────────────────────────────────────────
  const extensions = useMemo(() => {
    // Capture refs/keys by value — all are stable references
    const _grammarKey     = grammarKey
    const _searchKey      = searchKey
    const _focusKey       = focusKey
    const _posKey         = posKey
    const _grammarCheckRef = grammarCheckRef
    const _debouncedCheck  = debouncedCheck
    const _ltMatchesRef    = ltMatchesRef
    const _setLtMatches    = setLtMatches
    const _focusModeRef    = focusModeRef
    const _posHighlightRef = posHighlightRef

    return [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false,
        blockquote: false, code: false, codeBlock: false, horizontalRule: false,
      }),

      // Tab → 2 spaces
      Extension.create({
        name: 'tabInsert',
        addKeyboardShortcuts() {
          return { Tab: () => { this.editor.commands.insertContent('  '); return true } }
        },
      }),

      // ── Grammar underlines ───────────────────────────────────────────────
      Extension.create({
        name: 'writeGrammar',
        addProseMirrorPlugins: () => [new Plugin({
          key: _grammarKey,
          state: {
            init: () => DecorationSet.empty,
            apply(tr, set) {
              const next = tr.getMeta(_grammarKey)
              if (next !== undefined) return next as DecorationSet
              return set.map(tr.mapping, tr.doc)
            },
          },
          props: { decorations: (s) => _grammarKey.getState(s) ?? DecorationSet.empty },
          view(view) {
            function run() {
              if (!_grammarCheckRef.current) {
                view.dispatch(view.state.tr.setMeta(_grammarKey, DecorationSet.empty))
                _ltMatchesRef.current = []; _setLtMatches([]); return
              }
              _debouncedCheck.current(view.state.doc.textContent, (ms) => {
                const posMap = buildGrammarPosMap(view.state)
                const decos: Decoration[] = []
                for (const m of ms) {
                  const end = m.offset + m.length
                  if (m.offset >= posMap.length || end > posMap.length) continue
                  decos.push(Decoration.inline(posMap[m.offset], posMap[end - 1] + 1, { class: `lt-${m.category}` }))
                }
                view.dispatch(view.state.tr.setMeta(_grammarKey, DecorationSet.create(view.state.doc, decos)))
                _ltMatchesRef.current = ms; _setLtMatches(ms)
              })
            }
            run()
            return { update(v, prev) { if (!v.state.doc.eq(prev.doc)) run() } }
          },
        })],
      }),

      // ── Search highlights ────────────────────────────────────────────────
      Extension.create({
        name: 'writeSearch',
        addProseMirrorPlugins: () => [new Plugin({
          key: _searchKey,
          state: {
            init: () => DecorationSet.empty,
            apply(tr, set) {
              const next = tr.getMeta(_searchKey)
              if (next !== undefined) return next as DecorationSet
              return set.map(tr.mapping, tr.doc)
            },
          },
          props: { decorations: (s) => _searchKey.getState(s) ?? DecorationSet.empty },
        })],
      }),

      // ── Focus mode: dim non-active paragraphs ────────────────────────────
      Extension.create({
        name: 'writeFocus',
        addProseMirrorPlugins: () => [new Plugin({
          key: _focusKey,
          props: {
            decorations(state) {
              if (!_focusModeRef.current) return DecorationSet.empty
              const { from } = state.selection
              const decos: Decoration[] = []
              state.doc.forEach((node, offset) => {
                if (!node.isBlock) return
                const active = from > offset && from < offset + node.nodeSize
                if (!active) decos.push(Decoration.node(offset, offset + node.nodeSize, {
                  style: 'opacity: 0.3; transition: opacity 180ms ease-in-out;',
                }))
              })
              return DecorationSet.create(state.doc, decos)
            },
          },
        })],
      }),

      // ── POS highlighting ─────────────────────────────────────────────────
      Extension.create({
        name: 'writePosHighlight',
        addProseMirrorPlugins: () => [new Plugin({
          key: _posKey,
          props: {
            decorations(state) {
              if (!_posHighlightRef.current) return DecorationSet.empty
              const decos: Decoration[] = []
              state.doc.forEach((node, offset) => {
                if (!node.isTextblock || !node.textContent) return
                const pmStart = offset + 1
                const terms = (nlp(node.textContent).json({ offset: true }) as Array<{
                  terms: Array<{ offset: { start: number; length: number }; tags: string[] }>
                }>)
                terms.forEach((phrase) => phrase.terms.forEach((term) => {
                  const tag = (['Noun', 'Verb', 'Adjective', 'Adverb'] as const).find((t) => term.tags.includes(t))
                  if (!tag) return
                  decos.push(Decoration.inline(
                    pmStart + term.offset.start,
                    pmStart + term.offset.start + term.offset.length,
                    { style: `color: ${POS_COLORS[tag]}` }
                  ))
                }))
              })
              return DecorationSet.create(state.doc, decos)
            },
          },
        })],
      }),
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Editor ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions,
    content: content ? plainTextToDoc(content) : undefined,
    autofocus: true,
    onUpdate: ({ editor }) => {
      const text = editor.getText({ blockSeparator: '\n' })
      setContent(text)
      const { activeWriteId, updateDoc } = useDocumentsStore.getState()
      if (activeWriteId) updateDoc(activeWriteId, { content: text })
    },
    editorProps: { attributes: { style: editorStyle } },
  })

  // ── Word count ────────────────────────────────────────────────────────────
  const wordCount = useMemo(() =>
    content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0,
    [content]
  )
  const charCount = content.length
  const minRead   = Math.max(1, Math.round(wordCount / 238))

  // ── Sync typography when settings change ──────────────────────────────────
  useEffect(() => {
    editor?.view.dom.setAttribute('style', editorStyle)
  }, [editor, editorStyle])

  // ── Bootstrap documents ───────────────────────────────────────────────────
  useEffect(() => {
    const writeDocs = docs.filter((d) => d.mode === 'write')
    if (writeDocs.length === 0) {
      const doc = createDoc('write', useFilesStore.getState().title || 'untitled')
      updateDoc(doc.id, { content: useEditorStore.getState().content || '' })
    } else if (!activeWriteId || !docs.find((d) => d.id === activeWriteId)) {
      setActiveWrite(writeDocs[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load active doc ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWriteId || !editor) return
    const doc = docs.find((d) => d.id === activeWriteId)
    if (!doc || typeof doc.content !== 'string') return
    setContent(doc.content)
    setTitle(doc.title)
    editor.commands.setContent(plainTextToDoc(doc.content))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWriteId])

  // ── Grammar: clear when toggled off ──────────────────────────────────────
  useEffect(() => {
    if (!grammarCheck) { setLtMatches([]); ltMatchesRef.current = [] }
  }, [grammarCheck])

  // ── Search: apply decorations ─────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    if (!searchOpen || matches.length === 0) {
      editor.view.dispatch(editor.state.tr.setMeta(searchKey, DecorationSet.empty))
      return
    }
    const posMap = buildSearchPosMap(editor.state)
    const decos: Decoration[] = []
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      let from: number | null = null
      for (let j = m.start; j < m.end && j < posMap.length; j++) {
        if (posMap[j] !== null) { from = posMap[j]!; break }
      }
      let to: number | null = null
      for (let j = Math.min(m.end - 1, posMap.length - 1); j >= m.start; j--) {
        if (posMap[j] !== null) { to = posMap[j]! + 1; break }
      }
      if (from === null || to === null || from >= to) continue
      decos.push(Decoration.inline(from, to, {
        style: i === currentMatchIndex
          ? 'background: rgba(220,160,40,0.45); border-radius: 2px; transition: background 150ms;'
          : 'background: rgba(220,160,40,0.18); border-radius: 2px; transition: background 150ms;',
      }))
    }
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, DecorationSet.create(editor.state.doc, decos)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, searchOpen, matches, currentMatchIndex])

  // ── Search: scroll to current match ──────────────────────────────────────
  useEffect(() => {
    if (!editor || !searchOpen || !matches.length) return
    const m = matches[currentMatchIndex]
    if (!m) return
    const posMap = buildSearchPosMap(editor.state)
    for (let j = m.start; j < m.end && j < posMap.length; j++) {
      if (posMap[j] !== null) {
        editor.commands.setTextSelection(posMap[j]!)
        editor.commands.scrollIntoView()
        break
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, currentMatchIndex, searchOpen])

  // ── File operations ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editor) return
    const saved = await saveToFile(
      editor.getText({ blockSeparator: '\n' }),
      (title || 'untitled').trim() + '.txt'
    )
    if (saved) markSaved()
  }, [editor, title, markSaved])

  const handleOpen = useCallback(async () => {
    const result = await loadFromFile()
    if (!result || !editor) return
    editor.commands.setContent(plainTextToDoc(result.content))
    setContent(result.content)
    setTitle(result.name)
    markSaved()
  }, [editor, setContent, setTitle, markSaved])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') { e.preventDefault(); handleSave(); return }
      if (mod && e.key === 'o') { e.preventDefault(); handleOpen(); return }
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); openSearch('search'); return }
      if (mod && e.shiftKey  && e.key === 'f') { e.preventDefault(); openSearch('replace'); return }
      if (searchOpen && mod  && e.key === 'g') {
        e.preventDefault(); e.shiftKey ? goToPrev() : goToNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, handleOpen, openSearch, searchOpen, goToNext, goToPrev])

  if (!editor) return null

  return (
    <div
      className="content-enter write-editor-container"
      style={{ maxWidth: '65ch', fontSize: fontSizePx, margin: '0 auto', padding: '18vh 2rem 12rem' }}
    >
      {showWordCount && <WordCount words={wordCount} chars={charCount} minRead={minRead} />}

      <div style={{ position: 'relative' }}>
        {editor.isEmpty && (
          <AnimatedPlaceholder fontFamily={fontFamily} fontSize={fontSizePx} lineHeight={String(lineHeight)} />
        )}
        <EditorContent editor={editor} />
      </div>

      {grammarCheck && <GrammarPopover editor={editor} matches={ltMatches} />}
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
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '12px',
        lineHeight: 1.7,
        letterSpacing: '0.02em',
        color: hovered ? 'var(--fg)' : 'var(--muted)',
        opacity: hovered ? 0.7 : 0.35,
        transition: 'color 150ms, opacity 150ms',
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
