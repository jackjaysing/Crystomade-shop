/** 超商取件：併單免運門檻（新台幣） */
export const FREE_SHIPPING_THRESHOLD = 600

/** 超商取件：未滿門檻時運費（新台幣） */
export const SHIPPING_FEE = 60

/** 黑貓等宅配：免運門檻（新台幣） */
export const COURIER_FREE_SHIPPING_THRESHOLD = 1500

/** 黑貓等宅配：未滿門檻時運費（新台幣） */
export const COURIER_SHIPPING_FEE = 120

/** 訂單／表單用的宅配品牌標記（寫入 orders.cvs_brand） */
export const COURIER_CVS_BRAND = '宅配' as const

/** 工作室自取（免運；寫入 orders.cvs_brand） */
export const PICKUP_CVS_BRAND = '自取' as const

/** 自取訂單寫入 cvs_store 的固定文案（欄位 NOT NULL） */
export const PICKUP_STORE_LABEL = '工作室自取'

/** 結帳頁自取說明 */
export const PICKUP_CHECKOUT_HINT =
  '選擇工作室自取免運費。下單後請於官方 LINE 與我們約定取件地點及時間。'
