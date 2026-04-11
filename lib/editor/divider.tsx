'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useRef, useState, useCallback } from 'react'
import type { NodeViewProps } from '@tiptap/react'

const THICKNESS_MIN = 1
const THICKNESS_MAX = 20

// ── NodeView component ────────────────────────────────────────────────────────

function DividerView({ node, updateAttributes, selected }: NodeViewProps) {
  const thickness: number = node.attrs.thickness ?? 1
  const dragging = useRef(false)
  const startY = useRef(0)
  const startT = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    setIsDragging(true)
    startY.current = e.clientY
    startT.current = thickness

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      // drag up = thicker, drag down = thinner
      const delta = startY.current - ev.clientY
      const next = Math.round(Math.min(THICKNESS_MAX, Math.max(THICKNESS_MIN, startT.current + delta * 0.3)))
      updateAttributes({ thickness: next })
    }
    const onUp = () => {
      dragging.current = false
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [thickness, updateAttributes])

  const showActive = isDragging || hovered || selected

  return (
    <NodeViewWrapper
      as="div"
      style={{
        margin: '2em 0',
        cursor: 'ns-resize',
        userSelect: 'none',
        paddingTop: 10,
        paddingBottom: 10,
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      {/* px label above the line, visible on hover/drag */}
      <span style={{
        display: 'block',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: 'rgba(26,26,24,0.4)',
        marginBottom: 4,
        opacity: showActive ? 1 : 0,
        transition: 'opacity 150ms',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {thickness}px
      </span>
      <div
        style={{
          height: thickness,
          background: showActive ? '#1a1a18' : '#d4d4ce',
          borderRadius: thickness > 2 ? 2 : 0,
          transition: isDragging ? 'none' : 'background 150ms',
          pointerEvents: 'none',
        }}
      />
    </NodeViewWrapper>
  )
}

// ── TipTap extension ──────────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    divider: {
      insertDivider: () => ReturnType
    }
  }
}

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      thickness: { default: 1 },
    }
  },

  parseHTML() {
    return [{ tag: 'hr[data-divider]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes({ 'data-divider': '', class: 'arak-hr' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerView)
  },

  addCommands() {
    return {
      insertDivider: () => ({ commands }) =>
        commands.insertContent({ type: this.name }),
    }
  },
})
