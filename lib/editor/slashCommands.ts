import type { Editor, Range } from '@tiptap/core'

export interface SlashCommandItem {
  title: string
  command: (params: { editor: Editor; range: Range }) => void
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: 'Table',
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Image',
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL')
      if (!url) { editor.chain().focus().deleteRange(range).run(); return }
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
    },
  },
  {
    title: 'Link',
    command: ({ editor, range }) => {
      const url = window.prompt('Link URL')
      if (!url) { editor.chain().focus().deleteRange(range).run(); return }
      editor.chain().focus().deleteRange(range).setLink({ href: url }).run()
    },
  },
  {
    title: 'Divider',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDivider().run(),
  },
  {
    title: 'Quote',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'List',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      editor.chain().focus().toggleBulletList().run()
    },
  },
]
