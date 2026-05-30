/**
 * 功效標籤常數
 * 用於前台篩選與後台勾選
 */

export interface TagFilterOption {
  id: string
  label: string
  /** 對應 products.tags 陣列中的關鍵字（含舊標籤相容） */
  keywords: string[]
}

/** 功效類別（後台勾選 · 前台篩選） */
export const EFFICACY_TAGS = [
  '財運',
  '事業',
  '人緣',
  '情感',
  '舒緩',
  '守護',
  '智慧',
  '靈性',
] as const

/** 後台上架可勾選的全部功效標籤 */
export const ALL_PRODUCT_TAGS: readonly string[] = EFFICACY_TAGS

/** 前台功效快速篩選（「全部」除外） */
export const TAG_FILTERS: TagFilterOption[] = [
  {
    id: 'wealth',
    label: '財運',
    keywords: ['財運', '招財', '鈦晶', '黃水晶'],
  },
  {
    id: 'career',
    label: '事業',
    keywords: ['事業', '虎眼石', '黑曜石'],
  },
  {
    id: 'social',
    label: '人緣',
    keywords: ['人緣', '粉晶'],
  },
  {
    id: 'emotion',
    label: '情感',
    keywords: ['情感', '粉晶', '紫鋰輝', '桃花'],
  },
  {
    id: 'calm',
    label: '舒緩',
    keywords: ['舒緩', '紫水晶', '白水晶', '紫鋰輝'],
  },
  {
    id: 'protection',
    label: '守護',
    keywords: ['守護', '黑曜石'],
  },
  {
    id: 'wisdom',
    label: '智慧',
    keywords: ['智慧', '紫水晶', '白水晶'],
  },
  {
    id: 'spiritual',
    label: '靈性',
    keywords: ['靈性'],
  },
]
