const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'H2',
  'H3',
  'STRONG',
  'B',
  'EM',
  'I',
  'UL',
  'OL',
  'LI',
  'A',
  'IMG',
  'BLOCKQUOTE',
  'DIV',
  'SPAN',
])

const GLOBAL_ATTRS = new Set(['class'])
const TAG_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'title', 'width', 'height']),
}

function isSafeUrl(value: string, { allowData = false } = {}): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (allowData && /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(trimmed)) {
    return true
  }
  try {
    const url = new URL(trimmed, 'https://example.com')
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return trimmed.startsWith('/') && !trimmed.startsWith('//')
  }
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(false)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const el = node as HTMLElement
  const tag = el.tagName.toUpperCase()

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment()
    for (const child of Array.from(el.childNodes)) {
      const safe = sanitizeNode(child)
      if (safe) fragment.appendChild(safe)
    }
    return fragment
  }

  const safeEl = document.createElement(tag.toLowerCase())

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    const allowed = TAG_ATTRS[tag] ?? GLOBAL_ATTRS
    if (!allowed.has(name)) continue

    if (name === 'href') {
      if (!isSafeUrl(attr.value)) continue
      safeEl.setAttribute('href', attr.value.trim())
      safeEl.setAttribute('rel', 'noopener noreferrer')
      if (attr.value.startsWith('http')) {
        safeEl.setAttribute('target', '_blank')
      }
      continue
    }

    if (name === 'src') {
      if (!isSafeUrl(attr.value)) continue
      safeEl.setAttribute('src', attr.value.trim())
      continue
    }

    safeEl.setAttribute(name, attr.value)
  }

  if (tag === 'IMG' && !safeEl.getAttribute('alt')) {
    safeEl.setAttribute('alt', '')
  }

  for (const child of Array.from(el.childNodes)) {
    const safe = sanitizeNode(child)
    if (!safe) continue
    if (safe instanceof DocumentFragment) {
      safeEl.append(...Array.from(safe.childNodes))
    } else {
      safeEl.appendChild(safe)
    }
  }

  return safeEl
}

/** 前台／儲存前消毒富文本 HTML */
export function sanitizeArticleHtml(html: string): string {
  const raw = String(html ?? '').trim()
  if (!raw) return ''

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  const container = document.createElement('div')

  for (const child of Array.from(doc.body.childNodes)) {
    const safe = sanitizeNode(child)
    if (!safe) continue
    if (safe instanceof DocumentFragment) {
      container.append(...Array.from(safe.childNodes))
    } else {
      container.appendChild(safe)
    }
  }

  return container.innerHTML.trim()
}
