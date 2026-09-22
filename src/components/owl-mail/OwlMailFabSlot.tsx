import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  OWL_MAIL_FAB_STORAGE_KEY,
  type OwlMailFabMode,
} from '../../constants/owlMail'
import {
  deleteOwlMessage,
  fetchMemberOwlMessages,
  markOwlMessageRead,
} from '../../lib/api/memberMessages'
import type { MemberOwlMessage } from '../../lib/types'
import { DeleteOwlMessageConfirmModal } from './DeleteOwlMessageConfirmModal'
import { OwlCourierArrival } from './OwlCourierArrival'
import { OwlLetterModal } from './OwlLetterModal'
import { OwlMailInboxPanel } from './OwlMailInboxPanel'

const POLL_MS = 45_000
const FLY_IN_KEY = 'owl_mail_fly_in_seen'

function readStoredMode(): OwlMailFabMode {
  try {
    const v = localStorage.getItem(OWL_MAIL_FAB_STORAGE_KEY)
    if (v === 'visible' || v === 'collapsed') return v
  } catch {
    /* ignore */
  }
  return 'visible'
}

/** 左側懸浮卷軸信件（信件匣可長期保留、重複開啟） */
export function OwlMailFabSlot() {
  const { user } = useAuth()
  const [mode, setMode] = useState<OwlMailFabMode>(() => readStoredMode())
  const [inboxOpen, setInboxOpen] = useState(false)
  const [messages, setMessages] = useState<MemberOwlMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MemberOwlMessage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [flyPhase, setFlyPhase] = useState<'off' | 'fly-in' | 'idle' | 'fly-away'>(
    'off'
  )
  const prevUnreadRef = useRef(0)

  const unreadCount = useMemo(
    () => messages.filter((m) => m.read_at == null).length,
    [messages]
  )
  const openMessage = openId
    ? (messages.find((m) => m.id === openId) ?? null)
    : null

  useEffect(() => {
    try {
      localStorage.setItem(OWL_MAIL_FAB_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  const reload = useCallback(async () => {
    if (!user?.id) {
      setMessages([])
      return
    }
    setLoading(true)
    try {
      const rows = await fetchMemberOwlMessages(50)
      setMessages(rows)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setMessages([])
      setFlyPhase('off')
      return
    }
    void reload()
    const id = window.setInterval(() => void reload(), POLL_MS)
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.id, reload])

  useEffect(() => {
    if (!user?.id) return

    if (unreadCount > 0 && prevUnreadRef.current === 0) {
      try {
        sessionStorage.removeItem(FLY_IN_KEY)
      } catch {
        /* ignore */
      }
    }
    prevUnreadRef.current = unreadCount

    if (unreadCount <= 0) {
      setFlyPhase((prev) =>
        prev === 'idle' || prev === 'fly-in' ? 'fly-away' : 'off'
      )
      return
    }
    if (inboxOpen || openId) {
      setFlyPhase('off')
      return
    }

    let seen = false
    try {
      seen = sessionStorage.getItem(FLY_IN_KEY) === '1'
    } catch {
      /* ignore */
    }

    if (!seen) {
      setFlyPhase('fly-in')
      try {
        sessionStorage.setItem(FLY_IN_KEY, '1')
      } catch {
        /* ignore */
      }
      const t = window.setTimeout(() => setFlyPhase('idle'), 2700)
      return () => window.clearTimeout(t)
    }

    setFlyPhase('idle')
  }, [unreadCount, user?.id, inboxOpen, openId])

  useEffect(() => {
    if (flyPhase !== 'fly-away') return
    const t = window.setTimeout(() => setFlyPhase('off'), 750)
    return () => window.clearTimeout(t)
  }, [flyPhase])

  const openInbox = () => {
    setInboxOpen(true)
    setFlyPhase('off')
    void reload()
  }

  const dismissArrival = () => {
    setFlyPhase('fly-away')
  }

  const openLetter = async (message: MemberOwlMessage) => {
    setOpenId(message.id)
    setInboxOpen(false)
    if (message.read_at == null) {
      try {
        await markOwlMessageRead(message.id)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, read_at: m.read_at ?? new Date().toISOString() }
              : m
          )
        )
      } catch {
        /* keep unread until next poll */
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await deleteOwlMessage(deleteTarget.id)
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id))
      if (openId === deleteTarget.id) {
        setOpenId(null)
        setInboxOpen(true)
      }
      setDeleteTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  if (!user?.id) return null

  const isCollapsed = mode === 'collapsed'
  const showArrival =
    flyPhase === 'fly-in' || flyPhase === 'idle' || flyPhase === 'fly-away'

  return (
    <>
      <div
        className={`flex flex-col items-start gap-1 transition-transform duration-300 ${
          isCollapsed ? '-translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
        }`}
      >
        {!isCollapsed && (
          <button
            type="button"
            title="向左收合"
            aria-label="向左收合信件匣"
            onClick={() => setMode('collapsed')}
            className="ml-3 rounded-md border border-white/10 bg-graphite/90 p-1 text-white/40 backdrop-blur-md hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              setMode('visible')
              openInbox()
              return
            }
            openInbox()
          }}
          className={`relative ml-2 flex flex-col items-center justify-center border border-amber-glow/40 bg-graphite/90 text-amber-glow shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(212,165,116,0.12)] backdrop-blur-md transition-all duration-300 hover:border-amber-glow/70 hover:bg-amber-glow/15 hover:text-white ${
            isCollapsed
              ? 'h-11 w-10 rounded-r-2xl'
              : 'h-[4.5rem] w-[4.5rem] rounded-full'
          } ${unreadCount > 0 ? 'raffle-fab-win-pulse' : ''}`}
          aria-label={
            unreadCount > 0
              ? `信件匣，${unreadCount} 封未讀`
              : '信件匣'
          }
          title={unreadCount > 0 ? `信件匣（${unreadCount} 未讀）` : '信件匣'}
        >
          {unreadCount > 0 && (
            <span
              className={`absolute z-10 rounded-full bg-red-500 px-1.5 py-0.5 font-bold leading-none text-white shadow-lg owl-mail-badge ${
                isCollapsed
                  ? '-right-0.5 -top-1 text-[8px]'
                  : '-right-1 -top-1 text-xs'
              }`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <Mail
            className={
              isCollapsed
                ? 'h-4 w-4 transition-all duration-300'
                : 'h-8 w-8 transition-all duration-300'
            }
            strokeWidth={1.75}
          />
          {!isCollapsed && (
            <span className="mt-0.5 text-xs font-medium tracking-wide">信件</span>
          )}
        </button>
      </div>

      {showArrival && (
        <OwlCourierArrival
          phase={flyPhase}
          unreadCount={unreadCount}
          onOpen={openInbox}
          onDismiss={dismissArrival}
        />
      )}

      <OwlMailInboxPanel
        open={inboxOpen && !openMessage}
        messages={messages}
        loading={loading}
        onClose={() => setInboxOpen(false)}
        onOpenMessage={(msg) => void openLetter(msg)}
        onRequestDelete={(msg) => setDeleteTarget(msg)}
      />

      {openMessage && (
        <OwlLetterModal
          message={openMessage}
          onClose={() => {
            setOpenId(null)
            setInboxOpen(true)
            void reload()
          }}
          onBackToInbox={() => {
            setOpenId(null)
            setInboxOpen(true)
            void reload()
          }}
          onRequestDelete={() => setDeleteTarget(openMessage)}
        />
      )}

      {deleteTarget && (
        <DeleteOwlMessageConfirmModal
          subject={deleteTarget.subject}
          deleting={deleting}
          onClose={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </>
  )
}
