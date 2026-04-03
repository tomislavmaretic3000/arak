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
import { Extension } from '@tiptap/core'
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion'
import { useFormatStore } from '@/store/format'
import { useEditorStore, FONT_SIZE_MAP } from '@/store/editor'
import { useDocumentsStore } from '@/store/documents'
import { SLASH_COMMANDS, type SlashCommandItem } from '@/lib/editor/slashCommands'
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
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null)
  const slashMenuRef = useRef<SlashMenuState | null>(null)
  slashMenuRef.current = slashMenu

  // Handlers ref — allows the TipTap extension (created once) to call back into
  // React state without stale closures.
  const handlersRef = useRef<SlashHandlers>({
    onStart: () => {},
    onUpdate: () => {},
    onKeyDown: () => false,
    onExit: () => {},
  })

  // Wire up React state ↔ handlers ref
  useEffect(() => {
    handlersRef.current = {
      onStart: (props) => {
        const rect = props.clientRect?.()
        if (!rect) return
        setSlashMenu({
          items: props.items,
          selectedIdx: 0,
          command: props.command,
          rect,
        })
      },
      onUpdate: (props) => {
        const rect = props.clientRect?.()
        setSlashMenu((prev) =>
          prev && rect
            ? { ...prev, items: props.items, command: props.command, rect, selectedIdx: 0 }
            : null
        )
      },
      onKeyDown: ({ event }) => {
        const menu = slashMenuRef.current
        if (!menu || menu.items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSlashMenu((m) =>
            m ? { ...m, selectedIdx: (m.selectedIdx - 1 + m.items.length) % m.items.length } : null
          )
          return true
        }
        if (event.key === 'ArrowDown') {
          setSlashMenu((m) =>
            m ? { ...m, selectedIdx: (m.selectedIdx + 1) % m.items.length } : null
          )
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

  // Build slash command extension (once — captures handlersRef via closure)
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
              command: ({ editor, range, props }) =>
                props.command({ editor, range }),
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
    font === 'serif'
      ? 'var(--font-noto-serif)'
      : font === 'mono'
      ? 'var(--font-noto-mono)'
      : 'var(--font-noto-sans)'

  // ── TipTap editor ─────────────────────────────────────────────────────────
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
          `font-size: ${FONT_SIZE_MAP[fontSize]}`,
          'line-height: 1.65',
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

  // ── Selection → bubble toolbar position ──────────────────────────────────
  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { from, to } = editor.state.selection
      if (from === to) { setBubblePos(null); return }
      // Position above the start of the selection
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)
      const midX = (start.left + end.left) / 2
      setBubblePos({ x: midX, y: start.top })
    }
    editor.on('selectionUpdate', update)
    editor.on('blur', () => setBubblePos(null))
    return () => { editor.off('selectionUpdate', update) }
  }, [editor])

  // ── Sync font/size changes to editor ─────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute(
      'style',
      [
        `font-family: ${fontFamily}`,
        `font-size: ${FONT_SIZE_MAP[fontSize]}`,
        'line-height: 1.65',
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

  // ── Link helper ───────────────────────────────────────────────────────────
  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div key={activeFormatId ?? 'format'} className="content-enter" style={{ minHeight: '100vh', background: '#fff', padding: '96px 108px', boxSizing: 'border-box', maxWidth: '794px', margin: '0 auto' }}>
      {/* ── Editor content ── */}
      <EditorContent editor={editor} />

      {/* ── Bubble toolbar (appears on text selection) ── */}
      {bubblePos && (
        <div
          style={{
            position: 'fixed',
            top: bubblePos.y - 44,
            left: bubblePos.x,
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            gap: '1px',
            background: '#fff',
            border: '1px solid #d4d4ce',
            borderRadius: '7px',
            padding: '3px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontFamily: 'var(--font-noto-sans)',
            animation: 'fadeIn 150ms ease-in-out',
          }}
        >
          {[
            { label: 'B', title: 'Bold', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), style: { fontWeight: 700 } as React.CSSProperties },
            { label: 'I', title: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), style: { fontStyle: 'italic' } as React.CSSProperties },
            { label: 'H1', title: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), style: {} },
            { label: 'H2', title: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), style: {} },
            { label: 'H3', title: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), style: {} },
            { label: '❝', title: 'Quote', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), style: {} },
            { label: 'Link', title: 'Link', action: setLink, active: editor.isActive('link'), style: {} },
          ].map(({ label, title: t, action, active, style }) => (
            <button
              key={label}
              title={t}
              onMouseDown={(e) => { e.preventDefault(); action() }}
              style={{
                background: active ? '#f0f0ec' : 'transparent',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                padding: '4px 7px',
                fontSize: '12px',
                color: active ? '#1a1a18' : '#8a8a84',
                fontFamily: 'var(--font-noto-sans)',
                transition: 'background 120ms, color 120ms',
                ...style,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Slash command menu ── */}
      {slashMenu && slashMenu.items.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: slashMenu.rect.bottom + 6,
            left: slashMenu.rect.left,
            zIndex: 50,
            background: '#fff',
            border: '1px solid #d4d4ce',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '4px',
            minWidth: '220px',
            fontFamily: 'var(--font-noto-sans)',
          }}
        >
          {slashMenu.items.map((item, i) => (
            <button
              key={item.title}
              onMouseDown={(e) => {
                e.preventDefault()
                slashMenu.command(item)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                background: i === slashMenu.selectedIdx ? '#f0f0ec' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '7px 10px',
                textAlign: 'left',
                transition: 'background 100ms',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#8a8a84', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                {item.label}
              </span>
              <span>
                <span style={{ fontSize: '13px', color: '#1a1a18', display: 'block' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '11px', color: '#8a8a84', display: 'block', marginTop: '1px' }}>
                  {item.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
