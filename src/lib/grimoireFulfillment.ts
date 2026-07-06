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
