export interface LTMatch {
  offset: number
  length: number
  message: string
  shortMessage: string
  replacements: string[]
  ruleId: string
  category: 'spelling' | 'grammar' | 'style' | 'other'
}

interface LTRawMatch {
  offset: number
  length: number
  message: string
  shortMessage: string
  replacements: { value: string }[]
  rule: { id: string; category: { id: string } }
}

const LT_URL = 'https://api.languagetool.org/v2/check'

function categorise(categoryId: string): LTMatch['category'] {
  const id = categoryId.toUpperCase()
  if (id === 'TYPOS' || id === 'SPELLING') return 'spelling'
  if (id === 'GRAMMAR') return 'grammar'
  if (id === 'STYLE' || id === 'REDUNDANCY' || id === 'PUNCTUATION') return 'style'
  return 'other'
}

export async function checkText(
  text: string,
  language = 'en-US',
  signal?: AbortSignal,
): Promise<LTMatch[]> {
  if (!text.trim()) return []

  const body = new URLSearchParams({ text, language, enabledOnly: 'false' })
  const res = await fetch(LT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal,
  })

  if (res.status === 429) {
    // Rate limited — throw so caller can back off
    throw Object.assign(new Error('rate-limited'), { status: 429 })
  }

  if (!res.ok) throw new Error(`LT error ${res.status}`)

  const data = await res.json() as { matches: LTRawMatch[] }
  return (data.matches ?? []).map((m) => ({
    offset: m.offset,
    length: m.length,
    message: m.message,
    shortMessage: m.shortMessage || m.message,
    replacements: (m.replacements ?? []).slice(0, 5).map((r) => r.value),
    ruleId: m.rule.id,
    category: categorise(m.rule.category.id),
  }))
}

// ── Debounced checker with retry on 429 ───────────────────────────────────────
export function createDebouncedChecker(delay = 2000) {
  let timer:      ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  return function debounced(
    text: string,
    onResult: (matches: LTMatch[]) => void,
    language = 'en-US',
  ) {
    if (timer) clearTimeout(timer)
    if (retryTimer) clearTimeout(retryTimer)

    timer = setTimeout(async () => {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal

      async function attempt(retryDelay: number) {
        try {
          const matches = await checkText(text, language, signal)
          onResult(matches)
        } catch (err: unknown) {
          if (signal.aborted) return
          const status = (err as { status?: number }).status
          if (status === 429) {
            // Back off and retry once
            retryTimer = setTimeout(async () => {
              if (signal.aborted) return
              try {
                const matches = await checkText(text, language, signal)
                onResult(matches)
              } catch {
                // give up silently
              }
            }, retryDelay)
          }
          // other errors: silently ignore
        }
      }

      attempt(8000) // retry after 8s if rate-limited
    }, delay)
  }
}
