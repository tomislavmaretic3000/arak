import { generateHTML } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Typography } from '@tiptap/extension-typography'

// The extensions list must match FormatEditor exactly so nodes resolve correctly
const EXTENSIONS = [StarterKit, Link, Table, TableRow, TableCell, TableHeader, Typography]

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wrap a body HTML string in a full, styled HTML document. */
export function buildHtmlDocument(
  title: string,
  bodyHtml: string,
  fontStack: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500&family=Noto+Serif:wght@300;400;500&family=Noto+Sans+Mono:wght@300;400&display=swap');

    * { box-sizing: border-box; }
    body {
      font-family: ${fontStack};
      font-size: 18px;
      line-height: 1.75;
      max-width: 65ch;
      margin: 5rem auto;
      padding: 0 2rem;
      color: #1a1a18;
    }
    .doc-title {
      font-size: 13px;
      letter-spacing: 0.04em;
      color: #8a8a84;
      margin-bottom: 3rem;
      text-transform: lowercase;
    }
    h1 { font-size: 1.8em; font-weight: 500; margin: 1.4em 0 0.4em; line-height: 1.25; }
    h2 { font-size: 1.35em; font-weight: 500; margin: 1.2em 0 0.4em; line-height: 1.3; }
    h3 { font-size: 1.1em; font-weight: 500; margin: 1em 0 0.3em; line-height: 1.4; }
    p  { margin: 0 0 0.9em; }
    ul, ol { padding-left: 1.4em; margin: 0 0 0.9em; }
    li { margin-bottom: 0.25em; }
    blockquote {
      border-left: 2px solid #d4d4ce;
      padding-left: 1em;
      margin: 1em 0;
      color: #8a8a84;
      font-style: italic;
    }
    code {
      font-family: 'Noto Sans Mono', monospace;
      font-size: 0.88em;
      background: #f0f0ec;
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    pre {
      background: #f0f0ec;
      border-radius: 6px;
      padding: 1em 1.2em;
      margin: 1em 0;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; font-size: 0.85em; }
    hr { border: none; border-top: 1px solid #d4d4ce; margin: 2em 0; }
    a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
    th, td { border: 1px solid #d4d4ce; padding: 0.5em 0.75em; text-align: left; }
    th { background: #f0f0ec; font-weight: 500; }

    @media print {
      body { margin: 2cm; font-size: 11pt; }
      a { text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="doc-title">${esc(title)}</div>
  ${bodyHtml}
</body>
</html>`
}

/** Convert plain write-mode text → HTML body string. */
export function writeModeToHtml(text: string): string {
  // Split on blank lines → paragraphs; within each paragraph, \n → <br>
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs
    .map((p) => {
      const lines = p
        .split('\n')
        .map(esc)
        .join('<br>')
      return `<p>${lines}</p>`
    })
    .join('\n')
}

/** Convert TipTap JSON → HTML body string using TipTap's generateHTML. */
export function formatModeToHtml(json: Record<string, unknown>): string {
  try {
    return generateHTML(json, EXTENSIONS)
  } catch {
    return '<p>(could not render content)</p>'
  }
}

/** Trigger a .html file download. */
export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Trigger a .txt file download. */
export function downloadTxt(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
