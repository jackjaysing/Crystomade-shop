import type { OrderGroup } from './groupOrders'
import {
  formatNumberedField,
  formatNumberedItemSection,
} from './formatOrderMessageText'

export interface LineOrderNotificationOptions {
  /** 物流寄件單號；未提供時顯示「安排出貨中」 */
  trackingNumber?: string | null
}

/** 後台顯示用訂單編號（優先人類可讀編號） */
export function formatOrderDisplayId(group: OrderGroup): string {
  return group.orderNumber?.trim() || group.id
}

/** 組裝 LINE 出貨通知罐頭訊息 */
export function buildLineOrderNotificationMessage(
  group: OrderGroup,
  options: LineOrderNotificationOptions = {}
): string {
  const orderId = formatOrderDisplayId(group)
  const total = Number(group.totalAmount).toLocaleString('zh-TW')
  const tracking =
    options.trackingNumber?.trim() ||
    group.trackingNumber?.trim() ||
    '安排出貨中'

  return [
    '【 晶刻 Crystomade 🔮 訂單狀態更新 】',
    '',
    '親愛的小晶靈您好，感謝您對晶刻Crystomade的喜愛✨',
    '您訂購的商品已準備就緒，以下為您的訂單明細：',
    '',
    formatNumberedField(1, '訂單編號', orderId),
    formatNumberedField(2, '收件姓名', group.buyer_name),
    ...formatNumberedItemSection(3, '訂購明細', group.lineItems),
    formatNumberedField(4, '訂單總額', `NT$ ${total}`),
    formatNumberedField(5, '配送進度', '包裹已封箱準備寄出！'),
    formatNumberedField(6, '寄件單號', tracking),
    '',
    '出貨前皆已完成晶石的深度消磁與能量調和，收到後即可直接配戴。若有任何配戴或水晶保養問題，歡迎隨時在 LINE 私訊我們，祝您順心平安 🌟',
  ].join('\n')
}
