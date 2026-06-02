const STORAGE_KEY = 'crystomade-filter-bar-expanded'

/** 讀取篩選列是否展開（預設展開） */
export function loadFilterBarExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveFilterBarExpanded(expanded: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0')
  } catch {
    /* ignore */
  }
}
