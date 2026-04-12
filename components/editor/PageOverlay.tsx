'use client'

import { useEffect, useState } from 'react'
import { PAPER_SIZES, type PaperFormat } from '@/store/format'

interface Props {
  cardRef: React.RefObject<HTMLDivElement | null>
  paperFormat: PaperFormat
}

export function PageOverlay({ cardRef, paperFormat }: Props) {
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

  return null
}
