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
import { Extension } from '@tiptap/core'
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion'
import { useFormatStore } from '@/store/format'
import { useEditorStore } from '@/store/editor'
import { useDocumentsStore } from '@/store/documents'
import { SLASH_COMMANDS, type SlashCommandItem } from '@/lib/editor/slashCommands'
import { PageBreak } from '@/lib/editor/pageBreak'
import { FormatToolbar } from './FormatToolbar'
import { saveToFile, loadFromFile } from '@/lib/utils/fileSystem'

// ── Slash menu icons ──────────────────────────────────────────────────────────

const S = { width: 21, height: 21, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function SlashIcon({ title }: { title: string }) {
  if (title === 'Table') return <svg {...S}><rect x="3" y="3" width="12" height="12" rx="1"/><line x1="3" y1="7" x2="15" y2="7"/><line x1="3" y1="11" x2="15" y2="11"/><line x1="9" y1="3" x2="9" y2="15"/></svg>
  if (title === 'Image') return <svg {...S}><rect x="3" y="3" width="12" height="12" rx="1.5"/><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/><path d="M3 12l3.5-3.5 2.5 2.5 2-2 3 3"/></svg>
  if (title === 'Link') return <svg {...S}><path d="M7.5 10.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M10.5 7.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/></svg>
  if (title === 'Divider') return <svg {...S}><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="6" x2="5" y2="6"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="13" y1="6" x2="15" y2="6"/><line x1="13" y1="12" x2="15" y2="12"/></svg>
  if (title === 'Quote') return <svg {...S}><path d="M6 10c0-1.7 1-3 3-4L7.5 4C5 5.5 3.5 7.5 3.5 10v4H8v-4H6Zm7 0c0-1.7 1-3 3-4L14.5 4C12 5.5 10.5 7.5 10.5 10v4H15v-4h-2Z"/></svg>
  if (title === 'List') return <svg {...S}><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="14" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="6" x2="15" y2="6"/><line x1="7" y1="10" x2="15" y2="10"/><line x1="7" y1="14" x2="15" y2="14"/></svg>
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlashMenuState {
  items: SlashCommandItem[]
  selectedIdx: number
  command: (item: SlashCommandItem) => void
  rect: DOMRect
}

interface SlashHandlers {
  onStart: (props: SuggestionProps<SlashCommandItem>) => void
  onUpdate: (props: SuggestionProps<SlashCommandItem>) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
  onExit: () => void
}

// ── FormatEditor ──────────────────────────────────────────────────────────────

export function FormatEditor() {
  const { content, title, setContent, setTitle, markSaved, markDirty } =
    useFormatStore()
  const font = useEditorStore((s) => s.font)
  const fontSize = useEditorStore((s) => s.fontSize)
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

  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null)
  const slashMenuRef = useRef<SlashMenuState | null>(null)
  slashMenuRef.current = slashMenu

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
        setSlashMenu({ items: props.items, selectedIdx: 0, command: props.command, rect })
      },
      onUpdate: (props) => {
        const coords = props.editor.view.coordsAtPos(props.range.from)
        const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
        setSlashMenu((prev) =>
          prev ? { ...prev, items: props.items, command: props.command, rect, selectedIdx: 0 } : null
        )
      },
      onKeyDown: ({ event }) => {
        const menu = slashMenuRef.current
        if (!menu || menu.items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSlashMenu((m) => m ? { ...m, selectedIdx: (m.selectedIdx - 1 + m.items.length) % m.items.length } : null)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSlashMenu((m) => m ? { ...m, selectedIdx: (m.selectedIdx + 1) % m.items.length } : null)
          return true
        }
        if (event.key === 'Enter') {
          const item = menu.items[menu.selectedIdx]
          if (item) menu.command(item)
          return true
        }
        return false
      },
      onExit: () => setSlashMenu(null),
    }
  })

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

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: { HTMLAttributes: { class: 'arak-hr' } } }),
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

  if (!editor) return null

  return (
    <div key={activeFormatId ?? 'format'} className="format-page-bg content-enter">
      {/* ── A4 card ── */}
      <div className="format-page-card">
        <EditorContent editor={editor} />
      </div>

      {/* ── Dark icon toolbar ── */}
      <FormatToolbar editor={editor} />

      {/* ── Slash command menu ── */}
      {slashMenu && slashMenu.items.length > 0 && (
        <div
          className="format-toolbar-enter"
          style={{
            position: 'fixed',
            top: slashMenu.rect.bottom + 8,
            left: slashMenu.rect.left,
            zIndex: 50,
            background: '#1a1a18',
            borderRadius: 10,
            padding: '5px 7px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {slashMenu.items.map((item, i) => (
            <button
              key={item.title}
              title={item.title}
              onMouseDown={(e) => { e.preventDefault(); slashMenu.command(item) }}
              style={{
                width: 39,
                height: 39,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: i === slashMenu.selectedIdx ? 'rgba(255,255,255,0.16)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: i === slashMenu.selectedIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'background 100ms, color 100ms',
                padding: 0,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (i !== slashMenu.selectedIdx) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                if (i !== slashMenu.selectedIdx) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <SlashIcon title={item.title} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
