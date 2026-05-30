/**
 * 功效標籤常數
 * 用於前台篩選與後台勾選
 */

export interface TagFilterOption {
  id: string
  label: string
  /** 對應 products.tags 陣列中的關鍵字 */
  keywords: string[]
  description?: string
}

/** 快速篩選標籤 */
export const TAG_FILTERS: TagFilterOption[] = [
  {
    id: 'wealth',
    label: '招財',
    keywords: ['招財', '鈦晶', '黃水晶'],
    description: '鈦晶 · 黃水晶',
  },
  {
    id: 'social',
    label: '人緣',
    keywords: ['人緣', '粉晶', '紫鋰輝'],
    description: '粉晶 · 紫鋰輝',
  },
  {
    id: 'calm',
    label: '舒緩',
    keywords: ['舒緩', '紫水晶', '白水晶'],
    description: '紫水晶 · 白水晶',
  },
  {
    id: 'career',
    label: '事業',
    keywords: ['事業', '黑曜石', '虎眼石'],
    description: '黑曜石 · 虎眼石',
  },
]

/** 後台上架可勾選的全部標籤 */
export const ALL_PRODUCT_TAGS = [
  '招財',
  '人緣',
  '舒緩',
  '事業',
  '鈦晶',
  '黃水晶',
  '粉晶',
  '紫鋰輝',
  '紫水晶',
  '白水晶',
  '黑曜石',
  '虎眼石',
] as const
