import type ExcelJS from 'exceljs'
import { BRACELET_SIZE_UNDECIDED } from '../constants/braceletSizes'
import { formatBraceletConfigSummary } from './braceletConfig'
import { formatOrderDisplayId } from './buildLineOrderNotification'
import {
  formatOrderGroupStatus,
  formatOrderPaymentStatus,
  type OrderGroup,
  type OrderGroupStatus,
  type OrderLineItem,
} from './groupOrders'
import { formatOrderLineDisplayAmount } from './formatOrderPricing'
import type { OrderPaymentStatus } from './types'

const HEADER_FILL = 'FF2A2418'
const HEADER_FONT = 'FFE8C872'

function formatExcelLineItem(item: OrderLineItem): string {
  let sizeSuffix = ''
  if (item.selectedSize?.trim()) {
    const raw = item.selectedSize.trim()
    if (raw === BRACELET_SIZE_UNDECIDED) {
      sizeSuffix = ' (手圍還不確定)'
    } else {
      const withUnit = raw.endsWith('cm') ? raw : `${raw}cm`
      sizeSuffix = ` (${withUnit})`
    }
  }
  const configSummary = formatBraceletConfigSummary(item.braceletConfig)
  const configSuffix = configSummary ? ` (${configSummary})` : ''
  const beadSuffix =
    item.braceletConfig?.beads.length
      ? ` [${item.braceletConfig.beads.map((b) => b.name).join('→')}]`
      : ''
  return `${item.productName}${sizeSuffix}${configSuffix}${beadSuffix} x ${item.quantity} NT$ ${formatOrderLineDisplayAmount(item)}`
}

/** 合併儲存格欄位（同一訂單多行商品時） */
const ORDER_MERGE_COLUMNS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11] as const
const COL_PAYMENT = 10
const COL_SHIP = 11
const COL_TOTAL = 8
const COL_LINE_ITEM = 6
const COL_ITEM_COUNT = 7
const LINE_ITEM_HEADER = '訂購明細與手圍'
const ITEM_COUNT_HEADER = '共有幾件貨'

/** Excel 欄寬估算（中文以 2 單位、英文以 1 單位） */
function measureExcelColumnUnits(text: string): number {
  let units = 0
  for (const char of text) {
    units += char.charCodeAt(0) > 255 ? 2 : 1
  }
  return units
}

function formatOrderCreatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatCvsPickup(group: OrderGroup): string {
  return `${group.cvs_brand} ${group.cvs_store}`.trim()
}

function paymentStatusStyle(status: OrderPaymentStatus): Partial<ExcelJS.Style> {
  if (status === 'paid') {
    return {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A3D2E' },
      },
      font: { color: { argb: 'FF6EE7B7' }, bold: true },
    }
  }
  if (status === 'partial') {
    return {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3D2A14' },
      },
      font: { color: { argb: 'FFFDBA74' }, bold: true },
    }
  }
  return {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3D1A1A' },
    },
    font: { color: { argb: 'FFFCA5A5' }, bold: true },
  }
}

function shipStatusStyle(status: OrderGroupStatus): Partial<ExcelJS.Style> {
  if (status === 'shipped') {
    return {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A3D2E' },
      },
      font: { color: { argb: 'FF6EE7B7' }, bold: true },
    }
  }
  if (status === 'partial') {
    return {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A2A3D' },
      },
      font: { color: { argb: 'FF7DD3FC' }, bold: true },
    }
  }
  if (status === 'cancelled') {
    return {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2A2A2A' },
      },
      font: { color: { argb: 'FF9CA3AF' }, bold: true },
    }
  }
  return {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3D3214' },
    },
    font: { color: { argb: 'FFE8C872' }, bold: true },
  }
}

function applyStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  cell.fill = style.fill as ExcelJS.Fill
  cell.font = { ...(cell.font ?? {}), ...(style.font ?? {}) }
  cell.alignment = {
    vertical: 'middle',
    wrapText: true,
    ...(cell.alignment ?? {}),
  }
}

/** 產生並下載訂單 Excel 報表（.xlsx · UTF-8 中文） */
export async function downloadOrdersExcel(groups: OrderGroup[]): Promise<void> {
  if (groups.length === 0) {
    throw new Error('目前沒有可導出的訂單')
  }

  const { default: ExcelJSModule } = await import('exceljs')
  const workbook = new ExcelJSModule.Workbook()
  workbook.creator = 'Crystomade Admin'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('訂單報表', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  })

  sheet.columns = [
    { header: '訂單編號', key: 'orderNumber', width: 14 },
    { header: '下單時間', key: 'createdAt', width: 20 },
    { header: '顧客姓名', key: 'buyerName', width: 12 },
    { header: '聯絡電話', key: 'phone', width: 14 },
    { header: '收件門市', key: 'cvsStore', width: 22 },
    { header: LINE_ITEM_HEADER, key: 'lineItem', width: 20 },
    { header: ITEM_COUNT_HEADER, key: 'itemCount', width: 14 },
    { header: '應付總額', key: 'totalAmount', width: 12 },
    { header: '物流單號', key: 'trackingNumber', width: 16 },
    { header: '付款狀態', key: 'paymentStatus', width: 12 },
    { header: '出貨狀態', key: 'shipStatus', width: 12 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.height = 26
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    }
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 }
    const noWrap =
      colNumber === COL_LINE_ITEM || colNumber === COL_ITEM_COUNT
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: !noWrap,
    }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF4A4030' } },
    }
  })

  const sorted = [...groups].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  let maxLineItemUnits = measureExcelColumnUnits(LINE_ITEM_HEADER)

  for (const group of sorted) {
    const paymentLabel = formatOrderPaymentStatus(group.paymentStatus)
    const shipLabel = formatOrderGroupStatus(group.status)
    const orderFields = {
      orderNumber: formatOrderDisplayId(group),
      createdAt: formatOrderCreatedAt(group.created_at),
      buyerName: group.buyer_name,
      phone: group.phone,
      cvsStore: formatCvsPickup(group),
      itemCount: group.itemCount,
      totalAmount: group.totalAmount,
      trackingNumber: group.trackingNumber?.trim() || '—',
      paymentStatus: paymentLabel,
      shipStatus: shipLabel,
    }

    const lineRows =
      group.lineItems.length > 0
        ? group.lineItems.map((item) => formatExcelLineItem(item))
        : ['（無明細）']

    const startRow = sheet.rowCount + 1

    for (const lineText of lineRows) {
      maxLineItemUnits = Math.max(maxLineItemUnits, measureExcelColumnUnits(lineText))

      const row = sheet.addRow({
        ...orderFields,
        lineItem: lineText,
      })
      row.height = 22

      row.eachCell((cell, colNumber) => {
        if (colNumber === COL_LINE_ITEM) {
          cell.alignment = { vertical: 'middle', wrapText: false, horizontal: 'left' }
        } else if (colNumber === COL_TOTAL) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
          cell.numFmt = '#,##0'
        } else if (colNumber === COL_ITEM_COUNT) {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
          cell.numFmt = '0'
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        }
      })
    }

    const endRow = sheet.rowCount

    if (endRow > startRow) {
      for (const col of ORDER_MERGE_COLUMNS) {
        sheet.mergeCells(startRow, col, endRow, col)
      }
    }

    const anchorRow = sheet.getRow(startRow)
    anchorRow.eachCell((cell, colNumber) => {
      if (colNumber === COL_LINE_ITEM) {
        cell.alignment = { vertical: 'middle', wrapText: false, horizontal: 'left' }
      } else if (colNumber === COL_TOTAL) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.numFmt = '#,##0'
      } else if (colNumber === COL_ITEM_COUNT) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      }
    })

    applyStyle(anchorRow.getCell(COL_PAYMENT), paymentStatusStyle(group.paymentStatus))
    applyStyle(anchorRow.getCell(COL_SHIP), shipStatusStyle(group.status))
  }

  const lineItemCol = sheet.getColumn(COL_LINE_ITEM)
  lineItemCol.width = Math.min(Math.max(maxLineItemUnits + 2, 14), 120)

  const itemCountCol = sheet.getColumn(COL_ITEM_COUNT)
  const itemCountHeaderUnits = measureExcelColumnUnits(ITEM_COUNT_HEADER)
  const maxCountUnits = Math.max(
    ...sorted.map((group) => measureExcelColumnUnits(String(group.itemCount))),
    1
  )
  itemCountCol.width = Math.max(itemCountHeaderUnits + 2, maxCountUnits + 3, 14)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const stamp = new Date()
    .toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '')

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `Crystomade訂單報表_${stamp}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
