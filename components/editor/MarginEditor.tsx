'use client'

import { useCallback, useRef, useState } from 'react'
import { useFormatStore, MARGIN_MIN, MARGIN_MAX } from '@/store/format'

type Side = 'top' | 'right' | 'bottom' | 'left'

const LABEL_COLOR  = 'rgba(0,0,0,0.32)'
const LINE_COLOR   = 'rgba(0,0,0,0.18)'
const ACTIVE_COLOR = 'rgba(0,0,0,0.5)'
const MONO = 'var(--font-noto-mono)'

interface HandleProps {
  side: Side
  cardRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
}

function Label({ value, color }: { value: number; color: string }) {
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: 11,
      fontWeight: 500,
      color,
      transition: 'color 150ms',
      userSelect: 'none',
    }}>{value}</span>
  )
}

function TriangleDown({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${color}`, transition: 'border-top-color 150ms' }} />
}

function TriangleRight({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `6px solid ${color}`, transition: 'border-left-color 150ms' }} />
}

function MarginHandle({ side, cardRef, visible }: HandleProps) {
  const margin = useFormatStore((s) =>
    side === 'top' ? s.marginTop
    : side === 'right' ? s.marginRight
    : side === 'bottom' ? s.marginBottom
    : s.marginLeft
  )
  const setMargin = useFormatStore((s) => s.setMargin)

  const dragging = useRef(false)
  const startPx = useRef(0)
  const startMargin = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isHoriz = side === 'left' || side === 'right'

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    setIsDragging(true)
    startPx.current = isHoriz ? e.clientX : e.clientY
    startMargin.current = margin

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = isHoriz
        ? (side === 'left'  ? ev.clientX - startPx.current : -(ev.clientX - startPx.current))
        : (side === 'top'   ? ev.clientY - startPx.current : -(ev.clientY - startPx.current))
      const next = Math.round(Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, startMargin.current - delta)))
      setMargin(side, next)
    }
    const onUp = () => {
      dragging.current = false
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isHoriz, margin, setMargin, side])

  const show = visible || isDragging
  const showLabel = hovered || isDragging
  const card = cardRef.current
  if (!card) return null

  const ct = card.offsetTop
  const cl = card.offsetLeft
  const cw = card.offsetWidth
  const ch = card.offsetHeight

  const active = hovered || isDragging
  const lineColor  = active ? ACTIVE_COLOR : LINE_COLOR
  const labelColor = active ? ACTIVE_COLOR : LABEL_COLOR
  const HIT = 32

  if (side === 'left') {
    const x = cl + margin
    return (
      <div
        style={{ position: 'absolute', top: 0, left: x - HIT / 2, width: HIT, height: ct + ch, cursor: 'ew-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{ position: 'absolute', top: ct - 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
            <Label value={margin} color={labelColor} />
            <TriangleDown color={labelColor} />
          </div>
        )}
        <div style={{ position: 'absolute', top: ct, left: '50%', transform: 'translateX(-50%)', width: 1, height: ch, backgroundImage: `repeating-linear-gradient(to bottom, ${lineColor} 0px, ${lineColor} 4px, transparent 4px, transparent 8px)`, pointerEvents: 'none' }} />
      </div>
    )
  }

  if (side === 'right') {
    const x = cl + cw - margin
    return (
      <div
        style={{ position: 'absolute', top: 0, left: x - HIT / 2, width: HIT, height: ct + ch, cursor: 'ew-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{ position: 'absolute', top: ct - 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
            <Label value={margin} color={labelColor} />
            <TriangleDown color={labelColor} />
          </div>
        )}
        <div style={{ position: 'absolute', top: ct, left: '50%', transform: 'translateX(-50%)', width: 1, height: ch, backgroundImage: `repeating-linear-gradient(to bottom, ${lineColor} 0px, ${lineColor} 4px, transparent 4px, transparent 8px)`, pointerEvents: 'none' }} />
      </div>
    )
  }

  if (side === 'top') {
    const y = ct + margin
    return (
      <div
        style={{ position: 'absolute', top: y - HIT / 2, left: cl, width: cw, height: HIT, cursor: 'ns-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{ position: 'absolute', top: '50%', left: -52, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
            <Label value={margin} color={labelColor} />
            <TriangleRight color={labelColor} />
          </div>
        )}
        <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', width: cw, height: 1, backgroundImage: `repeating-linear-gradient(to right, ${lineColor} 0px, ${lineColor} 4px, transparent 4px, transparent 8px)`, pointerEvents: 'none' }} />
      </div>
    )
  }

  // bottom
  const y = ct + ch - margin
  return (
    <div
      style={{ position: 'absolute', top: y - HIT / 2, left: cl, width: cw, height: HIT, cursor: 'ns-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onMouseDown}
    >
      {showLabel && (
        <div style={{ position: 'absolute', top: '50%', left: -52, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
          <Label value={margin} color={labelColor} />
          <TriangleRight color={labelColor} />
        </div>
      )}
      <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', width: cw, height: 1, backgroundImage: `repeating-linear-gradient(to right, ${lineColor} 0px, ${lineColor} 4px, transparent 4px, transparent 8px)`, pointerEvents: 'none' }} />
    </div>
  )
}

const SIDES: Side[] = ['top', 'right', 'bottom', 'left']

export function MarginEditor({ cardRef, visible }: { cardRef: React.RefObject<HTMLDivElement | null>; visible: boolean }) {
  return (
    <>
      {SIDES.map(side => (
        <MarginHandle key={side} side={side} cardRef={cardRef} visible={visible} />
      ))}
    </>
  )
}
