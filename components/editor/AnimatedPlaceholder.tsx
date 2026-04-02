'use client'

import { useEffect, useRef, useState } from 'react'

const PHRASES = [
  'a Document', 'a Note', 'a Memo', 'a List', 'a Decision',
  'a Goal', 'a Dream', 'a Poem', 'a Statement', 'a Resolution',
  'a Joke', 'an Anecdote', 'a Memory', 'a Wish', 'a Prompt',
  'a Proposal', 'a Story', 'a Plan', 'a Brief', 'a Report',
  'a Summary', 'a Review', 'a Reflection', 'an Insight', 'an Idea',
  'a Concept', 'a Hypothesis', 'an Observation', 'a Question', 'an Answer',
  'a Reminder', 'a Guideline', 'a Rule', 'a Principle', 'a Framework',
  'a Strategy', 'a Tactic', 'a Roadmap', 'a Checklist', 'a Script',
  'a Dialogue', 'a Monologue', 'a Letter', 'an Email', 'a Manifesto',
  'a Declaration', 'a Vision', 'a Mission', 'a Value', 'a Belief',
  'a Theory', 'a Prediction', 'a Scenario', 'a Case Study', 'a Log',
  'a Journal Entry', 'a Transcript', 'an Outline', 'a Draft', 'a Revision',
]

const PREFIX = 'Would you like to write '
const HOLD = 3000
const FADE = 280

function pickNext(exclude: string): string {
  const pool = PHRASES.filter((p) => p !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

interface SlotState {
  phrase: string
  entering: boolean  // true = sliding up + fading in
  exiting: boolean   // true = sliding up + fading out
}

interface Props {
  fontFamily: string
  fontSize: string
  lineHeight: string
}

export function AnimatedPlaceholder({ fontFamily, fontSize, lineHeight }: Props) {
  const initial = PHRASES[Math.floor(Math.random() * PHRASES.length)]

  // Two slots for crossfade; only one active at a time
  const [slotA, setSlotA] = useState<SlotState>({ phrase: initial, entering: false, exiting: false })
  const [slotB, setSlotB] = useState<SlotState>({ phrase: '', entering: false, exiting: false })
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cycle = () => {
      const currentPhrase = activeSlot === 'A' ? slotA.phrase : slotB.phrase
      const next = pickNext(currentPhrase)

      if (activeSlot === 'A') {
        // Load next into B (offscreen below), start entering
        setSlotB({ phrase: next, entering: true, exiting: false })
        // Start exiting A
        setSlotA((s) => ({ ...s, exiting: true, entering: false }))
        // After fade completes, swap active slot
        timerRef.current = setTimeout(() => {
          setSlotB((s) => ({ ...s, entering: false }))
          setActiveSlot('B')
          // Schedule next cycle
          timerRef.current = setTimeout(cycle, HOLD)
        }, FADE + 20)
      } else {
        setSlotA({ phrase: next, entering: true, exiting: false })
        setSlotB((s) => ({ ...s, exiting: true, entering: false }))
        timerRef.current = setTimeout(() => {
          setSlotA((s) => ({ ...s, entering: false }))
          setActiveSlot('A')
          timerRef.current = setTimeout(cycle, HOLD)
        }, FADE + 20)
      }
    }

    timerRef.current = setTimeout(cycle, HOLD)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot, slotA.phrase, slotB.phrase])

  const slotStyle = (slot: SlotState): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    whiteSpace: 'nowrap',
    opacity: slot.exiting ? 0 : slot.entering ? 0 : 1,
    transform: slot.exiting
      ? 'translateY(-6px)'
      : slot.entering
      ? 'translateY(6px)'
      : 'translateY(0)',
    transition: `opacity ${FADE}ms ease, transform ${FADE}ms ease`,
    pointerEvents: 'none',
  })

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
        opacity: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {PREFIX}
      <span style={{ position: 'relative', display: 'inline-block', minWidth: '8ch' }}>
        <span style={slotStyle(slotA)}>{slotA.phrase}</span>
        <span style={slotStyle(slotB)}>{slotB.phrase}</span>
        {/* Invisible spacer keeps container width stable */}
        <span style={{ visibility: 'hidden' }}>
          {activeSlot === 'A' ? slotA.phrase : slotB.phrase}
        </span>
      </span>
    </div>
  )
}
