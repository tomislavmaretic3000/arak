import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createDebouncedChecker, type LTMatch } from './languageTool'

export const grammarPluginKey = new PluginKey<DecorationSet>('grammarCheck')

// Shared callback — FormatEditor sets this to update popover state
export type MatchMeta = { matches: LTMatch[]; docText: string }

export function createGrammarExtension(
  onMatches: (meta: MatchMeta) => void,
  enabled: () => boolean,
) {
  const debounced = createDebouncedChecker(1500)

  return Extension.create({
    name: 'grammarCheck',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: grammarPluginKey,

          state: {
            init: () => DecorationSet.empty,
            apply(tr, set) {
              // Map existing decorations through document changes
              return set.map(tr.mapping, tr.doc)
            },
          },

          props: {
            decorations(state) {
              return grammarPluginKey.getState(state) ?? DecorationSet.empty
            },
          },

          view(view) {
            function schedule() {
              if (!enabled()) {
                // Clear decorations when disabled
                const tr = view.state.tr.setMeta(grammarPluginKey, DecorationSet.empty)
                view.dispatch(tr)
                onMatches({ matches: [], docText: '' })
                return
              }

              const text = view.state.doc.textContent
              debounced(text, (matches) => {
                const decos: Decoration[] = []
                let offset = 1 // ProseMirror doc starts at pos 1

                view.state.doc.forEach((node) => {
                  if (!node.isTextblock) { offset += node.nodeSize; return }

                  const blockText = node.textContent
                  const blockStart = offset + 1 // +1 for the opening tag

                  for (const m of matches) {
                    // Map flat text offset → block offset
                    // We accumulate text per block to find the right one
                    const from = blockStart + m.offset
                    const to = from + m.length
                    if (from >= blockStart && to <= blockStart + blockText.length) {
                      decos.push(
                        Decoration.inline(from, to, {
                          class: `lt-${m.category}`,
                          'data-lt-message': m.shortMessage,
                          'data-lt-rule': m.ruleId,
                        })
                      )
                    }
                  }

                  offset += node.nodeSize
                })

                const set = DecorationSet.create(view.state.doc, decos)
                // Dispatch a meta transaction to update plugin state
                const tr = view.state.tr.setMeta(grammarPluginKey, set)
                view.dispatch(tr)
                onMatches({ matches, docText: text })
              })
            }

            // Initial check
            schedule()

            return {
              update(view, prevState) {
                if (view.state.doc.eq(prevState.doc)) return
                schedule()
              },
            }
          },
        }),
      ]
    },
  })
}
