/**
 * Open a styled HTML document in a new window and trigger the browser's
 * print dialog. The user can choose "Save as PDF" from there.
 *
 * No external dependency — the browser handles rendering faithfully,
 * and the @media print rules in the HTML ensure clean output.
 */
export function printAsPdf(html: string): void {
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.')
    return
  }

  win.document.open()
  win.document.write(html)
  win.document.close()

  // Wait for fonts / styles to load before printing
  win.onload = () => {
    win.focus()
    win.print()
    win.onafterprint = () => win.close()
  }
}
