/**
 * Save content to a file.
 * Uses File System Access API when available; falls back to a download.
 */
export async function saveToFile(
  content: string,
  filename: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (
        window as Window & { showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle> }
      ).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Text file',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
      // Fall through to download fallback
    }
  }

  // Fallback: trigger a download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/**
 * Load a text file from disk.
 * Uses File System Access API when available; falls back to <input type="file">.
 */
export async function loadFromFile(): Promise<{
  content: string
  name: string
} | null> {
  if (typeof window === 'undefined') return null

  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (
        window as Window & {
          showOpenFilePicker: (opts: object) => Promise<FileSystemFileHandle[]>
        }
      ).showOpenFilePicker({
        types: [
          {
            description: 'Text files',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
        multiple: false,
      })
      const file = await handle.getFile()
      const content = await file.text()
      return { content, name: file.name.replace(/\.txt$/, '') }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null
      // Fall through to input fallback
    }
  }

  // Fallback: file input element
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,text/plain'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const content = await file.text()
      resolve({ content, name: file.name.replace(/\.txt$/, '') })
    }
    input.click()
  })
}
