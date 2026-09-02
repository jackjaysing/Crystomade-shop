/** 資料庫型別定義（對應 Supabase 表格） */

import type { CrystalMagicStatus } from '../constants/grimoire'
import type { FiveElement } from '../constants/fiveElements'
import type { ProductSubcategory } from '../constants/productSubcategories'
import type { BraceletConfig } from './braceletConfig'

export type ProductStatus = 'available' | 'sold'
export type OrderStatus = 'pending' | 'shipped' | 'cancelled'

/** 訂單付款狀態（後台標記） */
export type OrderPaymentStatus = 'unpaid' | 'paid' | 'partial'

/** 超商品牌 */
export type CvsBrand = '7-11' | '全家'

/** 商品品類 */
export type ProductCategory = '手串' | '配飾' | '擺件' | '礦石'

/** 手串款式（僅品類為手串時使用） */
export type BraceletStyle = '通用' | '男款' | '女款' | '兒童款'

/** 分潤歸屬（分潤對象） */
export type StudioLocation = '羽薇' | 'Ken' | 'Johnman'

/** 商品規格（同頁多選；各自售價／庫存） */
export interface ProductVariant {
  id: string
  product_id: string
  name: string
  /** 規格原價（NT$） */
  price: number
  stock: number
  sort_order: number
  created_at: string
}

/** 後台編輯用規格列（新建尚無 id） */
export interface ProductVariantInput {
  id?: string
  name: string
  price: number
  stock: number
  sort_order: number
}

/** 商品 */
export interface Product {
  id: string
  name: string
  category: ProductCategory
  /** 手串款式；非手串為 null */
  bracelet_style: BraceletStyle | null
  /** 配飾／擺件／礦石細項；手串為 null */
  subcategory: ProductSubcategory | null
  /** 原價（NT$）；有規格時多為區間下限參考 */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  /** 單件成本（NT$），供淨利潤計算 */
  cost: number
  /** 分潤歸屬；null 表示未指定 */
  studio_location: StudioLocation | null
  tags: string[]
  /** 五行屬性（金木水火土，可多選） */
  five_elements: FiveElement[]
  image_url: string
  /** 詳情頁額外圖片（不含封面） */
  gallery_urls: string[]
  status: ProductStatus
  /** 庫存件數；有規格時為各規格加總 */
  stock: number
  /** 規格列表；空陣列表示單庫存商品 */
  variants: ProductVariant[]
  description: string
  created_at: string
  /** 軟刪除時間；有值表示已從前台移除 */
  deleted_at?: string | null
  /** 後台標記熱門商品 */
  is_hot: boolean
  /** 購物車快捷加購推薦 */
  is_quick_add: boolean
  /** 是否同步於實體工作室販售中 */
  is_studio_available: boolean
  /** 是否為私人訂製（非訂製者勿下單） */
  is_private_custom: boolean
  /** 出貨後是否發行水晶魔法身分證 */
  generates_soul_card: boolean
  /** 排序：數字越小越前面（熱門商品仍置頂） */
  sort_order: number
}

/** 訂單（含關聯商品名稱，供後台顯示） */
export interface Order {
  id: string
  created_at: string
  buyer_name: string
  /** Line 顯示名稱（選填） */
  line_name: string | null
  phone: string
  cvs_brand: CvsBrand
  cvs_store: string
  product_id: string
  /** 下單當下商品名稱快照 */
  product_name?: string | null
  /** 下單當下商品封面快照 */
  product_image_url?: string | null
  /** 手串淨手圍等規格快照（例如 15cm） */
  selected_size?: string | null
  /** 客戶配置手串快照（五行平衡配置器） */
  bracelet_config?: BraceletConfig | null
  /** 商品規格 ID */
  variant_id?: string | null
  /** 下單當下規格名稱快照 */
  variant_name?: string | null
  total_amount: number
  status: OrderStatus
  /** 後台標記是否已付款 */
  is_paid: boolean
  /** 同一結帳批次 ID（購物車併單） */
  checkout_id?: string | null
  /** 人類可讀訂單編號（同一結帳批次共用） */
  order_number?: string | null
  /** 物流寄件單號（後台填寫） */
  tracking_number?: string | null
  /**
   * 此訂單品項分潤歸屬（後台可覆寫）
   * null 表示沿用商品預設 studio_location
   */
  studio_location?: StudioLocation | null
  /** 軟刪除時間 */
  deleted_at?: string | null
  /** 刪除當下狀態快照（恢復用） */
  deleted_from_status?: OrderStatus | null
  /** 下單會員 ID */
  user_id?: string | null
  is_point_redemption?: boolean
  point_product_id?: string | null
  redemption_points?: number | null
  checkout_points_discount?: number | null
  checkout_discount_ntd?: number | null
  member_coupon_id?: string | null
  checkout_coupon_discount?: number | null
  coupon_gift_note?: string | null
  /** 同一結帳批次實際收款（後台填寫；贈點依此計算） */
  checkout_actual_paid_ntd?: number | null
  /** 關聯查詢時帶入 */
  products?: (Pick<Product, 'name' | 'image_url'> & {
    category?: ProductCategory
    /** 商品成本（後台淨利潤計算） */
    cost?: number
    /** 分潤歸屬（後台分潤統計） */
    studio_location?: StudioLocation | null
  }) | null
}

/** 會員資料 */
export interface MemberProfile {
  id: string
  real_name: string
  phone: string
  birthday: string
  points: number
  /** 專屬推薦碼（6 碼英數） */
  referral_code: string | null
  /** 推薦人會員 ID */
  referred_by: string | null
  /** 極境後日常修行累積的巫師修為 */
  grimoire_merit_xp: number
  created_at: string
  updated_at: string
}

/** 後台：已註冊會員（含訂單統計） */
export interface AdminRegisteredCustomer extends MemberProfile {
  order_count: number
  last_order_at: string | null
  total_spent: number
}

/** 後台：未註冊客戶（訪客訂單彙總） */
export interface AdminGuestCustomer {
  /** 識別鍵（正規化電話） */
  id: string
  buyer_name: string
  phone: string
  line_name: string | null
  order_count: number
  last_order_at: string | null
  total_spent: number
}

/** 點數變動紀錄 */
export interface PointsHistoryEntry {
  id: string
  user_id: string
  delta: number
  balance_after: number
  description: string
  checkout_id: string | null
  order_number: string | null
  created_at: string
}

export type CartItemKind = 'product' | 'point_redemption' | 'raffle_gift'

/** 購物車品項（精簡快照，供 localStorage 暫存） */
export interface CartItem {
  /** 列唯一識別（productId 或 point::點數商品 id） */
  cartItemKey: string
  kind?: CartItemKind
  productId: string
  /** 點數商城商品 ID（kind=point_redemption） */
  pointProductId?: string
  /** 兌換所需點數（單件） */
  requiredPoints?: number
  /** 會員禮物券 ID（kind=raffle_gift） */
  memberCouponId?: string
  giftDescription?: string
  name: string
  price: number
  image_url: string
  quantity: number
  /** 手串淨手圍（cm 數字字串，如 "15"）；非手串為 null */
  selectedSize: string | null
  /** 商品規格 ID；無規格商品為 null */
  variantId?: string | null
  /** 規格名稱快照 */
  variantName?: string | null
  /** 客戶配置手串快照（配置器加入的列） */
  braceletConfig?: BraceletConfig | null
  /** 加入當下可用庫存上限 */
  maxStock: number
}

/** 點數商城商品 */
export interface PointProduct {
  id: string
  name: string
  image_url: string
  required_points: number
  stock: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PointProductFormData {
  name: string
  required_points: number
  stock: number
  is_active: boolean
  imageFile: File | null
}

/** 優惠券類型 */
export type CouponType = 'fixed_discount' | 'percent_discount' | 'gift'

export type MemberCouponStatus = 'available' | 'used' | 'expired' | 'in_cart'

export type CouponRedeemMode = 'checkout' | 'cart'

/** 優惠券範本（後台定義） */
export interface Coupon {
  id: string
  title: string
  description: string
  coupon_type: CouponType
  /** 滿額門檻（付費商品小計） */
  min_purchase_amount: number
  /** 折抵金額（純折抵） */
  discount_amount: number | null
  /** 折扣（折）（純打折） */
  discount_zhe: number | null
  /** 禮品說明（禮物券） */
  gift_description: string | null
  /** 禮物券圖片（抽獎獎品等） */
  image_url: string | null
  /** checkout：結帳折抵；cart：兌換入購物車 */
  redeem_mode: CouponRedeemMode
  source_raffle_id: string | null
  is_active: boolean
  /** 發放後有效天數；null 表示不限 */
  valid_days: number | null
  created_at: string
  updated_at: string
}

export interface CouponFormData {
  title: string
  description: string
  coupon_type: CouponType
  min_purchase_amount: number
  discount_amount: number | null
  discount_zhe: number | null
  gift_description: string | null
  is_active: boolean
  valid_days: number | null
}

/** 後台：可兌換入購物車的禮物券範本 */
export interface GiftCouponFormData {
  title: string
  description: string
  gift_description: string
  image_url: string | null
  is_active: boolean
  valid_days: number | null
}

/** 會員持有的優惠券 */
export interface MemberCoupon {
  id: string
  user_id: string
  coupon_id: string
  status: MemberCouponStatus
  issued_at: string
  expires_at: string | null
  used_at: string | null
  checkout_id: string | null
}

export interface MemberCouponWithDefinition extends MemberCoupon {
  coupon: Coupon
}

/** 後台：單筆優惠／禮物券發放紀錄 */
export interface AdminCouponIssueRecord {
  id: string
  coupon_id: string
  user_id: string
  status: MemberCouponStatus
  issued_at: string
  expires_at: string | null
  used_at: string | null
  member_name: string
  member_phone: string
}

/** 抽獎活動狀態 */
export type RaffleStatus = 'open' | 'drawn' | 'cancelled'

/** 抽獎活動 */
export interface Raffle {
  id: string
  title: string
  description: string
  registration_deadline: string
  status: RaffleStatus
  is_active: boolean
  winner_user_id: string | null
  drawn_at: string | null
  prize_title: string | null
  prize_image_url: string | null
  prize_gift_description: string | null
  prize_coupon_id: string | null
  created_at: string
  updated_at: string
}

export interface RaffleFormData {
  description: string
  registration_deadline: string
  is_active: boolean
  /** 禮物名稱（同時作為活動名稱） */
  prize_title: string
  prize_image_url: string | null
}

export interface RaffleEntry {
  id: string
  raffle_id: string
  user_id: string
  entered_at: string
}

/** 前台／後台列表用：含報名數與是否已報名 */
export interface RaffleWithMeta extends Raffle {
  entry_count: number
  user_entered: boolean
  /** 目前登入會員是否為得主（未登入恒為 false） */
  user_is_winner: boolean
  winner_name: string | null
  /** 上架編號，如 20260607-01 */
  listed_code: string
}

/** 建立訂單表單 */
export interface OrderFormData {
  buyer_name: string
  line_name: string
  phone: string
  cvs_brand: CvsBrand
  cvs_store: string
}

/** 上架商品表單 */
export interface ProductFormData {
  name: string
  category: ProductCategory
  bracelet_style: BraceletStyle | null
  subcategory: ProductSubcategory | null
  /** 原價（NT$） */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  /** 單件成本（NT$） */
  cost: number
  /** 分潤歸屬；null 表示未指定 */
  studio_location: StudioLocation | null
  tags: string[]
  five_elements: FiveElement[]
  description: string
  /** 上架庫存件數（無規格時使用） */
  stock: number
  /** 規格列；空表示單庫存 */
  variants: ProductVariantInput[]
  /** 標記為熱門商品 */
  is_hot: boolean
  /** 推薦加購（購物車快捷區） */
  is_quick_add: boolean
  /** 是否同步於實體工作室販售中 */
  is_studio_available: boolean
  /** 是否為私人訂製（非訂製者勿下單） */
  is_private_custom: boolean
  /** 出貨後是否發行水晶魔法身分證 */
  generates_soul_card: boolean
  /** 封面圖 */
  coverFile: File | null
  /** 詳情頁額外圖片 */
  galleryFiles: File[]
}

/** 公告橫幅 */
export interface AnnouncementBanner {
  id: string
  /** 橫幅名稱（後台識別） */
  name: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** 後台編輯公告橫幅 */
export interface BannerEditData {
  name: string
  link_url: string
  imageFile: File | null
}

/** 後台編輯商品相簿項目（可排序） */
export type ProductGalleryEditItem =
  | { kind: 'existing'; url: string }
  | { kind: 'new'; file: File; previewUrl: string }

/** 許願留言 */
export interface WishMessage {
  id: string
  content: string
  display_name: string
  member_id: string
  created_at: string
  /** 後台列表：會員電話（辨識同名） */
  member_phone?: string | null
}

/** 晶刻學研所文章 */
export interface AcademyArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_image_url: string | null
  body_html: string
  is_published: boolean
  sort_order: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface AcademyArticleFormData {
  title: string
  excerpt: string
  cover_image_url: string | null
  body_html: string
  is_published: boolean
}

/** 命理諮詢留言 */
export interface FortuneConsultationRequest {
  id: string
  question: string
  line_id: string
  display_name: string | null
  member_id: string | null
  created_at: string
  /** 後台列表：會員電話 */
  member_phone?: string | null
  /** 後台列表：會員姓名 */
  member_real_name?: string | null
  /** 後台填寫：預估諮詢費用（NT$） */
  estimated_fee: number | null
  /** 後台標記：已聯繫時間 */
  contacted_at: string | null
  /** 後台標記：已付款時間 */
  paid_at: string | null
  /** 後台填寫：命理師備註 */
  admin_notes: string | null
}

/** 後台編輯商品表單 */
export interface ProductEditData {
  name: string
  category: ProductCategory
  bracelet_style: BraceletStyle | null
  subcategory: ProductSubcategory | null
  /** 原價（NT$） */
  price: number
  /** 折扣（折），如 8 表示 8 折；null 表示無折扣 */
  discount_zhe: number | null
  /** 單件成本（NT$） */
  cost: number
  /** 分潤歸屬；null 表示未指定 */
  studio_location: StudioLocation | null
  tags: string[]
  five_elements: FiveElement[]
  description: string
  stock: number
  /** 規格列；空表示單庫存 */
  variants: ProductVariantInput[]
  /** 標記為熱門商品 */
  is_hot: boolean
  /** 推薦加購（購物車快捷區） */
  is_quick_add: boolean
  /** 是否同步於實體工作室販售中 */
  is_studio_available: boolean
  /** 是否為私人訂製（非訂製者勿下單） */
  is_private_custom: boolean
  /** 出貨後是否發行水晶魔法身分證 */
  generates_soul_card: boolean
  /** 新封面；null 表示沿用原圖 */
  coverFile: File | null
  /** 詳情相簿（封面之後的順序） */
  galleryItems: ProductGalleryEditItem[]
}

/** 水晶靈魂卡（魔法身分證） */
export interface CrystalSoulCard {
  id: string
  order_id: string
  user_id: string
  purchased_by_user_id: string | null
  product_id: string | null
  serial_number: string
  public_slug: string
  product_name: string
  product_image_url: string | null
  selected_size: string | null
  product_category: string | null
  product_tags: string[]
  five_elements: string[]
  element_primary: string
  magic_title: string
  magic_affiliation: string
  chakra: string | null
  resonance_keyword: string | null
  awakening_verse: string | null
  magic_status: CrystalMagicStatus
  awakened_at: string | null
  grimoire_task_count: number
  is_public: boolean
  energy_level: number
  contract_signed_at: string | null
  contract_signer_name: string | null
  last_purify_at: string | null
  last_moon_charge_at: string | null
  last_meditation_at: string | null
  gift_claim_slug: string | null
  activation_slug: string | null
  gifted_from_user_id: string | null
  gifted_at: string | null
  magic_birth_date: string | null
  /** 單本經驗值（對應下單金額；與 VIP 分開） */
  purchase_amount: number
  /** 出貨後才對會員發放 */
  released_to_member: boolean
  created_at: string
}
