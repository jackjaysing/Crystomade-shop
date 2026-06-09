-- ============================================================
-- 晶刻學研所：後台發布水晶知識文章（富文本 HTML）
-- Supabase Dashboard → SQL Editor 執行
-- ============================================================

CREATE TABLE IF NOT EXISTS academy_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  body_html TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT academy_articles_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT academy_articles_slug_len CHECK (char_length(trim(slug)) BETWEEN 1 AND 160)
);

COMMENT ON TABLE academy_articles IS '晶刻學研所文章（後台發布 · 前台公開）';
COMMENT ON COLUMN academy_articles.body_html IS '消毒後的富文本 HTML（標題、段落、清單、圖片）';
COMMENT ON COLUMN academy_articles.excerpt IS '列表摘要（建議 80～160 字）';

CREATE INDEX IF NOT EXISTS idx_academy_articles_published
  ON academy_articles (is_published, sort_order, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_academy_articles_slug
  ON academy_articles (slug);

ALTER TABLE academy_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "讀取學研文章" ON academy_articles;
CREATE POLICY "讀取學研文章"
  ON academy_articles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "新增學研文章" ON academy_articles;
CREATE POLICY "新增學研文章"
  ON academy_articles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "更新學研文章" ON academy_articles;
CREATE POLICY "更新學研文章"
  ON academy_articles FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "刪除學研文章" ON academy_articles;
CREATE POLICY "刪除學研文章"
  ON academy_articles FOR DELETE
  USING (true);
