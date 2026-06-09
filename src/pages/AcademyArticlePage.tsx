import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArticleBody } from '../components/academy/ArticleBody'
import { GlassPanel } from '../components/ui/GlassPanel'
import { fetchPublishedAcademyArticleBySlug } from '../lib/api/academyArticles'
import { applyPageMeta } from '../lib/siteMeta'
import type { AcademyArticle } from '../lib/types'

/** 晶刻學研所：單篇文章 */
export function AcademyArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<AcademyArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchPublishedAcademyArticleBySlug(decodeURIComponent(slug))
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          setArticle(null)
          return
        }
        setArticle(row)
        setNotFound(false)
        applyPageMeta('/academy')
        document.title = `${row.title}｜晶研所`
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-28 text-white/40">
        載入中…
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-28 pb-16 text-center">
        <p className="text-white/50">找不到這篇文章</p>
        <Link
          to="/academy"
          className="mt-4 inline-block text-sm text-amber-glow hover:underline"
        >
          返回晶研所
        </Link>
      </div>
    )
  }

  const dateLabel = new Date(
    article.published_at ?? article.created_at
  ).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <article className="mx-auto max-w-3xl px-6">
        <Link
          to="/academy"
          className="text-sm text-white/45 transition hover:text-amber-glow"
        >
          ← 返回晶研所
        </Link>

        <header className="mt-6">
          <p className="text-xs tracking-[0.35em] text-amber-glow/70">ACADEMY</p>
          <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-white/40">{dateLabel}</p>
        </header>

        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover"
          />
        )}

        {article.excerpt && (
          <p className="mt-8 text-base leading-relaxed text-white/60">
            {article.excerpt}
          </p>
        )}

        <GlassPanel className="mt-8 p-6 sm:p-8">
          <ArticleBody html={article.body_html} />
        </GlassPanel>
      </article>
    </div>
  )
}
