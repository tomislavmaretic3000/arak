import type { Match } from '@/store/search'

/** Escape special regex characters in a literal query string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Find all occurrences of `query` in `text`. Returns an array of match ranges. */
export function findMatches(text: string, query: string): Match[] {
  if (!query) return []
  const regex = new RegExp(escapeRegex(query), 'gi')
  const matches: Match[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length })
    if (m[0].length === 0) regex.lastIndex++ // guard against zero-length matches
  }
  return matches
}

/** Replace the single match at `match` with `replacement`. */
export function replaceOne(
  text: string,
  match: Match,
  replacement: string
): { text: string; cursorPos: number } {
  return {
    text: text.slice(0, match.start) + replacement + text.slice(match.end),
    cursorPos: match.start + replacement.length,
  }
}

/** Replace all occurrences of `query` with `replacement`. */
export function replaceAll(
  text: string,
  query: string,
  replacement: string
): string {
  if (!query) return text
  return text.replace(new RegExp(escapeRegex(query), 'gi'), replacement)
}
