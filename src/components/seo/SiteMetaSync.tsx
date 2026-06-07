import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDefaultSiteMeta } from '../../lib/siteMeta'

/** 依路由同步全站預設 title／description／OG */
export function SiteMetaSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    applyDefaultSiteMeta(pathname)
  }, [pathname])

  return null
}
