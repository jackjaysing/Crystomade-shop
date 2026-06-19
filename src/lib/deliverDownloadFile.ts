function isIOSDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

let persistentAnchor: HTMLAnchorElement | null = null
let activeBlobUrl: string | null = null
let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null
let mobileSaveOverlay: HTMLDivElement | null = null

function getPersistentAnchor(): HTMLAnchorElement {
  if (!persistentAnchor) {
    persistentAnchor = document.createElement('a')
    persistentAnchor.style.display = 'none'
    persistentAnchor.rel = 'noopener'
    document.body.appendChild(persistentAnchor)
  }
  return persistentAnchor
}

function releaseActiveBlobUrl(): void {
  if (activeCleanupTimer) {
    window.clearTimeout(activeCleanupTimer)
    activeCleanupTimer = null
  }
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl)
    activeBlobUrl = null
  }
  if (persistentAnchor) {
    persistentAnchor.removeAttribute('href')
    persistentAnchor.removeAttribute('download')
  }
}

function closeMobileSaveOverlay(): void {
  if (!mobileSaveOverlay) return
  const img = mobileSaveOverlay.querySelector('img')
  const src = img?.getAttribute('src')
  if (src?.startsWith('blob:')) {
    URL.revokeObjectURL(src)
  }
  mobileSaveOverlay.remove()
  mobileSaveOverlay = null
}

function showMobileSaveImageOverlay(blobUrl: string, filename: string): void {
  closeMobileSaveOverlay()

  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:100000',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:16px',
    'padding:24px',
    'background:rgba(5,6,10,0.94)',
  ].join(';')

  const hint = document.createElement('p')
  hint.textContent = '長按圖片 → 儲存到照片'
  hint.style.cssText =
    'margin:0;color:#e8c872;font-size:14px;text-align:center;line-height:1.6'

  const img = document.createElement('img')
  img.src = blobUrl
  img.alt = filename
  img.style.cssText =
    'max-width:min(100%,420px);max-height:62vh;border-radius:12px;object-fit:contain'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = '關閉'
  closeButton.style.cssText = [
    'border:1px solid rgba(232,200,114,0.35)',
    'background:transparent',
    'color:#e8c872',
    'border-radius:999px',
    'padding:10px 20px',
    'font-size:14px',
  ].join(';')
  closeButton.addEventListener('click', closeMobileSaveOverlay)

  overlay.appendChild(hint)
  overlay.appendChild(img)
  overlay.appendChild(closeButton)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeMobileSaveOverlay()
  })

  document.body.appendChild(overlay)
  mobileSaveOverlay = overlay
}

async function tryShareFile(file: File): Promise<boolean> {
  if (!navigator.share) return false

  const payload = { files: [file], title: file.name }
  if (navigator.canShare && !navigator.canShare(payload)) return false

  try {
    await navigator.share(payload)
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return true
    return false
  }
}

function deliverViaAnchor(file: File): void {
  releaseActiveBlobUrl()

  const url = URL.createObjectURL(file)
  activeBlobUrl = url

  const anchor = getPersistentAnchor()
  anchor.href = url
  anchor.download = file.name
  anchor.click()

  activeCleanupTimer = window.setTimeout(() => {
    releaseActiveBlobUrl()
  }, isMobileDevice() ? 8_000 : 2_000)
}

/** 將檔案交給使用者儲存（手機優先分享／長按儲存，桌面用下載） */
export async function deliverDownloadFile(file: File): Promise<void> {
  if (isIOSDevice()) {
    const shared = await tryShareFile(file)
    if (shared) return

    const url = URL.createObjectURL(file)
    showMobileSaveImageOverlay(url, file.name)
    return
  }

  if (isMobileDevice()) {
    const shared = await tryShareFile(file)
    if (shared) return
  }

  deliverViaAnchor(file)
}
