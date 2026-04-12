'use client'

import { useEffect, useState } from 'react'
import { useFormatStore, PAPER_SIZES, type PaperFormat, type PageNumberPos } from '@/store/format'

const MONO = 'var(--font-noto-mono)'
const LABEL_COLOR = 'rgba(0,0,0,0.32)'
// Gap between the card's right edge and the annotation column
const ANNOT_GAP = 20

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

  // Annotation column: starts just outside the card's right edge
  const annotLeft = cl + cw + ANNOT_GAP
  // Only show annotations if there's at least 60px of space to the right
  const bgParent = card.offsetParent as HTMLElement | null
  const bgWidth = bgParent?.offsetWidth ?? 0
  const hasSpace = bgWidth - annotLeft > 60

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    fontFamily: MONO,
    fontSize: 11,
    color: LABEL_COLOR,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    pointerEvents: 'none',
    lineHeight: 1,
  }

  const editableStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 11,
    color: LABEL_COLOR,
    outline: 'none',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    minWidth: 40,
  }

  const pages = Array.from({ length: numPages }, (_, i) => i)

  return (
    <>
      {/* Page separator lines — span slightly past card edges for clarity */}
      {pages.slice(0, -1).map((i) => (
        <div
          key={`sep-${i}`}
          style={{
            position: 'absolute',
            top: ct + (i + 1) * pageHeight,
            left: cl - 24,
            width: cw + 48,
            height: 1,
            background: 'rgba(0,0,0,0.1)',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        />
      ))}

      {/* Per-page annotations: header / footer / page number — outside card to the right */}
      {hasSpace && pages.map((i) => {
        const pageTop    = ct + i * pageHeight
        const pageBottom = ct + (i + 1) * pageHeight
        const pageMid    = ct + i * pageHeight + pageHeight / 2

        return (
          <div key={`annot-${i}`}>
            {/* Header annotation */}
            {showHeader && (
              <div
                style={{ ...labelStyle, top: pageTop + 12, left: annotLeft }}
              >
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setHeaderText(e.currentTarget.textContent ?? '')}
                  style={{ ...editableStyle, pointerEvents: 'auto', userSelect: 'text', cursor: 'text' }}
                >
                  {headerText}
                </span>
              </div>
            )}

            {/* Footer annotation */}
            {showFooter && (
              <div
                style={{ ...labelStyle, top: pageBottom - 22, left: annotLeft }}
              >
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setFooterText(e.currentTarget.textContent ?? '')}
                  style={{ ...editableStyle, pointerEvents: 'auto', userSelect: 'text', cursor: 'text' }}
                >
                  {footerText}
                </span>
              </div>
            )}

            {/* Page number */}
            {showPageNumbers && (
              <div
                style={{
                  ...labelStyle,
                  top: pageNumberPos === 'left' ? pageTop + 12
                     : pageNumberPos === 'right' ? pageBottom - 22
                     : pageMid - 6,
                  left: annotLeft,
                }}
              >
                {i + 1}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
