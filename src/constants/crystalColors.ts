import type { Product } from '../lib/types'

export interface CrystalColorFilterOption {
  id: string
  label: string
  /** 圓形圖示色 */
  hex: string
  /** 比對商品 tags（後台勾選）；keywords 僅供文件參考，不再用於自動判斷 */
  keywords: string[]
}

/** 水晶色（紅橙黃綠藍紫黑白） */
export const CRYSTAL_COLOR_FILTERS: CrystalColorFilterOption[] = [
  {
    id: 'red',
    label: '紅',
    hex: '#ef4444',
    keywords: ['紅晶', '紅寶', '石榴石', '紅瑪瑙', '紅玉髓', '紅碧璽', '紅'],
  },
  {
    id: 'orange',
    label: '橙',
    hex: '#f97316',
    keywords: ['太陽石', '橙月光', '橘色', '橙色', '橙', '橘'],
  },
  {
    id: 'yellow',
    label: '黃',
    hex: '#eab308',
    keywords: ['黃水晶', '鈦晶', '金髮晶', '虎眼', '黃玉', '黃'],
  },
  {
    id: 'green',
    label: '綠',
    hex: '#22c55e',
    keywords: ['綠幽靈', '祖母綠', '葡萄石', '綠髮晶', '綠松石', '綠'],
  },
  {
    id: 'blue',
    label: '藍',
    hex: '#3b82f6',
    keywords: ['海藍寶', '藍晶', '托帕石', '藍銅', '藍磷灰', '青金石', '蘇打石', '藍'],
  },
  {
    id: 'purple',
    label: '紫',
    hex: '#a855f7',
    keywords: ['紫水晶', '紫鋰輝', '舒俱徠', '螢石', '紫', '紫晶'],
  },
  {
    id: 'black',
    label: '黑',
    hex: '#1a1a1a',
    keywords: ['黑曜石', '黑髮晶', '黑碧璽', '黑', '曜石'],
  },
  {
    id: 'white',
    label: '白',
    hex: '#f5f5f4',
    keywords: ['白水晶', '月光石', '白瑪瑙', '白', '透白', '乳白'],
  },
]

/** 七色漸層（全部按鈕用） */
export const CRYSTAL_RAINBOW_GRADIENT =
  'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)'

/** 後台可勾選的水晶色標籤 */
export const CRYSTAL_COLOR_TAGS = CRYSTAL_COLOR_FILTERS.map((c) => c.label)

/** 商品是否符合指定水晶色篩選（僅比對後台勾選的 tags） */
export function productMatchesCrystalColor(
  product: Product,
  filter: CrystalColorFilterOption
): boolean {
  return product.tags.includes(filter.label)
}
