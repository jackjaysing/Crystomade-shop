import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { MemberAuthForm } from '../member/MemberAuthForm'
import { fetchMemberCartGiftCoupons } from '../../lib/api/coupons'
import { fetchPublicRaffles, registerForRaffle } from '../../lib/api/raffles'
import { RaffleGiftRedeemButton } from '../member/RaffleGiftRedeemButton'
import { markRaffleResultsSeen } from '../../lib/raffleResultSeen'
import type { RaffleWithMeta } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { RafflePrizeDisplay } from './RafflePrizeDisplay'
import { RouletteWheelIcon } from './RouletteWheelIcon'

interface RaffleActivityPanelProps {
  open: boolean
  onClose: () => void
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function isRegistrationOpen(r: RaffleWithMeta): boolean {
  return r.status === 'open' && new Date(r.registration_deadline) > new Date()
}

/** 抽獎活動列表、報名與個人開獎結果 */
export function RaffleActivityPanel({ open, onClose }: RaffleActivityPanelProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const [raffles, setRaffles] = useState<RaffleWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [giftCoupons, setGiftCoupons] = useState<
    Awaited<ReturnType<typeof fetchMemberCartGiftCoupons>>
  >([])

  const reload = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const rows = await fetchPublicRaffles(user?.id ?? null)
      const ongoing = rows.filter(
        (r) => r.status === 'open' || (r.status === 'drawn' && r.is_active)
      )
      setRaffles(ongoing)
      if (user?.id) {
        setGiftCoupons(await fetchMemberCartGiftCoupons(user.id))
      } else {
        setGiftCoupons([])
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!open || !user?.id) return
    void reload()
  }, [open, reload, user?.id])

  const myDrawnResults = useMemo(
    () =>
      raffles.filter(
        (r) => r.status === 'drawn' && r.user_entered && user
      ),
    [raffles, user]
  )

  useEffect(() => {
    if (!open || myDrawnResults.length === 0) return
    markRaffleResultsSeen(myDrawnResults.map((r) => r.id))
  }, [open, myDrawnResults])

  const handleRegister = async (raffleId: string) => {
    if (!user?.id) return
    setRegisteringId(raffleId)
    setMessage('')
    try {
      await registerForRaffle(raffleId, user.id)
      setMessage('報名成功！')
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '報名失敗')
    } finally {
      setRegisteringId(null)
    }
  }

  if (!open) return null

  const openRaffles = raffles.filter(isRegistrationOpen)
  const hasResults = myDrawnResults.length > 0

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-void/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="raffle-panel-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <GlassPanel className="rounded-t-2xl p-6 sm:rounded-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="raffle-panel-title"
              className="font-display text-xl tracking-wide text-white"
            >
              抽獎活動
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1 text-sm text-white/50 hover:text-white"
            >
              關閉
            </button>
          </div>

          {message && (
            <p className="mb-3 text-sm text-amber-glow/90" role="status">
              {message}
            </p>
          )}

          {authLoading ? (
            <p className="text-sm text-white/40">載入中…</p>
          ) : !profile ? (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                抽獎活動僅開放給登入會員。請先登入或註冊，即可報名參加抽獎。
              </p>
              <MemberAuthForm variant="checkout" />
            </div>
          ) : loading ? (
            <p className="text-sm text-white/40">載入中…</p>
          ) : (
            <>
              {hasResults && (
                <section className="mb-6 space-y-3">
                  <p className="text-xs tracking-widest text-white/45">開獎結果</p>
                  {myDrawnResults.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-4 ${
                        r.user_is_winner
                          ? 'border-amber-glow/50 bg-amber-glow/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <RafflePrizeDisplay raffle={r} imageSize="sm" />
                      {r.user_is_winner ? (
                        <div className="mt-3 flex flex-col items-center gap-2 text-center">
                          <RouletteWheelIcon className="h-10 w-10 text-amber-glow raffle-fab-win-pulse rounded-full" />
                          <p className="font-display text-2xl tracking-wide text-amber-glow">
                            恭喜中獎！
                          </p>
                          <p className="text-sm text-white/70">
                            禮物券已發送至您的帳戶，可兌換至購物車後結帳領取。
                          </p>
                          {giftCoupons
                            .filter((mc) => mc.coupon.source_raffle_id === r.id)
                            .map((mc) => (
                              <RaffleGiftRedeemButton
                                key={mc.id}
                                memberCoupon={mc}
                                onRedeemed={() => void reload()}
                                className="mt-2"
                              />
                            ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-center text-base text-white/75">
                          沒中獎，再接再厲
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              )}

              <section>
                <p className="mb-3 text-xs tracking-widest text-white/45">
                  現正進行中
                </p>
                {openRaffles.length === 0 ? (
                  <p className="text-sm text-white/40">
                    目前沒有開放報名的抽獎活動，請稍後再來看看。
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {openRaffles.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-4"
                      >
                        <RafflePrizeDisplay raffle={r} />
                        <p className="mt-3 text-xs text-white/40">
                          報名截止：{formatDeadline(r.registration_deadline)} · 已報名{' '}
                          {r.entry_count} 人
                        </p>
                        {r.user_entered ? (
                          <p className="mt-3 text-sm text-emerald-300/90">
                            您已報名參加
                          </p>
                        ) : (
                          <button
                            type="button"
                            disabled={registeringId === r.id}
                            onClick={() => void handleRegister(r.id)}
                            className="mt-3 rounded-lg bg-amber-glow/20 px-4 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/30 disabled:opacity-50"
                          >
                            {registeringId === r.id ? '報名中…' : '報名參加'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
