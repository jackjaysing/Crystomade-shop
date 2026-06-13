import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchPublicRaffles } from '../../lib/api/raffles'
import {
  RAFFLE_FAB_STORAGE_KEY,
  type RaffleFabMode,
} from '../../constants/raffles'
import { isRaffleResultSeen } from '../../lib/raffleResultSeen'
import type { RaffleWithMeta } from '../../lib/types'
import { FortuneConsultationFabSlot } from '../fortune-consultation/FortuneConsultationFloatingWidget'
import { WishBoardFabSlot } from '../wish-board/WishBoardFloatingWidget'
import { RaffleActivityPanel } from './RaffleActivityPanel'
import { RouletteWheelIcon } from './RouletteWheelIcon'

function readStoredMode(): RaffleFabMode {
  try {
    const v = localStorage.getItem(RAFFLE_FAB_STORAGE_KEY)
    if (v === 'visible' || v === 'collapsed') return v
    if (v === 'hidden' || v === 'hidden-left' || v === 'hidden-right') {
      return 'collapsed'
    }
  } catch {
    /* ignore */
  }
  return 'visible'
}

function hasUnseenWin(raffles: RaffleWithMeta[], userId: string | undefined): boolean {
  if (!userId) return false
  return raffles.some(
    (r) =>
      r.status === 'drawn' &&
      r.user_entered &&
      r.user_is_winner &&
      !isRaffleResultSeen(r.id)
  )
}

const safeBottom = {
  bottom: 'max(5.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))',
}

const RAFFLE_POLL_MS = 300_000

/** 左側懸浮輪盤；可向左收合，展開時圖示較大 */
export function RaffleFloatingWidget() {
  const { user } = useAuth()
  const [mode, setMode] = useState<RaffleFabMode>(() => readStoredMode())
  const [panelOpen, setPanelOpen] = useState(false)
  const [winPulse, setWinPulse] = useState(false)

  const reloadRaffles = useCallback(
    async (options?: { skipFinalize?: boolean }) => {
      try {
        const rows = await fetchPublicRaffles(user?.id ?? null, {
          skipFinalize: options?.skipFinalize,
        })
        setWinPulse(hasUnseenWin(rows, user?.id))
      } catch {
        setWinPulse(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    try {
      localStorage.setItem(RAFFLE_FAB_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    if (!user?.id) return

    void reloadRaffles({ skipFinalize: true })
    const id = window.setInterval(
      () => void reloadRaffles({ skipFinalize: true }),
      RAFFLE_POLL_MS
    )
    return () => window.clearInterval(id)
  }, [reloadRaffles, user?.id])

  const isCollapsed = mode === 'collapsed'

  const openPanel = () => {
    setPanelOpen(true)
    void reloadRaffles()
  }

  return (
    <>
      <div
        className="fixed left-0 z-[45] flex flex-col items-start gap-2"
        style={safeBottom}
      >
        <div
          className={`flex flex-col items-start gap-1 transition-transform duration-300 ${
            isCollapsed ? '-translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
          }`}
        >
        {!isCollapsed && (
          <button
            type="button"
            title="向左收合"
            aria-label="向左收合輪盤"
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
          } ${winPulse ? 'raffle-fab-win-pulse' : ''}`}
          aria-label={
            isCollapsed
              ? winPulse
                ? '展開抽獎區，查看中獎結果'
                : '展開抽獎區'
              : winPulse
                ? '抽獎區，您已中獎'
                : '抽獎區'
          }
          title={winPulse ? '恭喜中獎！點擊查看' : '抽獎區'}
        >
          <RouletteWheelIcon
            className={
              isCollapsed
                ? 'h-4 w-4 transition-all duration-300'
                : 'h-8 w-8 transition-all duration-300'
            }
          />
          {!isCollapsed && (
            <span className="mt-0.5 text-[10px] font-medium tracking-wide">抽獎區</span>
          )}
        </button>
        </div>

        <WishBoardFabSlot />

        <FortuneConsultationFabSlot />
      </div>

      <RaffleActivityPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          void reloadRaffles()
        }}
      />
    </>
  )
}
