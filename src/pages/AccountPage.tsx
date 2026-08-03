import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountGate } from '../components/account/AccountGate'
import { AccountSectionHeader } from '../components/account/AccountSectionHeader'
import { AdminAccessSection } from '../components/account/AdminAccessSection'
import { MagicianLevelPanel } from '../components/grimoire/MagicianLevelPanel'
import { GlassPanel } from '../components/ui/GlassPanel'
import { MemberCouponsPanel } from '../components/member/MemberCouponsPanel'
import { MemberGiftCouponsPanel } from '../components/member/MemberGiftCouponsPanel'
import { MemberChangePasswordPanel } from '../components/member/MemberChangePasswordPanel'
import { MemberClaimReferralPanel } from '../components/member/MemberClaimReferralPanel'
import { MemberReferralPanel } from '../components/member/MemberReferralPanel'
import { MetalDivider } from '../components/ui/MetalDivider'
import {
  fetchMemberVipPurchaseXp,
  fetchMyCrystalSoulCards,
} from '../lib/api/grimoire'
import {
  FIRST_PURCHASE_POINTS_MULTIPLIER,
  MAX_ORDER_DISCOUNT_RATE,
  POINTS_PER_NTD_DISCOUNT,
  POINTS_PER_NTD_EARN,
} from '../constants/points'
import {
  calcDiscountNtdFromPoints,
  calcMinSubtotalToUseAllPointsDiscount,
} from '../lib/pointsCalculation'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchMemberOrders,
  fetchPointsHistory,
} from '../lib/api/members'
import { formatOrderLineDisplayAmount } from '../lib/formatOrderPricing'
import {
  formatOrderGroupStatus,
  formatOrderPaymentStatus,
  groupOrders,
} from '../lib/groupOrders'
import { formatPhoneDisplay } from '../lib/phoneAuth'
import type { CrystalSoulCard, Order, PointsHistoryEntry } from '../lib/types'

/** 會員中心：點數、VIP、券、推薦、訂單 */
export function AccountPage() {
  const { user, profile, loading, logout, refreshProfile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<PointsHistoryEntry[]>([])
  const [soulCards, setSoulCards] = useState<CrystalSoulCard[]>([])
  const [vipPurchaseXp, setVipPurchaseXp] = useState(0)
  const [dataLoading, setDataLoading] = useState(false)
  const [showPointsRules, setShowPointsRules] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    setDataLoading(true)

    Promise.all([
      fetchMemberOrders(user.id),
      fetchPointsHistory(user.id),
      fetchMyCrystalSoulCards(user.id),
      fetchMemberVipPurchaseXp(user.id),
      refreshProfile(),
    ])
      .then(([orderRows, historyRows, cards, vipXp]) => {
        if (cancelled) return
        setOrders(orderRows)
        setHistory(historyRows)
        setSoulCards(cards)
        setVipPurchaseXp(vipXp)
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([])
          setHistory([])
          setSoulCards([])
          setVipPurchaseXp(0)
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, refreshProfile])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-28 text-white/40">
        載入中…
      </div>
    )
  }

  if (!user || !profile) {
    return <AccountGate />
  }

  const orderGroups = groupOrders(orders)
  const pointsDiscountNtd = calcDiscountNtdFromPoints(profile.points)
  const minSubtotalForPointsDiscount =
    calcMinSubtotalToUseAllPointsDiscount(profile.points)

  const refreshAccountData = async () => {
    if (!user?.id) return
    const [orderRows, historyRows, cards, vipXp] = await Promise.all([
      fetchMemberOrders(user.id),
      fetchPointsHistory(user.id),
      fetchMyCrystalSoulCards(user.id),
      fetchMemberVipPurchaseXp(user.id),
      refreshProfile(),
    ])
    setOrders(orderRows)
    setHistory(historyRows)
    setSoulCards(cards)
    setVipPurchaseXp(vipXp)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 max-md:pb-[calc(14rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-2xl px-6">
        <section aria-labelledby="account-heading" className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="shop-eyebrow">MEMBER</p>
              <h1
                id="account-heading"
                className="mt-2 font-display text-4xl text-white"
              >
                會員中心
              </h1>
              <p className="mt-2 text-sm text-white/55">
                {profile.real_name} · {formatPhoneDisplay(profile.phone)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm text-white/45 transition hover:text-white/75"
            >
              登出
            </button>
          </div>

          <AdminAccessSection />

          <MagicianLevelPanel
            cards={soulCards}
            meritXp={profile.grimoire_merit_xp}
            purchaseAmount={vipPurchaseXp}
            showGrimoireLink
          />

          <GlassPanel className="overflow-hidden p-0">
            <div className="bg-gradient-to-br from-amber-glow/15 via-transparent to-transparent px-6 py-8 text-center sm:px-8 sm:py-10">
              <p className="shop-eyebrow">POINTS</p>
              <p className="mt-3 font-display text-5xl text-amber-glow sm:text-6xl">
                {profile.points}
              </p>
              <p className="mt-2 text-sm text-white/55">目前可用點數</p>
              {pointsDiscountNtd > 0 && (
                <p className="mt-3 text-sm text-amber-glow/90">
                  再消費 NT${minSubtotalForPointsDiscount.toLocaleString()}{' '}
                  可折抵 NT${pointsDiscountNtd.toLocaleString()}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/point-shop"
                  className="inline-block rounded-lg border border-amber-glow/40 bg-amber-glow/10 px-5 py-2.5 text-sm tracking-wide text-amber-glow transition hover:bg-amber-glow/20"
                >
                  前往點數商城
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPointsRules((open) => !open)}
                  className="text-sm text-white/45 underline decoration-white/20 underline-offset-2 transition hover:text-white/70"
                >
                  {showPointsRules ? '收合規則' : '點數規則'}
                </button>
              </div>
              {showPointsRules && (
                <p className="mx-auto mt-4 max-w-md text-left text-sm leading-relaxed text-white/50 sm:text-center">
                  消費回饋 2%（每 NT${POINTS_PER_NTD_EARN} 累 1 點）；每{' '}
                  {POINTS_PER_NTD_DISCOUNT} 點折 NT$1（單筆上限{' '}
                  {Math.round(MAX_ORDER_DISCOUNT_RATE * 100)}%）；首購{' '}
                  {FIRST_PURCHASE_POINTS_MULTIPLIER}{' '}
                  倍累點。已付款或已出貨後入帳。
                </p>
              )}
            </div>
          </GlassPanel>

          <MemberCouponsPanel userId={user.id} />
          <MemberGiftCouponsPanel userId={user.id} />

          <MemberClaimReferralPanel
            userId={user.id}
            profile={profile}
            onClaimed={refreshAccountData}
          />
          <MemberReferralPanel profile={profile} />

          <MemberChangePasswordPanel />

          <GlassPanel className="p-6 sm:p-8">
            <AccountSectionHeader eyebrow="POINTS LOG" title="點數紀錄" />
            {dataLoading && history.length === 0 ? (
              <p className="mt-5 text-sm text-white/45">載入中…</p>
            ) : history.length === 0 ? (
              <p className="mt-5 text-sm text-white/45">尚無點數變動紀錄</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/85">{entry.description}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {new Date(entry.created_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        entry.delta >= 0 ? 'text-emerald-400' : 'text-red-300'
                      }`}
                    >
                      {entry.delta >= 0 ? '+' : ''}
                      {entry.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel className="p-6 sm:p-8">
            <AccountSectionHeader eyebrow="ORDERS" title="訂單紀錄" />
            {dataLoading && orderGroups.length === 0 ? (
              <p className="mt-5 text-sm text-white/45">載入中…</p>
            ) : orderGroups.length === 0 ? (
              <p className="mt-5 text-sm text-white/45">
                尚無訂單，前往{' '}
                <Link to="/products" className="text-amber-glow hover:underline">
                  典藏選購
                </Link>
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {orderGroups.map((group) => (
                  <li
                    key={group.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white/90">
                          {group.orderNumber
                            ? `訂單 ${group.orderNumber}`
                            : '訂單'}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {new Date(group.created_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-amber-glow">
                          NT$ {group.totalAmount.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatOrderPaymentStatus(group.paymentStatus)} ·{' '}
                          {formatOrderGroupStatus(group.status)}
                        </p>
                      </div>
                    </div>
                    <div className="my-3">
                      <MetalDivider />
                    </div>
                    <ul className="space-y-2">
                      {group.lineItems.map((line) => (
                        <li
                          key={`${line.productId}-${line.variantName ?? ''}-${line.selectedSize ?? ''}`}
                          className="flex justify-between gap-2 text-sm text-white/70"
                        >
                          <span className="min-w-0 truncate">
                            {line.productName}
                            {line.variantName ? ` · ${line.variantName}` : ''}
                            {line.selectedSize ? ` · ${line.selectedSize}` : ''}
                            {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                          </span>
                          <span className="shrink-0 text-white/45">
                            NT$ {formatOrderLineDisplayAmount(line)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </section>
      </div>
    </div>
  )
}
