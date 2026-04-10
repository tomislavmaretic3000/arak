'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
        ? (side === 'left'   ? ev.clientX - startPx.current : -(ev.clientX - startPx.current))
        : (side === 'top'    ? ev.clientY - startPx.current : -(ev.clientY - startPx.current))
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

  // Recalculate on scroll/resize
  const [, tick] = useState(0)
  useEffect(() => {
    const refresh = () => tick(n => n + 1)
    window.addEventListener('scroll', refresh, true)
    window.addEventListener('resize', refresh)
    return () => {
      window.removeEventListener('scroll', refresh, true)
      window.removeEventListener('resize', refresh)
    }
  }, [])

  const show = visible || isDragging
  const card = cardRef.current?.getBoundingClientRect()
  if (!card) return null

  const TRACK = 1
  const HIT   = 28

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 40,
    cursor: isHoriz ? 'ew-resize' : 'ns-resize',
    opacity: isDragging ? 1 : show ? 0.6 : 0,
    transition: 'opacity 200ms',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const lineStyle: React.CSSProperties = {
    background: isDragging ? '#5b8dd9' : 'rgba(0,0,0,0.35)',
    borderRadius: 2,
    transition: 'background 150ms',
    pointerEvents: 'none',
  }

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.02em',
    color: '#5b8dd9',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
    background: 'rgba(255,255,255,0.92)',
    padding: '2px 5px',
    borderRadius: 4,
  }

  if (side === 'left') {
    const x = card.left + margin
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: card.top, left: x - HIT / 2, width: HIT, height: card.height, flexDirection: 'column' }}>
        <div style={{ ...lineStyle, width: TRACK, height: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, left: HIT / 2 + 6, top: '50%', transform: 'translateY(-50%)' }}>{margin}</span>}
      </div>
    )
  }
  if (side === 'right') {
    const x = card.right - margin
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: card.top, left: x - HIT / 2, width: HIT, height: card.height, flexDirection: 'column' }}>
        <div style={{ ...lineStyle, width: TRACK, height: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, left: HIT / 2 + 6, top: '50%', transform: 'translateY(-50%)' }}>{margin}</span>}
      </div>
    )
  }
  if (side === 'top') {
    const y = card.top + margin
    return (
      <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: y - HIT / 2, left: card.left, width: card.width, height: HIT, flexDirection: 'row' }}>
        <div style={{ ...lineStyle, height: TRACK, width: '100%' }} />
        {isDragging && <span style={{ ...labelStyle, top: HIT / 2 + 6, left: '50%', transform: 'translateX(-50%)' }}>{margin}</span>}
      </div>
    )
  }
  // bottom
  const y = card.bottom - margin
  return (
    <div onMouseDown={onMouseDown} style={{ ...baseStyle, top: y - HIT / 2, left: card.left, width: card.width, height: HIT, flexDirection: 'row' }}>
      <div style={{ ...lineStyle, height: TRACK, width: '100%' }} />
      {isDragging && <span style={{ ...labelStyle, top: HIT / 2 + 6, left: '50%', transform: 'translateX(-50%)' }}>{margin}</span>}
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
