'use client'

import { useCallback, useRef, useState } from 'react'
import { useFormatStore, MARGIN_MIN, MARGIN_MAX } from '@/store/format'

type Side = 'top' | 'right' | 'bottom' | 'left'

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
  const card = cardRef.current
  if (!card) return null

  // Absolute positions relative to the bg container (card's offsetTop/offsetLeft)
  const ct = card.offsetTop
  const cl = card.offsetLeft
  const cw = card.offsetWidth
  const ch = card.offsetHeight

  const HIT = 28
  const TRACK = 1

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 40,
    cursor: isHoriz ? 'ew-resize' : 'ns-resize',
    opacity: isDragging ? 1 : show ? 0.55 : 0,
    transition: 'opacity 200ms',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: show ? 'auto' : 'none',
  }

  const lineStyle: React.CSSProperties = {
    background: isDragging ? '#5b8dd9' : 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    transition: 'background 150ms',
    pointerEvents: 'none',
  }

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 10,
    fontWeight: 500,
    color: '#5b8dd9',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
    background: 'rgba(255,255,255,0.92)',
    padding: '2px 5px',
    borderRadius: 4,
  }

  if (side === 'top') {
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: ct + margin - HIT / 2, left: cl, width: cw, height: HIT, flexDirection: 'row' }}>
        <div style={{ ...lineStyle, height: TRACK, width: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, top: HIT / 2 + 4, left: '50%', transform: 'translateX(-50%)' }}>{margin}px</span>}
      </div>
    )
  }
  if (side === 'bottom') {
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: ct + ch - margin - HIT / 2, left: cl, width: cw, height: HIT, flexDirection: 'row' }}>
        <div style={{ ...lineStyle, height: TRACK, width: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, top: HIT / 2 + 4, left: '50%', transform: 'translateX(-50%)' }}>{margin}px</span>}
      </div>
    )
  }
  if (side === 'left') {
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: ct, left: cl + margin - HIT / 2, width: HIT, height: ch, flexDirection: 'column' }}>
        <div style={{ ...lineStyle, width: TRACK, height: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, left: HIT / 2 + 4, top: '50%', transform: 'translateY(-50%)' }}>{margin}px</span>}
      </div>
    )
  }
  // right
  return (
    <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: ct, left: cl + cw - margin - HIT / 2, width: HIT, height: ch, flexDirection: 'column' }}>
      <div style={{ ...lineStyle, width: TRACK, height: '100%' }} />
      {isDragging && <span style={{ ...labelStyle, left: HIT / 2 + 4, top: '50%', transform: 'translateY(-50%)' }}>{margin}px</span>}
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
