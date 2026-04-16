import type { Editor } from '@tiptap/react'

/** Module-level singletons — editors write here on mount, CommandBar reads to apply replace. */
export const editorRefs: { write: Editor | null; format: Editor | null } = {
  write: null,
  format: null,
}
