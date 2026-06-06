const DISPLAYABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

const DISPLAYABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/** 瀏覽器 <img> 可顯示的圖片網址 */
export function isBrowserDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ext ? DISPLAYABLE_EXTENSIONS.has(ext) : false
}

/** 上傳前檢查：拒絕 DNG、HEIC 等瀏覽器無法顯示的格式 */
export function assertBrowserDisplayableImageFile(file: File): void {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext && DISPLAYABLE_EXTENSIONS.has(ext)) return
  if (file.type && DISPLAYABLE_MIME_TYPES.has(file.type.toLowerCase())) return

  throw new Error(
    '請上傳 JPG、PNG、WebP 或 GIF 圖片（不支援 DNG、HEIC 等相機原檔）'
  )
}

export const BROWSER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
