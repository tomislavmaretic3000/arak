'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormatStore, PAPER_SIZES, type PaperFormat, type PageNumberPos } from '@/store/format'

const MONO = 'var(--font-noto-mono)'
const ZONE_COLOR = 'rgba(0,0,0,0.28)'
const ZONE_H = 24
const ZONE_OFFSET = 10 // px from page edge inside the margin

interface Props {
  cardRef: React.RefObject<HTMLDivElement | null>
  paperFormat: PaperFormat
  showHeader: boolean
  showFooter: boolean
  showPageNumbers: boolean
  pageNumberPos: PageNumberPos
}

export function PageOverlay({ cardRef, paperFormat, showHeader, showFooter, showPageNumbers, pageNumberPos }: Props) {
  const headerText = useFormatStore((s) => s.headerText)
  const footerText = useFormatStore((s) => s.footerText)
  const setHeaderText = useFormatStore((s) => s.setHeaderText)
  const setFooterText = useFormatStore((s) => s.setFooterText)

  const [cardHeight, setCardHeight] = useState(0)
  const [, forceUpdate] = useState(0)

  // Track card size changes
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const ro = new ResizeObserver(() => {
      setCardHeight(card.offsetHeight)
      forceUpdate((n) => n + 1)
    })
    ro.observe(card)
    setCardHeight(card.offsetHeight)
    return () => ro.disconnect()
  }, [cardRef])

  if (paperFormat === 'none') return null
  const card = cardRef.current
  if (!card) return null

  const pageHeight = PAPER_SIZES[paperFormat].height
  const numPages = Math.max(1, Math.ceil(cardHeight / pageHeight))

  const ct = card.offsetTop
  const cl = card.offsetLeft
  const cw = card.offsetWidth

  const zoneStyle: React.CSSProperties = {
    position: 'absolute',
    height: ZONE_H,
    fontSize: 11,
    fontFamily: MONO,
    color: ZONE_COLOR,
    pointerEvents: 'auto',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }

  const editableStyle: React.CSSProperties = {
    outline: 'none',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  }

  const pages = Array.from({ length: numPages }, (_, i) => i)

  return (
    <>
      {pages.map((i) => {
        const pageTop = ct + i * pageHeight
        const pageBottom = ct + (i + 1) * pageHeight

        return (
          <div key={i}>
            {/* Header zone */}
            {showHeader && (
              <div
                style={{
                  ...zoneStyle,
                  top: pageTop + ZONE_OFFSET,
                  left: cl + 16,
                  width: cw - 32,
                }}
              >
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setHeaderText(e.currentTarget.textContent ?? '')}
                  style={editableStyle}
                  data-placeholder="Header…"
                >
                  {headerText}
                </span>
              </div>
            )}

            {/* Footer zone */}
            {(showFooter || showPageNumbers) && (
              <div
                style={{
                  ...zoneStyle,
                  top: pageBottom - ZONE_H - ZONE_OFFSET,
                  left: cl + 16,
                  width: cw - 32,
                  justifyContent:
                    pageNumberPos === 'left' ? 'flex-start'
                    : pageNumberPos === 'right' ? 'flex-end'
                    : 'center',
                  gap: 8,
                }}
              >
                {showFooter && (
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setFooterText(e.currentTarget.textContent ?? '')}
                    style={{
                      ...editableStyle,
                      textAlign:
                        pageNumberPos === 'right' ? 'right'
                        : pageNumberPos === 'left' ? 'left'
                        : 'center',
                    }}
                    data-placeholder="Footer…"
                  >
                    {footerText}
                  </span>
                )}
                {showPageNumbers && (
                  <span style={{ flexShrink: 0 }}>{i + 1}</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
