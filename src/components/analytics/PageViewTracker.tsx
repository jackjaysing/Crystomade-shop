import { usePageViewTracker } from '../../hooks/usePageViewTracker'

/** 掛在路由內，自動記錄前台瀏覽次數 */
export function PageViewTracker() {
  usePageViewTracker()
  return null
}
