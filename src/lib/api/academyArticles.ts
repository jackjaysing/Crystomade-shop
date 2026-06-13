import { buildArticleSlug } from '../articleSlug'
import { compressImageForUpload } from '../browserImage'
import { formatErrorMessage } from '../formatError'
import { sanitizeArticleHtml } from '../sanitizeArticleHtml'
import { isSupabaseConfigured, supabase, PRODUCT_IMAGE_BUCKET, STORAGE_IMAGE_CACHE_CONTROL } from '../supabase'
import type { AcademyArticle, AcademyArticleFormData } from '../types'

function normalizeArticle(row: Record<string, unknown>): AcademyArticle {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    excerpt: String(row.excerpt ?? ''),
    cover_image_url:
      row.cover_image_url != null ? String(row.cover_image_url) : null,
    body_html: String(row.body_html ?? ''),
    is_published: Boolean(row.is_published),
    sort_order: Number(row.sort_order ?? 0),
    published_at: row.published_at != null ? String(row.published_at) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function academyArticlesTableError(message: string): string | null {
  if (/academy_articles|schema cache|42P01|42703/i.test(message)) {
    return '資料庫尚未啟用晶研所，請在 Supabase SQL Editor 執行 supabase/migration-add-academy-articles.sql'
  }
  return null
}

function prepareFormPayload(form: AcademyArticleFormData) {
  const title = form.title.trim()
  if (!title) throw new Error('請填寫文章標題')

  const body_html = sanitizeArticleHtml(form.body_html)
  if (!body_html) throw new Error('請撰寫文章內容')

  return {
    title,
    excerpt: form.excerpt.trim(),
    cover_image_url: form.cover_image_url?.trim() || null,
    body_html,
    is_published: form.is_published,
  }
}

export async function uploadAcademyImage(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, 'banner')
  const ext = compressed.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `academy/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, compressed, { cacheControl: STORAGE_IMAGE_CACHE_CONTROL, upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('academy_articles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) {
    const msg = formatErrorMessage(error)
    throw new Error(academyArticlesTableError(msg) ?? msg)
  }
  const max = data?.[0]?.sort_order
  return typeof max === 'number' ? max + 1 : 0
}

/** 前台：已發布文章 */
export async function fetchPublishedAcademyArticles(): Promise<AcademyArticle[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('academy_articles')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    if (/academy_articles|42P01|42703/i.test(formatErrorMessage(error))) {
      return []
    }
    throw new Error(formatErrorMessage(error))
  }

  return (data ?? []).map((row) =>
    normalizeArticle(row as Record<string, unknown>)
  )
}

export async function fetchPublishedAcademyArticleBySlug(
  slug: string
): Promise<AcademyArticle | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('academy_articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    if (/academy_articles|42P01|42703/i.test(formatErrorMessage(error))) {
      return null
    }
    throw new Error(formatErrorMessage(error))
  }

  if (!data) return null
  return normalizeArticle(data as Record<string, unknown>)
}

/** 後台：全部文章 */
export async function fetchAllAcademyArticles(): Promise<AcademyArticle[]> {
  if (!isSupabaseConfigured) {
    throw new Error('請先在 .env 設定 Supabase 可發布金鑰（VITE_SUPABASE_ANON_KEY）')
  }

  const { data, error } = await supabase
    .from('academy_articles')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    const msg = formatErrorMessage(error)
    throw new Error(academyArticlesTableError(msg) ?? msg)
  }
  return (data ?? []).map((row) =>
    normalizeArticle(row as Record<string, unknown>)
  )
}

export async function createAcademyArticle(
  form: AcademyArticleFormData
): Promise<AcademyArticle> {
  const payload = prepareFormPayload(form)
  const sort_order = await getNextSortOrder()
  const now = new Date().toISOString()
  const tempId = crypto.randomUUID()
  const slug = buildArticleSlug(payload.title, tempId)

  const { data, error } = await supabase
    .from('academy_articles')
    .insert({
      ...payload,
      slug,
      sort_order,
      published_at: payload.is_published ? now : null,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    throw new Error(academyArticlesTableError(msg) ?? msg)
  }
  const article = normalizeArticle(data as Record<string, unknown>)

  if (article.slug !== buildArticleSlug(payload.title, article.id)) {
    const nextSlug = buildArticleSlug(payload.title, article.id)
    const { data: updated, error: updateError } = await supabase
      .from('academy_articles')
      .update({ slug: nextSlug, updated_at: now })
      .eq('id', article.id)
      .select()
      .single()

    if (updateError) {
      const msg = formatErrorMessage(updateError)
      throw new Error(academyArticlesTableError(msg) ?? msg)
    }
    return normalizeArticle(updated as Record<string, unknown>)
  }

  return article
}

export async function updateAcademyArticle(
  id: string,
  form: AcademyArticleFormData,
  currentPublishedAt: string | null
): Promise<AcademyArticle> {
  const payload = prepareFormPayload(form)
  const now = new Date().toISOString()
  const slug = buildArticleSlug(payload.title, id)
  const published_at =
    payload.is_published
      ? currentPublishedAt ?? now
      : null

  const { data, error } = await supabase
    .from('academy_articles')
    .update({
      ...payload,
      slug,
      published_at,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const msg = formatErrorMessage(error)
    throw new Error(academyArticlesTableError(msg) ?? msg)
  }
  return normalizeArticle(data as Record<string, unknown>)
}

export async function deleteAcademyArticle(id: string): Promise<void> {
  const { error } = await supabase.from('academy_articles').delete().eq('id', id)
  if (error) {
    const msg = formatErrorMessage(error)
    throw new Error(academyArticlesTableError(msg) ?? msg)
  }
}
