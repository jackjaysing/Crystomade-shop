/** 是否為量身訂製／專屬手串類商品（出貨前需個別設定靈魂卡屬性） */
export function isBespokeSoulCardProduct(productName: string): boolean {
  return /量身|訂製|訂制|專屬|五行平衡/.test(productName)
}

/** 品名與魔法物名稱相同時不重複顯示 */
export function shouldShowSoulCardProductName(
  magicTitle: string,
  productName: string
): boolean {
  const title = magicTitle.trim()
  const name = productName.trim()
  return name !== '' && name !== title
}

export interface SoulCardDisplayHeadlines {
  primary: string
  secondary: string | null
}

/** 靈魂卡主副標：量身訂製手串品名在上、專屬名稱在下；其餘商品維持魔法物名稱在上 */
export function resolveSoulCardDisplayHeadlines(
  magicTitle: string,
  productName: string
): SoulCardDisplayHeadlines {
  const title = magicTitle.trim()
  const name = productName.trim()

  if (isBespokeSoulCardProduct(name) && name) {
    return {
      primary: name,
      secondary: title && title !== name ? title : null,
    }
  }

  return {
    primary: title || name || '水晶靈魂',
    secondary: shouldShowSoulCardProductName(title, name) ? name : null,
  }
}
