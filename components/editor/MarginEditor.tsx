'use client'

import { useCallback, useRef, useState } from 'react'
import { useFormatStore, MARGIN_MIN, MARGIN_MAX } from '@/store/format'

type Side = 'top' | 'right' | 'bottom' | 'left'

const LABEL_COLOR  = 'rgba(0,0,0,0.32)'
const LINE_COLOR   = 'rgba(0,0,0,0.15)'
const ACTIVE_COLOR = 'rgba(0,0,0,0.5)'
const MONO = 'var(--font-noto-mono)'
const DASH = 'repeating-linear-gradient(to bottom, {c} 0px, {c} 3px, transparent 3px, transparent 9px)'
const DASHH = 'repeating-linear-gradient(to right, {c} 0px, {c} 3px, transparent 3px, transparent 9px)'

function dashV(color: string) { return DASH.replaceAll('{c}', color) }
function dashH(color: string) { return DASHH.replaceAll('{c}', color) }

function Label({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color, userSelect: 'none', transition: 'color 150ms' }}>
      {value}
    </span>
  )
}
function TriangleDown({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${color}`, transition: 'border-top-color 150ms' }} />
}
function TriangleRight({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `6px solid ${color}`, transition: 'border-left-color 150ms' }} />
}
function TriangleLeft({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: `6px solid ${color}`, transition: 'border-right-color 150ms' }} />
}
function TriangleUp({ color }: { color: string }) {
  return <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `6px solid ${color}`, transition: 'border-bottom-color 150ms' }} />
}

interface HandleProps {
  side: Side
  cardRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
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
  // Mouse position relative to the handle element
  const [mouseOffset, setMouseOffset] = useState(0)

  const isHoriz = side === 'left' || side === 'right'

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouseOffset(isHoriz ? e.clientY - rect.top : e.clientX - rect.left)
  }, [isHoriz])

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
  const LABEL_GAP = 10 // px gap between label and the handle line

  if (side === 'left') {
    const x = cl + margin
    const handleHeight = ct + ch
    // Clamp label so it stays within the handle bounds with some padding
    const labelY = Math.min(Math.max(mouseOffset, 28), handleHeight - 10)
    // If mouse is in upper half of paper area → label above cursor (triangle below)
    // If mouse is in lower half → label below cursor (triangle above)
    const inLowerHalf = mouseOffset > handleHeight / 2
    return (
      <div
        style={{ position: 'absolute', top: 0, left: x - HIT / 2, width: HIT, height: handleHeight, cursor: 'ew-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{
            position: 'absolute',
            top: labelY,
            left: '50%',
            transform: inLowerHalf ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            display: 'flex',
            flexDirection: inLowerHalf ? 'column' : 'column-reverse',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'none',
            marginTop: inLowerHalf ? 0 : LABEL_GAP,
            marginBottom: inLowerHalf ? LABEL_GAP : 0,
          }}>
            {inLowerHalf ? <TriangleUp color={labelColor} /> : <TriangleDown color={labelColor} />}
            <Label value={margin} color={labelColor} />
          </div>
        )}
        {/* Dotted line through paper only */}
        <div style={{ position: 'absolute', top: ct, left: '50%', transform: 'translateX(-50%)', width: 1, height: ch, backgroundImage: dashV(lineColor), pointerEvents: 'none' }} />
      </div>
    )
  }

  if (side === 'right') {
    const x = cl + cw - margin
    const handleHeight = ct + ch
    const labelY = Math.min(Math.max(mouseOffset, 28), handleHeight - 10)
    const inLowerHalf = mouseOffset > handleHeight / 2
    return (
      <div
        style={{ position: 'absolute', top: 0, left: x - HIT / 2, width: HIT, height: handleHeight, cursor: 'ew-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{
            position: 'absolute',
            top: labelY,
            left: '50%',
            transform: inLowerHalf ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            display: 'flex',
            flexDirection: inLowerHalf ? 'column' : 'column-reverse',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'none',
            marginTop: inLowerHalf ? 0 : LABEL_GAP,
            marginBottom: inLowerHalf ? LABEL_GAP : 0,
          }}>
            {inLowerHalf ? <TriangleUp color={labelColor} /> : <TriangleDown color={labelColor} />}
            <Label value={margin} color={labelColor} />
          </div>
        )}
        <div style={{ position: 'absolute', top: ct, left: '50%', transform: 'translateX(-50%)', width: 1, height: ch, backgroundImage: dashV(lineColor), pointerEvents: 'none' }} />
      </div>
    )
  }

  if (side === 'top') {
    const y = ct + margin
    const labelX = Math.min(Math.max(mouseOffset, 28), cw - 10)
    const inRightHalf = mouseOffset > cw / 2
    return (
      <div
        style={{ position: 'absolute', top: y - HIT / 2, left: cl, width: cw, height: HIT, cursor: 'ns-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
      >
        {showLabel && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: labelX,
            transform: inRightHalf ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
            display: 'flex',
            flexDirection: inRightHalf ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: 3,
            pointerEvents: 'none',
            marginLeft: inRightHalf ? 0 : LABEL_GAP,
            marginRight: inRightHalf ? LABEL_GAP : 0,
          }}>
            {inRightHalf ? <TriangleLeft color={labelColor} /> : <TriangleRight color={labelColor} />}
            <Label value={margin} color={labelColor} />
          </div>
        )}
        <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', width: cw, height: 1, backgroundImage: dashH(lineColor), pointerEvents: 'none' }} />
      </div>
    )
  }

  // bottom
  const y = ct + ch - margin
  const labelX = Math.min(Math.max(mouseOffset, 28), cw - 10)
  const inRightHalf = mouseOffset > cw / 2
  return (
    <div
      style={{ position: 'absolute', top: y - HIT / 2, left: cl, width: cw, height: HIT, cursor: 'ns-resize', opacity: show ? 1 : 0, transition: 'opacity 180ms', pointerEvents: show ? 'auto' : 'none', zIndex: 40 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
    >
      {showLabel && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: labelX,
          transform: inRightHalf ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          display: 'flex',
          flexDirection: inRightHalf ? 'row' : 'row-reverse',
          alignItems: 'center',
          gap: 3,
          pointerEvents: 'none',
          marginLeft: inRightHalf ? 0 : LABEL_GAP,
          marginRight: inRightHalf ? LABEL_GAP : 0,
        }}>
          {inRightHalf ? <TriangleLeft color={labelColor} /> : <TriangleRight color={labelColor} />}
          <Label value={margin} color={labelColor} />
        </div>
      )}
      <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', width: cw, height: 1, backgroundImage: dashH(lineColor), pointerEvents: 'none' }} />
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
