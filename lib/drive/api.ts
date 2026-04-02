const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

/** List recent plain-text and Google Docs files. */
export async function listDriveFiles(token: string, query = ''): Promise<DriveFile[]> {
  const base = "(mimeType='text/plain' or mimeType='application/vnd.google-apps.document') and trashed=false"
  const filter = query ? ` and name contains '${query.replace(/'/g, "\\'")}'` : ''
  const q = encodeURIComponent(base + filter)
  const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime)')
  const res = await fetch(
    `${DRIVE}/files?q=${q}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Drive list error: ${res.status}`)
  const data = await res.json()
  return (data.files ?? []) as DriveFile[]
}

/** Download file content. Google Docs are exported as plain text. */
export async function readDriveFile(token: string, file: DriveFile): Promise<string> {
  const isDoc = file.mimeType === 'application/vnd.google-apps.document'
  const url = isDoc
    ? `${DRIVE}/files/${file.id}/export?mimeType=text%2Fplain`
    : `${DRIVE}/files/${file.id}?alt=media`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Drive read error: ${res.status}`)
  return res.text()
}

/**
 * Save content to Drive.
 * - Pass `fileId` to update an existing file.
 * - Omit `fileId` to create a new .txt file.
 * Returns the Drive file ID.
 */
export async function saveToDrive(
  token: string,
  content: string,
  filename: string,
  fileId?: string
): Promise<string> {
  const boundary = 'arak_mp_boundary'
  const metadata = JSON.stringify({
    name: filename.endsWith('.txt') ? filename : `${filename}.txt`,
    mimeType: 'text/plain',
  })

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')

  const method = fileId ? 'PATCH' : 'POST'
  const url = fileId
    ? `${UPLOAD}/files/${fileId}?uploadType=multipart`
    : `${UPLOAD}/files?uploadType=multipart`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Drive save error: ${res.status} — ${msg}`)
  }

  const data = await res.json()
  return data.id as string
}
