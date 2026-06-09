import { sanitizeArticleHtml } from '../../lib/sanitizeArticleHtml'

interface ArticleBodyProps {
  html: string
}

/** 學研所文章內文（消毒後渲染） */
export function ArticleBody({ html }: ArticleBodyProps) {
  const safeHtml = sanitizeArticleHtml(html)
  if (!safeHtml) {
    return <p className="text-sm text-white/40">尚無內容</p>
  }

  return (
    <div
      className="academy-article-body"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
