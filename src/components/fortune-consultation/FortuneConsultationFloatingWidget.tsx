import { useEffect, useState } from 'react'
import { ChevronLeft, MoonStar } from 'lucide-react'
import {
  FORTUNE_FAB_STORAGE_KEY,
  type FortuneFabMode,
} from '../../constants/fortuneConsultation'
import { FortuneConsultationPanel } from './FortuneConsultationPanel'

function readStoredMode(): FortuneFabMode {
  try {
    const v = localStorage.getItem(FORTUNE_FAB_STORAGE_KEY)
    if (v === 'visible' || v === 'collapsed') return v
  } catch {
    /* ignore */
  }
  return 'visible'
}

/** 左側懸浮命理諮詢按鈕（最下方，不含外層 fixed 定位） */
export function FortuneConsultationFabSlot() {
  const [mode, setMode] = useState<FortuneFabMode>(() => readStoredMode())
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(FORTUNE_FAB_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  const isCollapsed = mode === 'collapsed'

  const openPanel = () => setPanelOpen(true)

  return (
    <>
      <div
        className={`flex flex-col items-start gap-1 transition-transform duration-300 ${
          isCollapsed ? '-translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
        }`}
      >
        {!isCollapsed && (
          <button
            type="button"
            title="向左收合"
            aria-label="向左收合命理諮詢"
            onClick={() => setMode('collapsed')}
            className="ml-3 rounded-md border border-white/10 bg-graphite/90 p-1 text-white/40 backdrop-blur-md hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              setMode('visible')
              openPanel()
              return
            }
            openPanel()
          }}
          className={`ml-2 flex flex-col items-center justify-center border border-amber-glow/40 bg-graphite/90 text-amber-glow shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(212,165,116,0.12)] backdrop-blur-md transition-all duration-300 hover:border-amber-glow/70 hover:bg-amber-glow/15 hover:text-white ${
            isCollapsed
              ? 'h-11 w-10 rounded-r-2xl'
              : 'h-[4.5rem] w-[4.5rem] rounded-full'
          }`}
          aria-label={isCollapsed ? '展開命理諮詢' : '命理諮詢'}
          title="命理諮詢"
        >
          <MoonStar
            className={
              isCollapsed
                ? 'h-4 w-4 transition-all duration-300'
                : 'h-8 w-8 transition-all duration-300'
            }
            strokeWidth={1.75}
          />
          {!isCollapsed && (
            <span className="mt-0.5 text-[10px] font-medium tracking-wide">
              命理諮詢
            </span>
          )}
        </button>
      </div>

      <FortuneConsultationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  )
}
