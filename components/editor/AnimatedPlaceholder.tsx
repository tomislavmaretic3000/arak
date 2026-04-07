'use client'

import { useEffect, useRef, useState } from 'react'

const PHRASES = [
  'a Document', 'a Note', 'a Memo', 'a List', 'a Decision',
  'a Goal', 'a Dream', 'a Poem', 'a Statement', 'a Resolution',
  'a Joke', 'an Anecdote', 'a Memory', 'a Wish', 'a Prompt',
  'a Proposal', 'a Story', 'a Plan', 'a Thought', 'an Idea',
  'a Reflection', 'an Insight', 'a Reminder', 'a Question', 'an Answer',
  'a Message', 'a Brief', 'a Summary', 'a Vision', 'a Mission',
  'a Promise', 'a Confession', 'a Conversation',
]

const PREFIX = 'Would you like to write '
const TYPE_SPEED   = 55   // ms per character typed
const DELETE_SPEED = 35   // ms per character deleted
const HOLD         = 3000 // ms to hold before deleting
const FADE_IN      = 600  // ms for initial fade-in

function pickNext(exclude: string): string {
  const pool = PHRASES.filter((p) => p !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

interface Props {
  fontFamily: string
  fontSize: string
  lineHeight: string
}

export function AnimatedPlaceholder({ fontFamily, fontSize, lineHeight }: Props) {
  const [visible, setVisible] = useState(false)       // controls fade-in
  const [displayed, setDisplayed] = useState('')      // currently shown suffix
  const phraseRef = useRef(PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const rafRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phase     = useRef<'typing' | 'holding' | 'deleting'>('typing')

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Start typewriter after fade-in completes
  useEffect(() => {
    if (!visible) return

    function type() {
      const target = phraseRef.current
      setDisplayed((prev) => {
        const next = target.slice(0, prev.length + 1)
        if (next === target) {
          phase.current = 'holding'
          rafRef.current = setTimeout(hold, HOLD)
          return next
        }
        rafRef.current = setTimeout(type, TYPE_SPEED)
        return next
      })
    }

    function hold() {
      phase.current = 'deleting'
      erase()
    }

    function erase() {
      setDisplayed((prev) => {
        if (prev.length === 0) {
          phraseRef.current = pickNext(phraseRef.current)
          phase.current = 'typing'
          rafRef.current = setTimeout(type, TYPE_SPEED)
          return ''
        }
        rafRef.current = setTimeout(erase, DELETE_SPEED)
        return prev.slice(0, -1)
      })
    }

    rafRef.current = setTimeout(type, TYPE_SPEED)
    return () => { if (rafRef.current) clearTimeout(rafRef.current) }
  }, [visible])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily,
        fontSize,
        lineHeight,
        letterSpacing: '0.01em',
        color: 'var(--muted)',
        opacity: visible ? 0.5 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity ${FADE_IN}ms ease, transform ${FADE_IN}ms ease`,
        whiteSpace: 'nowrap',
      }}
    >
      {PREFIX}{displayed}
    </div>
  )
}
