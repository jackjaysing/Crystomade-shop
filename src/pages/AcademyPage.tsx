import { useEffect, useState } from 'react'
import { fetchPublishedAcademyArticles } from '../lib/api/academyArticles'
import type { AcademyArticle } from '../lib/types'
import { ArticleCard } from '../components/academy/ArticleCard'
import { GlassPanel } from '../components/ui/GlassPanel'

/** 晶刻學研所：水晶知識文章列表 */
export function AcademyPage() {
  const [articles, setArticles] = useState<AcademyArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchPublishedAcademyArticles()
      .then((rows) => {
        if (!cancelled) {
          setArticles(rows)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setArticles([])
          setError(err instanceof Error ? err.message : '載入失敗')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-6xl px-6">
        <section aria-labelledby="academy-heading">
          <p className="text-xs tracking-[0.4em] text-amber-glow/60">ACADEMY</p>
          <h1 id="academy-heading" className="mt-2 font-display text-4xl text-white sm:text-5xl">
            晶研所
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
            由晶刻團隊整理的水晶保養、五行選石與配戴知識，協助您更了解天然晶石與能量水晶。
          </p>
        </section>

        <div className="mt-10">
          {loading && <p className="text-sm text-white/40">載入文章中…</p>}

          {error && (
            <GlassPanel className="p-6 text-sm text-red-300/90">
              {error}
              <p className="mt-2 text-xs text-white/45">
                若為新功能，請在 Supabase SQL Editor 執行
                supabase/migration-add-academy-articles.sql
              </p>
            </GlassPanel>
          )}

          {!loading && !error && articles.length === 0 && (
            <GlassPanel className="p-8 text-center text-sm text-white/45">
              文章準備中，敬請期待。
            </GlassPanel>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
