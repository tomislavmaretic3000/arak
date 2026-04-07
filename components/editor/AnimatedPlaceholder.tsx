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

const PREFIX        = 'Would you like to write '
const TYPE_SPEED    = 55
const DELETE_SPEED  = 35
const HOLD          = 3000
const FADE_IN       = 600

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
  const [visible, setVisible] = useState(false)
  const [displayed, setDisplayed] = useState('')
  const phraseRef = useRef(PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return

    function type(i: number) {
      const target = phraseRef.current
      const next = target.slice(0, i + 1)
      setDisplayed(next)
      if (next.length < target.length) {
        timerRef.current = setTimeout(() => type(i + 1), TYPE_SPEED)
      } else {
        timerRef.current = setTimeout(erase, HOLD)
      }
    }

    function erase() {
      setDisplayed((prev) => {
        if (prev.length === 0) {
          phraseRef.current = pickNext(phraseRef.current)
          timerRef.current = setTimeout(() => type(0), TYPE_SPEED)
          return ''
        }
        timerRef.current = setTimeout(erase, DELETE_SPEED)
        return prev.slice(0, -1)
      })
    }

    timerRef.current = setTimeout(() => type(0), TYPE_SPEED)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
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
      {PREFIX}{displayed}<span style={{
        display: 'inline-block',
        width: '1px',
        height: '0.85em',
        background: 'var(--muted)',
        marginLeft: '2px',
        verticalAlign: 'text-bottom',
        animation: 'blink 1s step-end infinite',
      }} />
    </div>
  )
}
