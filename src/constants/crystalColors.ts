import type { Product } from '../lib/types'

export interface CrystalColorFilterOption {
  id: string
  label: string
  /** 圓形圖示色 */
  hex: string
  /** 商品 tags／珠材名稱關鍵字 */
  keywords: string[]
}

/** 水晶色（紅橙黃綠藍紫黑白） */
export const CRYSTAL_COLOR_FILTERS: CrystalColorFilterOption[] = [
  {
    id: 'red',
    label: '紅',
    hex: '#ef4444',
    keywords: [
      '紅晶',
      '紅寶',
      '石榴石',
      '紅瑪瑙',
      '紅玉髓',
      '紅碧璽',
      '紅虎眼',
      '金草莓',
      '草莓晶',
      '紅',
    ],
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
    keywords: [
      '黃水晶',
      '鈦晶',
      '金髮晶',
      '黃虎眼',
      '夢幻虎眼',
      '黃玉',
      '金運',
      '茶晶',
      '金曜',
      '古銅',
      '黃',
    ],
  },
  {
    id: 'green',
    label: '綠',
    hex: '#22c55e',
    keywords: [
      '綠幽靈',
      '祖母綠',
      '葡萄石',
      '綠髮晶',
      '綠松石',
      '綠草莓晶',
      '星光綠草莓',
      '綠草莓',
      '綠',
    ],
  },
  {
    id: 'blue',
    label: '藍',
    hex: '#3b82f6',
    keywords: [
      '海藍寶',
      '魔鬼海藍',
      '藍晶',
      '托帕石',
      '藍銅',
      '藍磷灰',
      '青金石',
      '蘇打石',
      '藍虎眼',
      '拉長石',
      '堇青',
      '磷灰',
      '藍',
    ],
  },
  {
    id: 'purple',
    label: '紫',
    hex: '#a855f7',
    keywords: ['紫水晶', '紫鋰輝', '舒俱徠', '螢石', '紫黃晶', '紫黃', '紫晶', '紫'],
  },
  {
    id: 'black',
    label: '黑',
    hex: '#1a1a1a',
    keywords: ['黑曜石', '黑髮晶', '黑碧璽', '冰曜石', '銀曜石', '金曜石', '曜石', '黑'],
  },
  {
    id: 'white',
    label: '白',
    hex: '#f5f5f4',
    keywords: [
      '白水晶',
      '月光石',
      '白瑪瑙',
      '白閃靈',
      '閃靈',
      '極光23',
      '極光',
      '透白',
      '乳白',
      '白',
    ],
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

/**
 * 依珠材名稱關鍵字推斷顏色（取最長關鍵字命中，避免「綠草莓晶」被「草莓晶」誤判成紅）
 */
export function inferBeadCrystalColorIds(beadName: string): string[] {
  const name = beadName.trim()
  if (!name) return []
  let bestLen = 0
  const scores = new Map<string, number>()
  for (const color of CRYSTAL_COLOR_FILTERS) {
    let len = 0
    for (const kw of color.keywords) {
      if (kw && name.includes(kw)) len = Math.max(len, kw.length)
    }
    if (len > 0) {
      scores.set(color.id, len)
      bestLen = Math.max(bestLen, len)
    }
  }
  if (bestLen === 0) return []
  return [...scores.entries()]
    .filter(([, len]) => len === bestLen)
    .map(([id]) => id)
}

export function beadNameMatchesCrystalColorId(
  beadName: string,
  colorId: string | null
): boolean {
  if (!colorId) return true
  return inferBeadCrystalColorIds(beadName).includes(colorId)
}
