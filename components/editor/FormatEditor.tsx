'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Typography } from '@tiptap/extension-typography'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Extension, type Range } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { useFormatStore, PAPER_SIZES } from '@/store/format'
import { useEditorStore } from '@/store/editor'
import { createDebouncedChecker, type LTMatch } from '@/lib/editor/languageTool'
import { useDocumentsStore } from '@/store/documents'
import { editorRefs } from '@/store/editorRefs'
import { SLASH_COMMANDS, type SlashCommandItem } from '@/lib/editor/slashCommands'
import { PageBreak } from '@/lib/editor/pageBreak'
import { Divider } from '@/lib/editor/divider'
import { FormatToolbar } from './FormatToolbar'
import { TableToolbar } from './TableToolbar'
import { MarginEditor } from './MarginEditor'
import { PageOverlay } from './PageOverlay'
import { PrintPreview } from './PrintPreview'
import { GrammarPopover } from './GrammarPopover'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'

// ── Slash menu icons ──────────────────────────────────────────────────────────

import {
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  Quote,
  List as ListIcon,
  Check,
  X,
} from 'lucide-react'

const SLASH_ICON = { size: 18, strokeWidth: 1.5 }

function SlashIcon({ title }: { title: string }) {
  if (title === 'Table')   return <TableIcon {...SLASH_ICON} />
  if (title === 'Image')   return <ImageIcon {...SLASH_ICON} />
  if (title === 'Link')    return <LinkIcon  {...SLASH_ICON} />
  if (title === 'Divider') return <Minus     {...SLASH_ICON} />
  if (title === 'Quote')   return <Quote     {...SLASH_ICON} />
  if (title === 'List')    return <ListIcon  {...SLASH_ICON} />
  return null
}

function SlashBtn({ icon, title, onClick, active }: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
        border: 'none', borderRadius: '50%', cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        transition: 'background 100ms, color 100ms', padding: 0, flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {icon}
    </button>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlashMenuState {
  items: SlashCommandItem[]
  selectedIdx: number
  command: (item: SlashCommandItem) => void
  rect: DOMRect
  editor: Editor
  range: Range
}

type SlashInputMode = { type: 'link' | 'image'; range: Range; editor: Editor } | null

interface SlashHandlers {
  onStart: (props: SuggestionProps<SlashCommandItem>) => void
  onUpdate: (props: SuggestionProps<SlashCommandItem>) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
  onExit: () => void
}

// ── FormatEditor ──────────────────────────────────────────────────────────────

export function FormatEditor() {
  const { content, title, setContent, setTitle, markSaved, markDirty,
    marginTop, marginRight, marginBottom, marginLeft,
    paperFormat } = useFormatStore()
  const font = useEditorStore((s) => s.font)
  const fontSize = useEditorStore((s) => s.fontSize)
  const grammarCheck = useEditorStore((s) => s.grammarCheck)
  const { docs, activeFormatId, createDoc, updateDoc } = useDocumentsStore()

  // Bootstrap format doc on first mount
  useEffect(() => {
    const formatDocs = docs.filter((d) => d.mode === 'format')
    if (formatDocs.length === 0) {
      const doc = createDoc('format', title || 'untitled')
      if (content) updateDoc(doc.id, { content })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load active doc into editor when selection changes
  useEffect(() => {
    if (!activeFormatId) return
    const doc = docs.find((d) => d.id === activeFormatId)
    if (!doc) return
    setContent(doc.content as Record<string, unknown>)
    setTitle(doc.title)
    editorRef.current?.commands.setContent(doc.content as Record<string, unknown> ?? '')
    triggerCheckRef.current?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFormatId])

  // ── Grammar check state ───────────────────────────────────────────────────
  const [ltMatches, setLtMatches] = useState<LTMatch[]>([])
  const ltMatchesRef = useRef<LTMatch[]>([])
  const grammarCheckRef = useRef(grammarCheck)
  const decorSetRef = useRef<DecorationSet>(DecorationSet.empty)
  const grammarPluginKey = useRef(new PluginKey<DecorationSet>('grammarCheck'))
  const debouncedCheck = useRef(createDebouncedChecker(2000))
  const triggerCheckRef = useRef<(() => void) | null>(null)

  useEffect(() => { grammarCheckRef.current = grammarCheck }, [grammarCheck])

  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [bgHovered, setBgHovered] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null)
  const slashMenuRef = useRef<SlashMenuState | null>(null)
  slashMenuRef.current = slashMenu

  const [slashInputMode, setSlashInputMode] = useState<SlashInputMode>(null)
  const [slashInputValue, setSlashInputValue] = useState('')
  const slashInputRef = useRef<HTMLInputElement>(null)

  const handlersRef = useRef<SlashHandlers>({
    onStart: () => {},
    onUpdate: () => {},
    onKeyDown: () => false,
    onExit: () => {},
  })

  useEffect(() => {
    handlersRef.current = {
      onStart: (props) => {
        const coords = props.editor.view.coordsAtPos(props.range.from)
        const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
        setSlashMenu({ items: props.items, selectedIdx: 0, command: props.command, rect, editor: props.editor, range: props.range })
      },
      onUpdate: (props) => {
        const coords = props.editor.view.coordsAtPos(props.range.from)
        const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
        setSlashMenu((prev) =>
          prev ? { ...prev, items: props.items, command: props.command, rect, selectedIdx: 0, range: props.range } : null
        )
      },
      onKeyDown: () => false,
      onExit: () => { setSlashMenu(null); setSlashInputMode(null); setSlashInputValue('') },
    }
  })

  // ── Slash input confirm/dismiss ──────────────────────────────────────────
  const confirmSlashInput = useCallback(() => {
    if (!slashInputMode) return
    const { type, range, editor } = slashInputMode
    const url = slashInputValue.trim()
    if (url) {
      if (type === 'link')  editor.chain().focus().deleteRange(range).setLink({ href: url }).run()
      if (type === 'image') editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
    } else {
      editor.chain().focus().deleteRange(range).run()
    }
    setSlashInputMode(null); setSlashInputValue(''); setSlashMenu(null)
  }, [slashInputMode, slashInputValue])

  const dismissSlashInput = useCallback(() => {
    setSlashInputMode(null); setSlashInputValue('')
  }, [])

  // ── Slash menu keyboard navigation ───────────────────────────────────────
  useEffect(() => {
    if (!slashMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (slashInputMode) return  // input field handles its own keys
      const menu = slashMenuRef.current
      if (!menu || menu.items.length === 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu((m) => m ? { ...m, selectedIdx: (m.selectedIdx + 1) % m.items.length } : null)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu((m) => m ? { ...m, selectedIdx: (m.selectedIdx - 1 + m.items.length) % m.items.length } : null)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        const item = menu.items[menu.selectedIdx]
        if (item) {
          if (item.title === 'Link' || item.title === 'Image') {
            setSlashInputMode({ type: item.title.toLowerCase() as 'link' | 'image', range: menu.range, editor: menu.editor })
          } else {
            menu.command(item)
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [slashMenu, slashInputMode])

  const SlashCommandExtension = useMemo(
    () =>
      Extension.create({
        name: 'slashCommand',
        addProseMirrorPlugins() {
          return [
            Suggestion<SlashCommandItem>({
              editor: this.editor,
              char: '/',
              allowSpaces: false,
              items: ({ query }) =>
                SLASH_COMMANDS.filter((c) =>
                  c.title.toLowerCase().startsWith(query.toLowerCase())
                ).slice(0, 8),
              command: ({ editor, range, props }) => props.command({ editor, range }),
              render: () => ({
                onStart: (p) => handlersRef.current.onStart(p),
                onUpdate: (p) => handlersRef.current.onUpdate(p),
                onKeyDown: (p) => handlersRef.current.onKeyDown(p),
                onExit: () => handlersRef.current.onExit(),
              }),
            }),
          ]
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const fontFamily =
    font === 'serif' ? 'var(--font-noto-serif)'
    : font === 'mono' ? 'var(--font-noto-mono)'
    : 'var(--font-noto-sans)'

  // ── Grammar decoration extension ──────────────────────────────────────────
  const GrammarExtension = useMemo(() => {
    const key = grammarPluginKey.current
    return Extension.create({
      name: 'grammarCheck',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key,
            state: {
              init: () => DecorationSet.empty,
              apply(tr, set) {
                const next = tr.getMeta(key)
                if (next !== undefined) return next as DecorationSet
                return set.map(tr.mapping, tr.doc)
              },
            },
            props: {
              decorations(state) {
                return key.getState(state) ?? DecorationSet.empty
              },
            },
            view(view) {
              function run() {
                if (!grammarCheckRef.current) {
                  const tr = view.state.tr.setMeta(key, DecorationSet.empty)
                  view.dispatch(tr)
                  ltMatchesRef.current = []
                  setLtMatches([])
                  return
                }
                const text = view.state.doc.textContent
                debouncedCheck.current(text, (matches) => {
                  // Build flat-text-index → ProseMirror-position map
                  const posMap: number[] = []
                  view.state.doc.forEach((node, offset) => {
                    if (!node.isTextblock) return
                    const pmStart = offset + 1 // +1 skips the node's opening token
                    for (let i = 0; i < node.textContent.length; i++) {
                      posMap.push(pmStart + i)
                    }
                  })

                  // Filter matches that span a paragraph boundary (false positives —
                  // a paragraph break is already a valid sentence separator).
                  const valid = matches.filter((m) => {
                    const end = m.offset + m.length
                    if (end > posMap.length || m.offset >= posMap.length) return false
                    return posMap[end - 1] === posMap[m.offset] + m.length - 1
                  })
                  const decos: Decoration[] = []
                  for (const m of valid) {
                    const end = m.offset + m.length
                    const from = posMap[m.offset]
                    const to   = posMap[end - 1] + 1
                    decos.push(Decoration.inline(from, to, {
                      class: `lt-${m.category}`,
                      'data-lt-rule': m.ruleId,
                      'data-lt-idx': String(valid.indexOf(m)),
                    }))
                  }
                  const set = DecorationSet.create(view.state.doc, decos)
                  decorSetRef.current = set
                  const tr = view.state.tr.setMeta(key, set)
                  view.dispatch(tr)
                  ltMatchesRef.current = valid
                  setLtMatches(valid)
                })
              }
              triggerCheckRef.current = run
              run()
              return {
                update(view, prev) {
                  if (!view.state.doc.eq(prev.doc)) run()
                },
              }
            },
          }),
        ]
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-run check when grammarCheck is toggled on
  useEffect(() => {
    if (!grammarCheck) {
      setLtMatches([])
      ltMatchesRef.current = []
    } else {
      triggerCheckRef.current?.()
    }
  }, [grammarCheck])

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }),
      Highlight,
      Divider,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'arak-link' } }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Extension.create({
        name: 'tableBackspaceDelete',
        addKeyboardShortcuts() {
          return {
            Backspace: () => {
              if (!this.editor.isActive('table')) return false
              const { $from } = this.editor.state.selection
              if ($from.parentOffset > 0) return false
              return this.editor.chain().focus().deleteTable().run()
            },
          }
        },
      }),
      Placeholder.configure({ placeholder: 'start writing…  type / for commands' }),
      Typography,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      PageBreak,
      SlashCommandExtension,
      GrammarExtension,
    ],
    content: content ?? undefined,
    autofocus: true,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Record<string, unknown>
      setContent(json)
      markDirty()
      if (activeFormatId) updateDoc(activeFormatId, { content: json })
    },
    editorProps: {
      attributes: {
        style: [
          `font-family: ${fontFamily}`,
          'font-size: 16px',
          'line-height: 1.7',
          'letter-spacing: 0.01em',
          'outline: none',
          'color: #1a1a18',
        ].join(';'),
      },
    },
  })

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editor) return
    const text = editor.getText()
    const filename = (title || 'untitled').trim() + '.txt'
    const saved = await saveToFile(text, filename)
    if (saved) markSaved()
  }, [editor, title, markSaved])

  const handleOpen = useCallback(async () => {
    const result = await loadFromFile()
    if (!result || !editor) return
    editor.commands.setContent(result.content)
    setTitle(result.name)
    markSaved()
  }, [editor, setTitle, markSaved])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') { e.preventDefault(); handleSave() }
      if (mod && e.key === 'o') { e.preventDefault(); handleOpen() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, handleOpen])

  // ── Sync font/size changes ────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute(
      'style',
      [
        `font-family: ${fontFamily}`,
        'font-size: 16px',
        'line-height: 1.7',
        'letter-spacing: 0.01em',
        'outline: none',
        'color: #1a1a18',
      ].join(';')
    )
  }, [editor, fontFamily, fontSize])

  // ── Autosave on idle ──────────────────────────────────────────────────────
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(markSaved, 3000)
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [content, markSaved])

  // Listen for sidebar print trigger
  useEffect(() => {
    const onPrint = () => setShowPrintPreview(true)
    window.addEventListener('arak:print', onPrint)
    return () => window.removeEventListener('arak:print', onPrint)
  }, [])

  // Register editor ref for CommandBar
  useEffect(() => {
    editorRefs.format = editor ?? null
    return () => { editorRefs.format = null }
  }, [editor])

  if (!editor) return null
  editorRef.current = editor

  return (
    <>
    <div
      key={activeFormatId ?? 'format'}
      className="format-page-bg content-enter"
      style={{ position: 'relative' }}
      onMouseEnter={() => setBgHovered(true)}
      onMouseLeave={() => setBgHovered(false)}
    >
      {/* ── Page card ── */}
      <div
        ref={cardRef}
        className={`format-page-card paper-${paperFormat}`}
        style={{
          padding: `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`,
        }}
        onMouseEnter={() => setBgHovered(false)}
        onMouseLeave={() => setBgHovered(true)}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Dark icon toolbar ── */}
      <FormatToolbar editor={editor} />

      {/* ── Table toolbar ── */}
      <TableToolbar editor={editor} />

      {/* ── Margin handles ── */}
      <MarginEditor cardRef={cardRef} visible={bgHovered} />

      {/* ── Page numbers / header / footer ── */}
      <PageOverlay cardRef={cardRef} paperFormat={paperFormat} />

      {/* ── Grammar popover ── */}
      {grammarCheck && <GrammarPopover editor={editor} matches={ltMatches} />}

      {/* ── Slash command menu ── */}
      {slashMenu && slashMenu.items.length > 0 && (() => {
        // Recalculate position fresh every render so scroll never desynchronises
        const coords = slashMenu.editor.view.coordsAtPos(slashMenu.range.from)
        return (
        <div
          className="format-toolbar-enter"
          style={{
            position: 'fixed',
            top: coords.bottom + 8,
            left: coords.left,
            zIndex: 50,
            background: '#1a1a18',
            borderRadius: 100,
            padding: '4px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {slashInputMode ? (
            <>
              <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <SlashIcon title={slashInputMode.type === 'link' ? 'Link' : 'Image'} />
              </span>
              <input
                ref={slashInputRef}
                autoFocus
                value={slashInputValue}
                onChange={e => setSlashInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmSlashInput() }
                  if (e.key === 'Escape') { e.preventDefault(); dismissSlashInput() }
                }}
                placeholder={slashInputMode.type === 'link' ? 'Paste URL…' : 'Image URL…'}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 13, flex: 1, minWidth: 180, padding: '0 4px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                }}
              />
              <SlashBtn icon={<Check size={16} strokeWidth={1.5} />} title="Confirm" onClick={confirmSlashInput} />
              <SlashBtn icon={<X size={16} strokeWidth={1.5} />}     title="Dismiss" onClick={dismissSlashInput} />
            </>
          ) : (
            slashMenu.items.map((item, i) => (
              <SlashBtn
                key={item.title}
                icon={<SlashIcon title={item.title} />}
                title={item.title}
                active={i === slashMenu.selectedIdx}
                onClick={() => {
                  if (item.title === 'Link' || item.title === 'Image') {
                    setSlashInputMode({ type: item.title.toLowerCase() as 'link' | 'image', range: slashMenu.range, editor: slashMenu.editor })
                  } else {
                    slashMenu.command(item)
                  }
                }}
              />
            ))
          )}
        </div>
        )
      })()}
    </div>
    {showPrintPreview && (
      <PrintPreview editor={editor} onClose={() => setShowPrintPreview(false)} />
    )}
    </>
  )
}
