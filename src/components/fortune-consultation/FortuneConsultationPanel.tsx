import { useState, type FormEvent } from 'react'
import { ExternalLink, MoonStar } from 'lucide-react'
import { MemberAuthForm } from '../member/MemberAuthForm'
import { GlassPanel } from '../ui/GlassPanel'
import { useAuth } from '../../contexts/AuthContext'
import { submitFortuneConsultation } from '../../lib/api/fortuneConsultation'
import {
  FORTUNE_IG_URL,
  FORTUNE_TEACHER_NAME,
} from '../../constants/fortuneConsultation'

const MAX_QUESTION_LEN = 500
const MAX_LINE_ID_LEN = 50

interface FortuneConsultationPanelProps {
  open: boolean
  onClose: () => void
}

/** 命理諮詢懸浮視窗 */
export function FortuneConsultationPanel({
  open,
  onClose,
}: FortuneConsultationPanelProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const [question, setQuestion] = useState('')
  const [lineId, setLineId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user?.id || !profile) return

    setSubmitting(true)
    setSubmitMessage('')
    try {
      await submitFortuneConsultation({
        question,
        lineId,
        displayName: profile.real_name,
        memberId: user.id,
      })
      setQuestion('')
      setLineId('')
      setSubmitMessage(
        '諮詢已送出！命理老師將透過 Line 與您聯絡，請留意訊息。'
      )
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
      aria-labelledby="fortune-panel-title"
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
                <MoonStar className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
              </div>
              <h2
                id="fortune-panel-title"
                className="font-display text-xl tracking-wide text-white"
              >
                命理諮詢
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

          {authLoading ? (
            <p className="text-sm text-white/40">載入中…</p>
          ) : !profile ? (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                命理諮詢僅開放給登入會員。請先登入或註冊，即可填寫諮詢表單。
              </p>
              <MemberAuthForm variant="checkout" />
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-xl border border-amber-glow/20 bg-amber-glow/5 p-4">
                <p className="text-sm font-medium text-amber-glow/90">
                  命理老師 {FORTUNE_TEACHER_NAME}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  歡迎追蹤 Instagram 了解更多，或直接填寫下方表單，老師將透過 Line 與您聯絡。
                </p>
                <a
                  href={FORTUNE_IG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-glow/35 bg-amber-glow/10 px-4 py-2.5 text-sm text-amber-glow transition hover:border-amber-glow/60 hover:bg-amber-glow/15"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  前往 {FORTUNE_TEACHER_NAME} Instagram
                </a>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-white/45">
                  會員「{profile.real_name}」送出（選填姓名已帶入後台參考）
                </p>

                <div>
                  <label
                    htmlFor="fortune-panel-question"
                    className="mb-2 block text-xs text-white/50"
                  >
                    諮詢問題 *
                  </label>
                  <textarea
                    id="fortune-panel-question"
                    required
                    rows={5}
                    maxLength={MAX_QUESTION_LEN}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="請描述您想諮詢的命理問題…"
                    className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/25 focus:border-amber-glow/40 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-xs text-white/30">
                    {question.length}/{MAX_QUESTION_LEN}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="fortune-panel-line-id"
                    className="mb-2 block text-xs text-white/50"
                  >
                    Line ID *
                  </label>
                  <input
                    id="fortune-panel-line-id"
                    type="text"
                    required
                    maxLength={MAX_LINE_ID_LEN}
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="請填寫您的 Line ID，方便老師與您聯絡"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-amber-glow/40 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !question.trim() || !lineId.trim()}
                  className="w-full rounded-lg bg-amber-glow/90 px-4 py-3 text-sm font-medium tracking-wide text-void transition hover:bg-amber-glow disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
                >
                  {submitting ? '送出中…' : '送出諮詢'}
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
            </>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
