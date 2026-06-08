import type { ProductCategory } from '../lib/types'

export interface SubcategoryOption<T extends string = string> {
  id: T
  label: string
}

/** 配飾細項 */
export const ACCESSORY_SUBCATEGORIES = [
  { id: '手鐲', label: '手鐲' },
  { id: '手排', label: '手排' },
  { id: '墜鍊', label: '墜鍊' },
  { id: '戒指', label: '戒指' },
] as const satisfies readonly SubcategoryOption[]

/** 擺件細項 */
export const ORNAMENT_SUBCATEGORIES = [
  { id: '龍龜', label: '龍龜' },
  { id: '貔貅', label: '貔貅' },
  { id: '原礦', label: '原礦' },
  { id: '其他', label: '其他' },
] as const satisfies readonly SubcategoryOption[]

/** 礦石細項 */
export const MINERAL_SUBCATEGORIES = [
  { id: '原石', label: '原石' },
  { id: '晶鎮', label: '晶鎮' },
  { id: '晶球', label: '晶球' },
  { id: '晶洞', label: '晶洞' },
  { id: '碎石', label: '碎石' },
] as const satisfies readonly SubcategoryOption[]

export type AccessorySubcategory = (typeof ACCESSORY_SUBCATEGORIES)[number]['id']
export type OrnamentSubcategory = (typeof ORNAMENT_SUBCATEGORIES)[number]['id']
export type MineralSubcategory = (typeof MINERAL_SUBCATEGORIES)[number]['id']
export type ProductSubcategory =
  | AccessorySubcategory
  | OrnamentSubcategory
  | MineralSubcategory

const ACCESSORY_IDS = new Set<string>(ACCESSORY_SUBCATEGORIES.map((s) => s.id))
const ORNAMENT_IDS = new Set<string>(ORNAMENT_SUBCATEGORIES.map((s) => s.id))
const MINERAL_IDS = new Set<string>(MINERAL_SUBCATEGORIES.map((s) => s.id))

export const DEFAULT_ACCESSORY_SUBCATEGORY: AccessorySubcategory = '手鐲'
export const DEFAULT_ORNAMENT_SUBCATEGORY: OrnamentSubcategory = '其他'
export const DEFAULT_MINERAL_SUBCATEGORY: MineralSubcategory = '原石'

export function getSubcategoriesForCategory(
  category: ProductCategory
): readonly SubcategoryOption<ProductSubcategory>[] | null {
  if (category === '配飾') return ACCESSORY_SUBCATEGORIES
  if (category === '擺件') return ORNAMENT_SUBCATEGORIES
  if (category === '礦石') return MINERAL_SUBCATEGORIES
  return null
}

export function parseSubcategory(
  value: unknown,
  category: ProductCategory
): ProductSubcategory | null {
  const s = String(value ?? '').trim()
  if (category === '配飾' && ACCESSORY_IDS.has(s)) return s as AccessorySubcategory
  if (category === '擺件' && ORNAMENT_IDS.has(s)) return s as OrnamentSubcategory
  if (category === '礦石' && MINERAL_IDS.has(s)) return s as MineralSubcategory
  return null
}

export function getSubcategoryLabel(
  subcategory: ProductSubcategory | null | undefined
): string {
  if (!subcategory) return ''
  const all = [
    ...ACCESSORY_SUBCATEGORIES,
    ...ORNAMENT_SUBCATEGORIES,
    ...MINERAL_SUBCATEGORIES,
  ]
  return all.find((s) => s.id === subcategory)?.label ?? subcategory
}

export function defaultSubcategoryForCategory(
  category: ProductCategory
): ProductSubcategory | null {
  if (category === '配飾') return DEFAULT_ACCESSORY_SUBCATEGORY
  if (category === '擺件') return DEFAULT_ORNAMENT_SUBCATEGORY
  if (category === '礦石') return DEFAULT_MINERAL_SUBCATEGORY
  return null
}
