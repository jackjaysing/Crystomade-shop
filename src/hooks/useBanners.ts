import { useCallback, useEffect, useState } from 'react'
import { fetchActiveBanners, fetchAllBanners } from '../lib/api/banners'
import { formatErrorMessage } from '../lib/formatError'
import type { AnnouncementBanner } from '../lib/types'

interface UseBannersOptions {
  /** 後台模式：取得全部橫幅（含停用） */
  admin?: boolean
  enabled?: boolean
  refetchOnFocus?: boolean
}

/** 公告橫幅列表 hook */
export function useBanners(options: UseBannersOptions = {}) {
  const { admin = false, enabled = true, refetchOnFocus = !admin } = options
  const [banners, setBanners] = useState<AnnouncementBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const data = admin ? await fetchAllBanners() : await fetchActiveBanners()
      setBanners(data)
    } catch (e) {
      setError(formatErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [admin, enabled])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return

    const handleVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }

    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', handleVisible)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refetchOnFocus, enabled, reload])

  return { banners, loading, error, reload }
}
