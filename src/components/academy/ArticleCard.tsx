import { Link } from 'react-router-dom'
import { articleDetailPath } from '../../lib/articleSlug'
import type { AcademyArticle } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

function formatArticleDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface ArticleCardProps {
  article: AcademyArticle
}

export function ArticleCard({ article }: ArticleCardProps) {
  const dateLabel = formatArticleDate(article.published_at ?? article.created_at)

  return (
    <Link to={articleDetailPath(article.slug)} className="group block h-full">
      <GlassPanel className="flex h-full flex-col overflow-hidden p-0 transition hover:border-amber-glow/25">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt=""
            className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-amber-glow/10 to-transparent text-xs tracking-[0.3em] text-white/25">
            ACADEMY
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <p className="text-[11px] text-white/35">{dateLabel}</p>
          <h2 className="mt-2 font-display text-xl text-white transition group-hover:text-amber-glow">
            {article.title}
          </h2>
          {article.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/50">
              {article.excerpt}
            </p>
          ) : null}
          <span className="mt-4 text-xs text-amber-glow/80">閱讀全文 →</span>
        </div>
      </GlassPanel>
    </Link>
  )
}
