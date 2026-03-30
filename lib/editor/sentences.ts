export interface TextSegment {
  text: string
  start: number
  end: number
}

/**
 * Split text into sentence segments.
 * A segment ends with one or more of .!? or a newline, followed by optional spaces/tabs.
 * Any trailing text (unfinished sentence) becomes the final segment.
 */
export function parseSentences(text: string): TextSegment[] {
  if (!text) return []

  const segments: TextSegment[] = []
  // Match: content + sentence-ending chars + optional trailing spaces/tabs
  const regex = /[^.!?\n]*[.!?\n]+[ \t]*/g

  let lastEnd = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(text)) !== null) {
    if (m[0].length === 0) {
      regex.lastIndex++
      continue
    }
    segments.push({ text: m[0], start: m.index, end: m.index + m[0].length })
    lastEnd = m.index + m[0].length
  }

  // Remaining text = unfinished current sentence
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), start: lastEnd, end: text.length })
  }

  return segments
}

/**
 * Return the index of the segment that contains the cursor position.
 */
export function getCurrentSegmentIndex(
  segments: TextSegment[],
  cursor: number
): number {
  if (segments.length === 0) return 0
  for (let i = 0; i < segments.length; i++) {
    if (cursor >= segments[i].start && cursor <= segments[i].end) return i
  }
  return segments.length - 1
}
