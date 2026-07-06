import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CrystalMagicBook } from '../components/grimoire/CrystalMagicBook'
import { GlassPanel } from '../components/ui/GlassPanel'
import { fetchPublicCrystalSoulCard } from '../lib/api/grimoire'
import type { CrystalSoulCard } from '../lib/types'

/** 友人分享：唯讀魔導書（封印動畫 → 內頁） */
export function CrystalSoulCardPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const [card, setCard] = useState<CrystalSoulCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug?.trim()) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setNotFound(false)

    void fetchPublicCrystalSoulCard(slug)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          setCard(null)
        } else {
          setCard(row)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setCard(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div className="magic-bookshelf-page min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <Link to="/products" className="magic-link-back">
          ← 返回典藏選購
        </Link>
        <p className="magic-page-eyebrow mt-6">SHARED GRIMOIRE</p>
        <h1 className="magic-page-heading magic-foil-text mt-2">水晶魔法身分證</h1>

        <div className="mt-8">
          {loading ? (
            <GlassPanel className="p-6 text-sm text-white/40">符文感應中…</GlassPanel>
          ) : notFound || !card ? (
            <GlassPanel className="p-6 text-sm text-white/45">
              找不到此魔法頁面，可能連結已失效，或擁有者尚未開啟分享。
            </GlassPanel>
          ) : (
            <CrystalMagicBook card={card} mode="public" />
          )}
        </div>
      </div>
    </div>
  )
}
