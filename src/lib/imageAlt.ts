/** 前台商品主圖 alt */
export function productPhotoAlt(productName: string): string {
  const name = productName.trim()
  return name ? `${name}天然水晶商品照片` : '天然水晶商品照片'
}

/** 商品相簿縮圖 alt */
export function productGalleryThumbAlt(
  productName: string,
  index: number,
  isCover = false
): string {
  const name = productName.trim() || '水晶商品'
  if (isCover) return `${name}封面縮圖`
  return `${name}商品照片第 ${index + 1} 張`
}

/** 禮物券／抽獎獎品圖 alt */
export function giftImageAlt(title: string): string {
  const name = title.trim()
  return name ? `${name}禮物圖片` : '禮物圖片'
}

/** 點數商城商品圖 alt */
export function pointProductPhotoAlt(productName: string): string {
  const name = productName.trim()
  return name ? `${name}點數兌換商品照片` : '點數兌換商品照片'
}

/** 後台商品縮圖 alt */
export function adminProductThumbAlt(productName: string): string {
  return `${productName.trim() || '商品'}縮圖`
}

/** 購物車／結帳商品列圖片 alt */
export function cartItemPhotoAlt(
  itemName: string,
  kind: 'product' | 'gift' | 'point' = 'product'
): string {
  const name = itemName.trim() || '商品'
  if (kind === 'gift') return giftImageAlt(name)
  if (kind === 'point') return pointProductPhotoAlt(name)
  return productPhotoAlt(name)
}
