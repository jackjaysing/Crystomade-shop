import { useState, type FormEvent } from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { MemberAuthForm } from '../member/MemberAuthForm'
import { GlassPanel } from '../ui/GlassPanel'
import { useAuth } from '../../contexts/AuthContext'
import { submitWishMessage } from '../../lib/api/wishBoard'

const MAX_CONTENT_LEN = 500

interface WishBoardPanelProps {
  open: boolean
  onClose: () => void
}

/** 許願板懸浮視窗 */
export function WishBoardPanel({ open, onClose }: WishBoardPanelProps) {
  const { user, profile, loading: authLoading } = useAuth()
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-void/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wish-panel-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <GlassPanel className="rounded-t-2xl p-6 sm:rounded-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-glow/30 bg-amber-glow/10">
                <MessageSquareHeart className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
              </div>
              <h2
                id="wish-panel-title"
                className="font-display text-xl tracking-wide text-white"
              >
                許願板
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1 text-sm text-white/50 hover:text-white"
            >
              關閉
            </button>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-white/50">
            版上找不到想要的商品？告訴我們你的心願，我們會依需求規劃上架。
          </p>

          {authLoading ? (
            <p className="text-sm text-white/40">載入中…</p>
          ) : profile ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-white/45">
                以會員「{profile.real_name}」身分送出
              </p>
              <div>
                <label htmlFor="wish-panel-content" className="mb-2 block text-xs text-white/50">
                  許願內容
                </label>
                <textarea
                  id="wish-panel-content"
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
                  role="status"
                >
                  {submitMessage}
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                許願板僅開放給登入會員。請先登入或註冊，即可告訴我們你希望看到的商品。
              </p>
              <MemberAuthForm variant="checkout" />
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
