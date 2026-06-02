import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { downloadOrdersExcel } from '../../lib/exportOrdersExcel'
import type { OrderGroup } from '../../lib/groupOrders'

interface ExportOrdersExcelButtonProps {
  groups: OrderGroup[]
  disabled?: boolean
  className?: string
}

/** 一鍵導出訂單 Excel 報表 */
export function ExportOrdersExcelButton({
  groups,
  disabled = false,
  className = '',
}: ExportOrdersExcelButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (disabled || exporting || groups.length === 0) return

    setExporting(true)
    try {
      await downloadOrdersExcel(groups)
    } catch (err) {
      alert(err instanceof Error ? err.message : '導出失敗，請稍後再試')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={disabled || exporting || groups.length === 0}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-500/45 bg-gradient-to-r from-emerald-600/25 to-amber-glow/20 px-4 py-2.5 text-sm font-medium tracking-wide text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.12)] transition hover:border-emerald-400/60 hover:from-emerald-500/35 hover:to-amber-glow/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      title={
        groups.length === 0
          ? '目前沒有可導出的訂單'
          : `導出 ${groups.length} 筆訂單至 Excel`
      }
    >
      <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={1.75} />
      {exporting ? '產生中…' : '導出 Excel 報表'}
    </button>
  )
}
