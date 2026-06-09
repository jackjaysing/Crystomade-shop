import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPageMeta } from '../../lib/siteMeta'
import { OrganizationStructuredData } from './OrganizationStructuredData'
import { WebSiteStructuredData } from './WebSiteStructuredData'

function isProductDetailPath(pathname: string): boolean {
  return pathname.startsWith('/products/') && pathname.length > '/products/'.length
}

function isAcademyArticlePath(pathname: string): boolean {
  return pathname.startsWith('/academy/') && pathname.length > '/academy/'.length
}

/** 依路由同步各頁 title／description／OG */
export function SiteMetaSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (isProductDetailPath(pathname) || isAcademyArticlePath(pathname)) return
    applyPageMeta(pathname)
  }, [pathname])

  return (
    <>
      <OrganizationStructuredData />
      <WebSiteStructuredData />
    </>
  )
}
