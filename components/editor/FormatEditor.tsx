'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
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
        const rect = props.clientRect?.() ?? props.editor.view.dom.getBoundingClientRect()
        setSlashMenu({ items: props.items, selectedIdx: 0, command: props.command, rect })
      },
      onUpdate: (props) => {
        const rect = props.clientRect?.() ?? props.editor.view.dom.getBoundingClientRect()
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
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
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
          'font-size: 15px',
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
        'font-size: 15px',
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

      {/* ── Slash command menu — horizontal icon row ── */}
      {slashMenu && slashMenu.items.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: slashMenu.rect.bottom + 8,
            left: slashMenu.rect.left,
            zIndex: 50,
            background: '#1a1a18',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            padding: '5px 6px',
            display: 'flex',
            flexDirection: 'row',
            gap: '2px',
            fontFamily: 'var(--font-noto-sans)',
          }}
        >
          {slashMenu.items.map((item, i) => (
            <button
              key={item.title}
              title={item.title}
              onMouseDown={(e) => { e.preventDefault(); slashMenu.command(item) }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: i === slashMenu.selectedIdx ? 'rgba(255,255,255,0.16)' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                padding: '8px 10px',
                transition: 'background 100ms',
                minWidth: '44px',
              }}
            >
              <span style={{ fontSize: '16px', color: '#fff', lineHeight: 1, fontWeight: 500 }}>
                {item.label}
              </span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                {item.title.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
