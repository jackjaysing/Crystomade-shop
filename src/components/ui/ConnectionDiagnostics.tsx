import { useState } from 'react'
import {
  diagnoseSupabaseConnection,
  type ConnectionDiagnosis,
} from '../../lib/checkSupabaseConnection'

/** 連線診斷面板（錯誤時手動執行檢查） */
export function ConnectionDiagnostics() {
  const [result, setResult] = useState<ConnectionDiagnosis | null>(null)
  const [loading, setLoading] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    const diagnosis = await diagnoseSupabaseConnection()
    setResult(diagnosis)
    setLoading(false)
  }

  return (
    <div className="mx-auto mt-6 max-w-lg text-left">
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="w-full rounded-lg border border-amber-glow/40 py-2 text-sm text-amber-glow hover:bg-amber-glow/10 disabled:opacity-50"
      >
        {loading ? '檢測中…' : '點此執行連線檢測'}
      </button>

      {result && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            result.ok
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
              : 'border-amber-glow/30 bg-black/30 text-white/80'
          }`}
        >
          <p className="font-medium">{result.summary}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-white/60">
            {result.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
