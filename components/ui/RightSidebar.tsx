'use client'

import { useUIStore } from '@/store/ui'
import { useEditorStore, type Theme, type Font, type SizeOption } from '@/store/editor'

import { usePathname } from 'next/navigation'

export function RightSidebar() {
  const { rightOpen } = useUIStore()
  const {
    theme, font, focusMode, fontSize, lineHeight,
    setTheme, setFont, toggleFocusMode, setFontSize, setLineHeight,
  } = useEditorStore()
  const pathname = usePathname()
  const isWrite = pathname === '/write'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '220px',
        zIndex: 30,
        background: 'var(--bg)',
        borderLeft: '1px solid var(--subtle)',
        transform: rightOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 160ms ease-in-out',
        overflow: 'auto',
        padding: '1.5rem 1.25rem',
        fontFamily: 'var(--font-noto-sans)',
      }}
    >
      {/* Theme */}
      <Section label="theme">
        <SegmentedControl
          options={[
            { value: 'light', label: 'light' },
            { value: 'shade', label: 'shade' },
            { value: 'dark',  label: 'dark'  },
          ]}
          value={theme}
          onChange={(v) => setTheme(v as Theme)}
        />
      </Section>

      {/* Font face */}
      <Section label="font">
        <SegmentedControl
          options={[
            { value: 'serif', label: 'serif' },
            { value: 'sans',  label: 'sans'  },
            { value: 'mono',  label: 'mono'  },
          ]}
          value={font}
          onChange={(v) => setFont(v as Font)}
        />
      </Section>

      {/* Font size */}
      <Section label="size">
        <SegmentedControl
          options={[
            { value: 'small',  label: 'S' },
            { value: 'medium', label: 'M' },
            { value: 'large',  label: 'L' },
          ]}
          value={fontSize}
          onChange={(v) => setFontSize(v as SizeOption)}
        />
      </Section>

      {/* Line height */}
      <Section label="line height">
        <SegmentedControl
          options={[
            { value: 'small',  label: 'tight'  },
            { value: 'medium', label: 'normal' },
            { value: 'large',  label: 'loose'  },
          ]}
          value={lineHeight}
          onChange={(v) => setLineHeight(v as SizeOption)}
        />
      </Section>

      {/* Write-mode only toggles */}
      {isWrite && (
        <Section label="writing">
          <Toggle label="focus mode" value={focusMode} onChange={toggleFocusMode} />
        </Section>
      )}

      {/* Counters */}
      <Section label="counters">
        <CountersToggle />
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div
        style={{
          fontSize: '10px',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          marginBottom: '0.6rem',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--surface)',
        borderRadius: '7px',
        padding: '2px',
        gap: '2px',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '5px 0',
            fontSize: '11px',
            fontFamily: 'var(--font-noto-sans)',
            letterSpacing: '0.02em',
            color: value === opt.value ? 'var(--fg)' : 'var(--muted)',
            background: value === opt.value ? 'var(--bg)' : 'transparent',
            border: value === opt.value ? '1px solid var(--subtle)' : '1px solid transparent',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'all 120ms ease-in-out',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
      }}
    >
      <span style={{ fontSize: '13px', color: 'var(--fg)', opacity: 0.75 }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          width: '32px',
          height: '18px',
          borderRadius: '9px',
          border: 'none',
          cursor: 'pointer',
          background: value ? 'var(--fg)' : 'var(--subtle)',
          position: 'relative',
          transition: 'background 150ms ease-in-out',
          flexShrink: 0,
        }}
        aria-checked={value}
        role="switch"
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: value ? '16px' : '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'var(--bg)',
            transition: 'left 150ms ease-in-out',
          }}
        />
      </button>
    </div>
  )
}

function CountersToggle() {
  const { showCounters, toggleCounters } = useUIStore()
  return <Toggle label="show counters" value={showCounters} onChange={toggleCounters} />
}
