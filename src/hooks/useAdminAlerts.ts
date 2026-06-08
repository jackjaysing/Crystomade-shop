import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNewFortuneConsultationsSince,
  fetchNewMembersSince,
  fetchNewOrdersSince,
  fetchNewWishMessagesSince,
  type AdminAlertFortune,
  type AdminAlertMember,
  type AdminAlertOrder,
  type AdminAlertWish,
} from '../lib/api/adminAlerts'
import { playAdminNotificationSound } from '../lib/adminNotificationSound'

const WATERMARK_KEY = 'crystomade-admin-alerts-watermark'
const NOTIFIED_ORDERS_KEY = 'crystomade-admin-alerts-orders'
const NOTIFIED_MEMBERS_KEY = 'crystomade-admin-alerts-members'
const NOTIFIED_WISHES_KEY = 'crystomade-admin-alerts-wishes'
const NOTIFIED_FORTUNES_KEY = 'crystomade-admin-alerts-fortunes'
const POLL_MS = 30_000

export type AdminAlertItem =
  | { type: 'order'; id: string; at: string; title: string; detail: string }
  | { type: 'member'; id: string; at: string; title: string; detail: string }
  | { type: 'wish'; id: string; at: string; title: string; detail: string }
  | { type: 'fortune'; id: string; at: string; title: string; detail: string }

function loadWatermark(): string {
  const stored = sessionStorage.getItem(WATERMARK_KEY)
  if (stored) return stored
  const now = new Date().toISOString()
  sessionStorage.setItem(WATERMARK_KEY, now)
  return now
}

function loadNotifiedSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveNotifiedSet(key: string, set: Set<string>) {
  sessionStorage.setItem(key, JSON.stringify([...set].slice(-200)))
}

function saveWatermark(value: string) {
  sessionStorage.setItem(WATERMARK_KEY, value)
}

function formatOrderAlert(order: AdminAlertOrder): AdminAlertItem {
  const label = order.order_number ? `訂單 ${order.order_number}` : '新訂單'
  return {
    type: 'order',
    id: order.checkoutKey,
    at: order.created_at,
    title: label,
    detail: `${order.buyer_name} · NT$ ${order.total_amount.toLocaleString()}`,
  }
}

function formatMemberAlert(member: AdminAlertMember): AdminAlertItem {
  return {
    type: 'member',
    id: member.id,
    at: member.created_at,
    title: '新會員註冊',
    detail: `${member.real_name || '未填姓名'} · ${member.phone}`,
  }
}

function formatWishAlert(wish: AdminAlertWish): AdminAlertItem {
  const preview =
    wish.content.length > 40 ? `${wish.content.slice(0, 40)}…` : wish.content
  return {
    type: 'wish',
    id: wish.id,
    at: wish.created_at,
    title: '新許願留言',
    detail: `${wish.display_name} · ${preview}`,
  }
}

function formatFortuneAlert(fortune: AdminAlertFortune): AdminAlertItem {
  const preview =
    fortune.question.length > 40
      ? `${fortune.question.slice(0, 40)}…`
      : fortune.question
  return {
    type: 'fortune',
    id: fortune.id,
    at: fortune.created_at,
    title: '新命理諮詢',
    detail: `${fortune.contact_name} · ${preview}`,
  }
}

function pushDesktopNotification(item: AdminAlertItem) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification('晶刻後台通知', {
      body: `${item.title} — ${item.detail}`,
      icon: '/logomark.png',
      tag: `${item.type}-${item.id}`,
    })
  } catch {
    // 略過
  }
}

interface UseAdminAlertsOptions {
  enabled: boolean
  onNewOrders?: () => void
  onNewMembers?: () => void
  onNewWishes?: () => void
  onNewFortunes?: () => void
}

/** 後台新訂單／新註冊輪詢通知 */
export function useAdminAlerts({
  enabled,
  onNewOrders,
  onNewMembers,
  onNewWishes,
  onNewFortunes,
}: UseAdminAlertsOptions) {
  const [alerts, setAlerts] = useState<AdminAlertItem[]>([])
  const [orderBadge, setOrderBadge] = useState(0)
  const [memberBadge, setMemberBadge] = useState(0)
  const [wishBadge, setWishBadge] = useState(0)
  const [fortuneBadge, setFortuneBadge] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )

  const watermarkRef = useRef(loadWatermark())
  const notifiedOrdersRef = useRef(loadNotifiedSet(NOTIFIED_ORDERS_KEY))
  const notifiedMembersRef = useRef(loadNotifiedSet(NOTIFIED_MEMBERS_KEY))
  const notifiedWishesRef = useRef(loadNotifiedSet(NOTIFIED_WISHES_KEY))
  const notifiedFortunesRef = useRef(loadNotifiedSet(NOTIFIED_FORTUNES_KEY))
  const pollingRef = useRef(false)

  const appendAlerts = useCallback((items: AdminAlertItem[]) => {
    if (items.length === 0) return
    setAlerts((prev) => [...items, ...prev].slice(0, 12))
    setToast(items[0].title + '：' + items[0].detail)
    playAdminNotificationSound()
    for (const item of items) {
      pushDesktopNotification(item)
    }
  }, [])

  const poll = useCallback(async () => {
    if (!enabled || pollingRef.current) return

    pollingRef.current = true
    try {
      const since = watermarkRef.current
      const [orders, members, wishes, fortunes] = await Promise.all([
        fetchNewOrdersSince(since),
        fetchNewMembersSince(since),
        fetchNewWishMessagesSince(since),
        fetchNewFortuneConsultationsSince(since),
      ])

      const newOrderAlerts: AdminAlertItem[] = []
      let newOrderCount = 0
      let maxAt = since

      for (const order of orders) {
        if (notifiedOrdersRef.current.has(order.checkoutKey)) continue
        notifiedOrdersRef.current.add(order.checkoutKey)
        newOrderAlerts.push(formatOrderAlert(order))
        newOrderCount += 1
        if (order.created_at > maxAt) maxAt = order.created_at
      }

      const newMemberAlerts: AdminAlertItem[] = []
      let newMemberCount = 0

      for (const member of members) {
        if (notifiedMembersRef.current.has(member.id)) continue
        notifiedMembersRef.current.add(member.id)
        newMemberAlerts.push(formatMemberAlert(member))
        newMemberCount += 1
        if (member.created_at > maxAt) maxAt = member.created_at
      }

      const newWishAlerts: AdminAlertItem[] = []
      let newWishCount = 0

      for (const wish of wishes) {
        if (notifiedWishesRef.current.has(wish.id)) continue
        notifiedWishesRef.current.add(wish.id)
        newWishAlerts.push(formatWishAlert(wish))
        newWishCount += 1
        if (wish.created_at > maxAt) maxAt = wish.created_at
      }

      const newFortuneAlerts: AdminAlertItem[] = []
      let newFortuneCount = 0

      for (const fortune of fortunes) {
        if (notifiedFortunesRef.current.has(fortune.id)) continue
        notifiedFortunesRef.current.add(fortune.id)
        newFortuneAlerts.push(formatFortuneAlert(fortune))
        newFortuneCount += 1
        if (fortune.created_at > maxAt) maxAt = fortune.created_at
      }

      if (maxAt !== since) {
        watermarkRef.current = maxAt
        saveWatermark(maxAt)
      }
      saveNotifiedSet(NOTIFIED_ORDERS_KEY, notifiedOrdersRef.current)
      saveNotifiedSet(NOTIFIED_MEMBERS_KEY, notifiedMembersRef.current)
      saveNotifiedSet(NOTIFIED_WISHES_KEY, notifiedWishesRef.current)
      saveNotifiedSet(NOTIFIED_FORTUNES_KEY, notifiedFortunesRef.current)

      const combined = [
        ...newOrderAlerts,
        ...newMemberAlerts,
        ...newWishAlerts,
        ...newFortuneAlerts,
      ].sort((a, b) => b.at.localeCompare(a.at))
      if (combined.length > 0) {
        appendAlerts(combined)
        if (newOrderCount > 0) {
          setOrderBadge((n) => n + newOrderCount)
          onNewOrders?.()
        }
        if (newMemberCount > 0) {
          setMemberBadge((n) => n + newMemberCount)
          onNewMembers?.()
        }
        if (newWishCount > 0) {
          setWishBadge((n) => n + newWishCount)
          onNewWishes?.()
        }
        if (newFortuneCount > 0) {
          setFortuneBadge((n) => n + newFortuneCount)
          onNewFortunes?.()
        }
      }
    } catch {
      // 靜默略過單次輪詢失敗
    } finally {
      pollingRef.current = false
      setListening(true)
    }
  }, [appendAlerts, enabled, onNewFortunes, onNewMembers, onNewOrders, onNewWishes])

  useEffect(() => {
    if (!enabled) return
    void poll()
    const timer = window.setInterval(() => void poll(), POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled, poll])

  const requestDesktopNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setDesktopPermission(result)
  }, [])

  const clearOrderBadge = useCallback(() => setOrderBadge(0), [])
  const clearMemberBadge = useCallback(() => setMemberBadge(0), [])
  const clearWishBadge = useCallback(() => setWishBadge(0), [])
  const clearFortuneBadge = useCallback(() => setFortuneBadge(0), [])
  const dismissToast = useCallback(() => setToast(null), [])
  const clearAlerts = useCallback(() => setAlerts([]), [])

  return {
    alerts,
    orderBadge,
    memberBadge,
    wishBadge,
    fortuneBadge,
    toast,
    listening,
    desktopPermission,
    requestDesktopNotifications,
    clearOrderBadge,
    clearMemberBadge,
    clearWishBadge,
    clearFortuneBadge,
    dismissToast,
    clearAlerts,
    refreshNow: poll,
  }
}
