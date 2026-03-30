/**
 * Measure the Y position of the caret inside a textarea,
 * relative to the textarea element's top edge.
 *
 * Uses a hidden mirror div that replicates the textarea's typography
 * so we can measure where the caret sits without browser APIs.
 */
export function getCaretY(textarea: HTMLTextAreaElement, position: number): number {
  const cs = window.getComputedStyle(textarea)

  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  mirror.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    visibility: hidden;
    pointer-events: none;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    width: ${cs.width};
    font-family: ${cs.fontFamily};
    font-size: ${cs.fontSize};
    font-weight: ${cs.fontWeight};
    line-height: ${cs.lineHeight};
    letter-spacing: ${cs.letterSpacing};
    padding: ${cs.padding};
    border: ${cs.border};
    box-sizing: ${cs.boxSizing};
  `

  mirror.textContent = textarea.value.slice(0, position)

  const caret = document.createElement('span')
  caret.textContent = '\u200b'
  mirror.appendChild(caret)

  document.body.appendChild(mirror)
  const y = caret.offsetTop + caret.offsetHeight / 2
  document.body.removeChild(mirror)

  return y
}
