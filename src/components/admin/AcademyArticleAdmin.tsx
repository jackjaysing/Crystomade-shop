import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createAcademyArticle,
  deleteAcademyArticle,
  fetchAllAcademyArticles,
  updateAcademyArticle,
  uploadAcademyImage,
} from '../../lib/api/academyArticles'
import { articleDetailPath } from '../../lib/articleSlug'
import { BROWSER_IMAGE_ACCEPT } from '../../lib/browserImage'
import type { AcademyArticle, AcademyArticleFormData } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'
import { RichTextEditor } from './RichTextEditor'

const emptyForm: AcademyArticleFormData = {
  title: '',
  excerpt: '',
  cover_image_url: null,
  body_html: '',
  is_published: false,
}

interface AcademyArticleAdminProps {
  enabled?: boolean
}

/** 後台：晶刻學研所文章管理 */
export function AcademyArticleAdmin({ enabled = true }: AcademyArticleAdminProps) {
  const [articles, setArticles] = useState<AcademyArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<AcademyArticleFormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setMessage('')
    try {
      setArticles(await fetchAllAcademyArticles())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setCoverFile(null)
    setCoverPreview(null)
  }

  const loadEdit = (article: AcademyArticle) => {
    setEditingId(article.id)
    setForm({
      title: article.title,
      excerpt: article.excerpt,
      cover_image_url: article.cover_image_url,
      body_html: article.body_html,
      is_published: article.is_published,
    })
    setCoverFile(null)
    setCoverPreview(article.cover_image_url)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      let coverUrl = form.cover_image_url
      if (coverFile) {
        coverUrl = await uploadAcademyImage(coverFile)
      }

      const payload: AcademyArticleFormData = {
        ...form,
        cover_image_url: coverUrl,
      }

      if (editingId) {
        const current = articles.find((a) => a.id === editingId)
        await updateAcademyArticle(editingId, payload, current?.published_at ?? null)
        setMessage('已更新文章')
      } else {
        await createAcademyArticle(payload)
        setMessage('已新增文章')
      }

      resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (article: AcademyArticle) => {
    if (!confirm(`確定刪除「${article.title}」？`)) return
    try {
      await deleteAcademyArticle(article.id)
      setMessage('已刪除文章')
      if (editingId === article.id) resetForm()
      await reload()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const tableMissing = /migration-add-academy-articles/i.test(message)

  return (
    <div className="space-y-8">
      {message && (
        <p
          className={`text-sm ${tableMissing ? 'text-red-300/90' : 'text-amber-glow/90'}`}
          role="status"
        >
          {message}
        </p>
      )}

      <GlassPanel className="p-6">
        <h3 className="font-display text-lg text-white">
          {editingId ? '編輯文章' : '新增文章'}
        </h3>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="文章標題 *"
            className="input-field"
            required
          />
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="列表摘要（建議 80～160 字，選填）"
            rows={2}
            className="input-field"
          />

          <div>
            <p className="mb-2 text-xs text-white/50">封面圖（選填）</p>
            <div className="flex flex-wrap items-start gap-4">
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="封面預覽"
                  className="h-24 w-40 rounded-lg object-cover"
                />
              )}
              <label className="cursor-pointer rounded-lg border border-dashed border-white/25 px-4 py-3 text-sm text-white/50 hover:border-amber-glow/40 hover:text-white/70">
                上傳封面
                <input
                  type="file"
                  accept={BROWSER_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setCoverFile(file)
                    setCoverPreview(URL.createObjectURL(file))
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-white/50">可插圖的富文本 *</p>
            <RichTextEditor
              value={form.body_html}
              onChange={(body_html) => setForm({ ...form, body_html })}
              onUploadImage={uploadAcademyImage}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm({ ...form, is_published: e.target.checked })
              }
              className="rounded border-white/30"
            />
            發布至前台晶研所
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-glow/20 px-5 py-2 text-sm text-amber-glow transition hover:bg-amber-glow/30 disabled:opacity-50"
            >
              {submitting ? '儲存中…' : editingId ? '儲存變更' : '新增文章'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/20 px-5 py-2 text-sm text-white/60 hover:text-white"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>
      </GlassPanel>

      <section>
        <h3 className="font-display text-xl text-white">文章列表</h3>
        {loading ? (
          <p className="mt-4 text-sm text-white/40">載入中…</p>
        ) : articles.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">尚無文章</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {articles.map((article) => (
              <li key={article.id}>
                <GlassPanel className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{article.title}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {article.is_published ? '已發布' : '草稿'} ·{' '}
                        {article.published_at
                          ? new Date(article.published_at).toLocaleString('zh-TW')
                          : '尚未發布'}
                      </p>
                      {article.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/50">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {article.is_published && (
                        <a
                          href={articleDetailPath(article.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                        >
                          預覽
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => loadEdit(article)}
                        className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(article)}
                        className="rounded border border-red-400/30 px-3 py-1.5 text-xs text-red-300/80 hover:bg-red-400/10"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </GlassPanel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
