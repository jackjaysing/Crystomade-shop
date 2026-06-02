const STORAGE_KEY = 'crystomade-show-sold-out'

/** 讀取是否顯示完售商品（預設顯示） */
export function loadShowSoldOutProducts(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveShowSoldOutProducts(show: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, show ? '1' : '0')
  } catch {
    /* ignore */
  }
}
