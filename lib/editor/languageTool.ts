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

export async function checkText(text: string, language = 'en-US'): Promise<LTMatch[]> {
  if (!text.trim()) return []
  const body = new URLSearchParams({ text, language, enabledOnly: 'false' })
  const res = await fetch(LT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  if (!res.ok) return []
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

// Debounced version — cancels in-flight timer on each new call
export function createDebouncedChecker(delay = 1500) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  return function debounced(
    text: string,
    onResult: (matches: LTMatch[]) => void,
    language = 'en-US',
  ) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const matches = await checkText(text, language)
        onResult(matches)
      } catch {
        // silently ignore network errors / aborts
      }
    }, delay)
  }
}
