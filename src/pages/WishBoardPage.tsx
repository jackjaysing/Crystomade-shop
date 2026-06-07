import { useState, type FormEvent } from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { MemberAuthForm } from '../components/member/MemberAuthForm'
import { GlassPanel } from '../components/ui/GlassPanel'
import { useAuth } from '../contexts/AuthContext'
import { submitWishMessage } from '../lib/api/wishBoard'

const MAX_CONTENT_LEN = 500

/** 前台許願留言板（僅登入會員可許願） */
export function WishBoardPage() {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setSubmitting(true)
    setSubmitMessage('')
    try {
      await submitWishMessage({
        content,
        displayName: profile.real_name,
        memberId: user.id,
      })
      setContent('')
      setSubmitMessage('許願已送出！我們會留意你的心願，感謝你的回饋。')
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : '送出失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        <section aria-labelledby="wish-board-heading">
        <p className="text-xs tracking-[0.4em] text-amber-glow/60">WISH BOARD</p>
        <h1 id="wish-board-heading" className="mt-2 font-display text-4xl text-white sm:text-5xl">許願留言板</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          版上找不到想要的商品？登入會員後告訴我們你的心願，我們會依需求規劃上架。
        </p>

        {profile ? (
          <GlassPanel className="mt-8 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-glow/30 bg-amber-glow/10">
                <MessageSquareHeart className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl text-white">寫下你的心願</h2>
                <p className="mt-1 text-xs text-white/45">
                  以會員「{profile.real_name}」身分送出 · 例如：紫水晶手鍊、特定礦石擺件等
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="wish-content" className="mb-2 block text-xs text-white/50">
                  許願內容
                </label>
                <textarea
                  id="wish-content"
                  required
                  rows={5}
                  maxLength={MAX_CONTENT_LEN}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="描述你希望上架的商品類型、款式或材質…"
                  className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/25 focus:border-amber-glow/40 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-white/30">
                  {content.length}/{MAX_CONTENT_LEN}
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full rounded-lg bg-amber-glow/90 px-4 py-3 text-sm font-medium tracking-wide text-void transition hover:bg-amber-glow disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {submitting ? '送出中…' : '送出許願'}
              </button>
              {submitMessage && (
                <p
                  className={`text-sm ${
                    submitMessage.includes('已送出')
                      ? 'text-amber-glow/90'
                      : 'text-red-300/90'
                  }`}
                >
                  {submitMessage}
                </p>
              )}
            </form>
          </GlassPanel>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <GlassPanel className="p-6 sm:p-8">
              <p className="text-sm text-white/60">
                許願留言板僅開放給登入會員。請先登入或註冊，即可告訴我們你希望看到的商品。
              </p>
            </GlassPanel>
            <MemberAuthForm variant="page" />
          </div>
        )}
        </section>
      </div>
    </div>
  )
}
