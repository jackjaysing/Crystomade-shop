/** 五行（固定順序：金木水火土） */
export const FIVE_ELEMENTS = ['金', '木', '水', '火', '土'] as const

export type FiveElement = (typeof FIVE_ELEMENTS)[number]

/** 平衡／降的強度 */
export const ELEMENT_INTENSITIES = ['強', '中', '弱', '一點點'] as const

export type ElementIntensity = (typeof ELEMENT_INTENSITIES)[number]

export type WeightedElement = {
  element: FiveElement
  intensity: ElementIntensity
}

/** 會員五行命盤（缺可自動帶入，亦可手動增刪後存檔） */
export type MemberFiveElementChart = {
  natal: FiveElement[]
  composite: FiveElement[]
  /** 缺：預設＝本命∪綜合未出現者，可手動補／改 */
  missing: FiveElement[]
  balance: WeightedElement[]
  reduce: WeightedElement[]
  note: string
}
