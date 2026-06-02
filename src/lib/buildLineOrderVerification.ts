import { BANK_TRANSFER_INFO } from '../constants/payment'
import { formatOrderDisplayId } from './buildLineOrderNotification'
import type { OrderGroup } from './groupOrders'
import {
  formatNumberedField,
  formatNumberedItemSection,
} from './formatOrderMessageText'

export interface LineOrderVerificationOptions {
  /** 匯款帳號說明；預設使用常數 */
  bankTransferInfo?: string
}

/** 超商收件一行描述 */
export function formatCvsPickupLine(group: OrderGroup): string {
  return `${group.cvs_brand} ${group.cvs_store}`.trim()
}

/**
 * 組裝 LINE 核對訂單（未結帳）罐頭訊息
 * 應付總額為訂單列 total_amount 加總（含已併入第一筆的運費）
 */
export function buildLineOrderVerificationMessage(
  group: OrderGroup,
  options: LineOrderVerificationOptions = {}
): string {
  const orderId = formatOrderDisplayId(group)
  const grandTotal = Number(group.totalAmount).toLocaleString('zh-TW')
  const bankInfo = options.bankTransferInfo?.trim() || BANK_TRANSFER_INFO

  return [
    '【 晶刻 Crystomade 🔮 訂單核對通知 】',
    '',
    '親愛的小晶靈您好，我們已收到您在官網送出的預訂申請✨',
    '由於店內許多晶石與手串屬於「一物一圖」的限量珍品，為您優先保留。',
    '',
    '請您協助核對以下訂購內容與收件資訊：',
    '',
    formatNumberedField(1, '訂單編號', orderId),
    formatNumberedField(2, '收件姓名', group.buyer_name),
    formatNumberedField(3, '聯絡電話', group.phone),
    formatNumberedField(4, '收件門市', formatCvsPickupLine(group)),
    ...formatNumberedItemSection(5, '預訂明細', group.lineItems),
    formatNumberedField(6, '應付總額', `NT$ ${grandTotal}`),
    '',
    '【後續付款與出貨流程說明】',
    '請您核對內容無誤後，將款項匯至以下帳戶，並於本 LINE 帳號主動回傳「您的姓名」與「匯款帳號後五碼」，老闆收到後會立刻為您核對、安排晶石消磁並封箱出貨喔！',
    '',
    '匯款帳號資訊',
    bankInfo,
    '',
    '非常感謝您對晶刻Crystomade的喜愛，若內容需要修改，請隨時通知我們 🌟',
  ].join('\n')
}
