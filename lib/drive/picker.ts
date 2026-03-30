/** Narrow global types for the Google APIs client */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
  }
}

export interface PickerFile {
  id: string
  name: string
  mimeType: string
}

/** Load the Google APIs script + picker library (idempotent). */
export function loadPickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    if (window.gapi?.picker) return resolve()

    // If gapi is already loaded but picker isn't, just load the module
    if (window.gapi) {
      window.gapi.load('picker', { callback: resolve, onerror: reject })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.async = true
    script.defer = true
    script.onload = () =>
      window.gapi.load('picker', { callback: resolve, onerror: reject })
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/** Open the Google Picker and return the chosen file, or null if cancelled. */
export async function openGooglePicker(
  accessToken: string,
  apiKey: string
): Promise<PickerFile | null> {
  await loadPickerApi()

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(false)
      .setMimeTypes('text/plain,application/vnd.google-apps.document')

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: { action: string; docs?: PickerFile[] }) => {
        if (data.action === 'picked' && data.docs?.[0]) {
          resolve(data.docs[0])
        } else if (data.action === 'cancel') {
          resolve(null)
        }
      })
      .build()

    picker.setVisible(true)
  })
}
