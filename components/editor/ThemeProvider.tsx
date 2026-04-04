'use client'

import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editor'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useEditorStore((s) => s.theme)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') {
      delete html.dataset.theme
    } else {
      html.dataset.theme = theme
    }
  }, [theme])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    el.playbackRate = 0.5
    let rafId: number
    let reversed = false

    const stepBack = () => {
      if (el.currentTime <= 0) {
        reversed = false
        el.playbackRate = 0.5
        el.play()
        return
      }
      el.currentTime = Math.max(0, el.currentTime - 0.04)
      rafId = requestAnimationFrame(stepBack)
    }

    const onEnded = () => {
      reversed = true
      cancelAnimationFrame(rafId)
      stepBack()
    }

    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('ended', onEnded)
      cancelAnimationFrame(rafId)
    }
  }, [theme])

  return (
    <>
      {children}
      {theme === 'shade' && (
        <video
          ref={videoRef}
          src="/leafs.mp4"
          autoPlay
          muted
          playsInline
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </>
  )
}
