import { PICKUP_CVS_BRAND } from './shipping'
import type { CvsBrand } from '../lib/types'

/** 超商取件選項 */
export const CVS_BRANDS: { id: CvsBrand; label: string }[] = [
  { id: '7-11', label: '7-ELEVEN（7-11）' },
  { id: '全家', label: '全家 FamilyMart' },
]

/** 結帳運送方式（一般商品：超商 + 自取） */
export const CHECKOUT_SHIPPING_OPTIONS: { id: CvsBrand; label: string }[] = [
  ...CVS_BRANDS,
  { id: PICKUP_CVS_BRAND, label: '工作室自取（免運）' },
]

/** 須宅配商品的運送方式：宅配或自取 */
export const COURIER_SHIPPING_OPTIONS: { id: CvsBrand; label: string }[] = [
  { id: '宅配', label: '宅配到府' },
  { id: PICKUP_CVS_BRAND, label: '工作室自取（免運）' },
]
