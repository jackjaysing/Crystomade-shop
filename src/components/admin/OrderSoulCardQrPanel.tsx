import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, IdCard, ImageDown, ImageUp, Printer, QrCode, Save } from 'lucide-react'
import { FIVE_ELEMENTS, type FiveElement } from '../../constants/fiveElements'
import { MAGIC_AFFILIATION_OPTIONS } from '../../constants/grimoire'
import {
  fetchFulfillmentSoulCards,
  replaceFulfillmentSoulCardImage,
  setFulfillmentSoulCardBirthDate,
  setFulfillmentSoulCardProfile,
  type FulfillmentSoulCard,
} from '../../lib/api/grimoire'
import { BROWSER_IMAGE_ACCEPT } from '../../lib/browserImage'
import { crystalSoulCardActivationUrl } from '../../lib/grimoire'
import { pickEfficacyTags, formatEfficacyTags } from '../../lib/efficacyTags'
import { isBespokeSoulCardProduct, resolveSoulCardDisplayHeadlines } from '../../lib/grimoireFulfillment'
import { openFulfillmentIdCardPrint, openFulfillmentQrOnlyPrint } from '../../lib/fulfillmentIdCardPrint'
import { shareOrDownloadFulfillmentIdCard } from '../../lib/fulfillmentIdCardImage'
import { AdminEfficacyTagsPicker } from './AdminEfficacyTagsPicker'

interface OrderSoulCardQrPanelProps {
  orderIds: string[]
  paid: boolean
}

function formatBirthDateLabel(isoDate: string | null): string {
  if (!isoDate?.trim()) return '尚未填寫'
  const parts = isoDate.slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

function FulfillmentFiveElements({ elements }: { elements: string[] }) {
  const active = new Set(elements)
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="五行">
      {FIVE_ELEMENTS.map((el: FiveElement) => (
        <span
          key={el}
          className={
            active.has(el)
              ? 'inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-glow/50 bg-amber-glow/15 text-[11px] text-amber-glow'
              : 'inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] text-white/25'
          }
        >
          {el}
        </span>
      ))}
    </div>
  )
}

function FulfillmentIdCardPreview({
  card,
  birthDate,
  qrDataUrl,
  onBirthDateChange,
  onSaveBirthDate,
  savingBirthDate,
  birthDateMessage,
  onProfileSaved,
  onImageSaved,
}: {
  card: FulfillmentSoulCard
  birthDate: string
  qrDataUrl: string
  onBirthDateChange: (value: string) => void
  onSaveBirthDate: () => void
  savingBirthDate: boolean
  birthDateMessage: string
  onProfileSaved: (
    cardId: string,
    profile: Pick<
      FulfillmentSoulCard,
      | 'element_primary'
      | 'magic_affiliation'
      | 'product_tags'
      | 'five_elements'
      | 'magic_title'
    >
  ) => void
  onImageSaved: (cardId: string, imageUrl: string | null) => void
}) {
  const bespoke = isBespokeSoulCardProduct(card.product_name)
  const [magicTitle, setMagicTitle] = useState(card.magic_title)
  const headlines = resolveSoulCardDisplayHeadlines(magicTitle, card.product_name)
  const [elementPrimary, setElementPrimary] = useState(card.element_primary)
  const [magicAffiliation, setMagicAffiliation] = useState(card.magic_affiliation)
  const [efficacyTags, setEfficacyTags] = useState(() => pickEfficacyTags(card.product_tags))
  const [fiveElements, setFiveElements] = useState(card.five_elements)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [imageUrl, setImageUrl] = useState(card.product_image_url)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageMessage, setImageMessage] = useState('')
  const [savingCardImage, setSavingCardImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setImageUrl(card.product_image_url)
  }, [card.id, card.product_image_url])

  useEffect(() => {
    setMagicTitle(card.magic_title)
  }, [card.id, card.magic_title])

  useEffect(() => {
    setElementPrimary(card.element_primary)
    setMagicAffiliation(card.magic_affiliation)
    setEfficacyTags(pickEfficacyTags(card.product_tags))
    setFiveElements(card.five_elements)
  }, [
    card.id,
    card.element_primary,
    card.magic_affiliation,
    card.product_tags,
    card.five_elements,
  ])

  const affiliationOptions = MAGIC_AFFILIATION_OPTIONS.includes(
    magicAffiliation as (typeof MAGIC_AFFILIATION_OPTIONS)[number]
  )
    ? [...MAGIC_AFFILIATION_OPTIONS]
    : [...MAGIC_AFFILIATION_OPTIONS, magicAffiliation]

  const handleImageChange = async (file: File | null) => {
    if (!file) return
    setUploadingImage(true)
    setImageMessage('')
    try {
      const savedUrl = await replaceFulfillmentSoulCardImage(card.id, file)
      setImageUrl(savedUrl)
      onImageSaved(card.id, savedUrl)
      setImageMessage('照片已更新')
      window.setTimeout(() => setImageMessage(''), 2500)
    } catch (err) {
      setImageMessage(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    const trimmedTitle = magicTitle.trim()
    if (bespoke && !trimmedTitle) {
      setProfileMessage('請填寫手串名稱')
      return
    }

    setSavingProfile(true)
    setProfileMessage('')
    try {
      const updated = await setFulfillmentSoulCardProfile(card.id, {
        element_primary: elementPrimary,
        magic_affiliation: magicAffiliation,
        product_tags: efficacyTags,
        ...(bespoke ? { magic_title: trimmedTitle } : {}),
      })
      setFiveElements(updated.five_elements)
      if (updated.magic_title) setMagicTitle(updated.magic_title)
      onProfileSaved(card.id, {
        element_primary: updated.element_primary,
        magic_affiliation: updated.magic_affiliation,
        product_tags: updated.product_tags,
        five_elements: updated.five_elements,
        magic_title: updated.magic_title ?? trimmedTitle,
      })
      setProfileMessage('靈魂卡屬性已儲存')
      window.setTimeout(() => setProfileMessage(''), 2500)
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSavingProfile(false)
    }
  }

  const buildCardData = () => ({
    magic_title: magicTitle.trim() || card.magic_title,
    serial_number: card.serial_number,
    product_name: card.product_name,
    selected_size: card.selected_size,
    element_primary: elementPrimary,
    magic_affiliation: magicAffiliation,
    five_elements: fiveElements,
    product_tags: efficacyTags,
    chakra: card.chakra,
    resonance_keyword: card.resonance_keyword,
    product_image_url: imageUrl,
    magic_birth_date: birthDate || card.magic_birth_date,
    qr_data_url: qrDataUrl,
  })

  const printCard = () => {
    if (!qrDataUrl) {
      window.alert('QR 碼尚未產生，請稍候再試')
      return
    }
    openFulfillmentIdCardPrint(buildCardData())
  }

  const handleSaveCardImage = async () => {
    if (!qrDataUrl) {
      window.alert('QR 碼尚未產生，請稍候再試')
      return
    }
    setSavingCardImage(true)
    try {
      const result = await shareOrDownloadFulfillmentIdCard(buildCardData())
      setImageMessage(result === 'shared' ? '已開啟分享' : '身分證圖片已儲存')
      window.setTimeout(() => setImageMessage(''), 2500)
    } catch (err) {
      setImageMessage(err instanceof Error ? err.message : '圖片產生失敗')
    } finally {
      setSavingCardImage(false)
    }
  }

  return (
    <div className="fulfillment-id-preview min-w-0 flex-1 rounded-lg border border-violet-400/20 bg-gradient-to-br from-[#1c1610] via-[#221c14] to-[#14100c] p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <label
            className={`group relative block h-14 w-14 cursor-pointer overflow-hidden rounded border border-amber-glow/30 ${
              uploadingImage ? 'pointer-events-none opacity-60' : 'hover:border-amber-glow/55'
            }`}
            title="點擊上傳替換照片"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={card.product_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/20 text-lg text-amber-glow/70">
                ✦
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
              <ImageUp className="h-4 w-4 text-amber-glow" aria-hidden />
            </span>
            <input
              ref={imageInputRef}
              type="file"
              accept={BROWSER_IMAGE_ACCEPT}
              className="sr-only"
              disabled={uploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                void handleImageChange(file)
              }}
            />
          </label>
          <p className="mt-1 max-w-[3.5rem] text-center text-[9px] leading-tight text-white/35">
            {uploadingImage ? '上傳中…' : '更換照片'}
          </p>
          {imageMessage && (
            <p className="mt-0.5 max-w-[4.5rem] text-center text-[9px] text-amber-glow/80" role="status">
              {imageMessage}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="fid-eyebrow text-[10px] text-amber-glow/65">實體身分證預覽</p>
          <p className="fid-title mt-1 text-sm magic-foil-heading">{headlines.primary}</p>
          {headlines.secondary && (
            <p className="mt-0.5 text-xs text-white/50">{headlines.secondary}</p>
          )}
          {bespoke && (
            <p className="mt-1 text-[10px] leading-relaxed text-amber-glow/75">
              量身訂製 · 請為此手串命名、上傳成品照片，並依客人命盤設定主屬性、魔法系別與功效後再列印
            </p>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="fid-label text-[10px] text-white/35">魔法編號</dt>
          <dd className="fid-serial mt-0.5 text-[11px] text-amber-glow/85">{card.serial_number}</dd>
        </div>
        <div>
          <dt className="fid-label text-[10px] text-white/35">出生日期</dt>
          <dd className="mt-0.5 text-white/75">
            {formatBirthDateLabel(birthDate || card.magic_birth_date)}
          </dd>
        </div>
        <div>
          <dt className="fid-label text-[10px] text-white/35">魔法系別</dt>
          <dd className="mt-0.5 text-white/75">{magicAffiliation}</dd>
        </div>
        <div>
          <dt className="fid-label text-[10px] text-white/35">主屬性</dt>
          <dd className="fid-primary mt-0.5 text-sm magic-foil-text-subtle">{elementPrimary}</dd>
        </div>
        <div className="col-span-2">
          <dt className="fid-label text-[10px] text-white/35">功效類別</dt>
          <dd className="mt-0.5 text-white/75">{formatEfficacyTags(efficacyTags)}</dd>
        </div>
      </dl>

      {fiveElements.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] tracking-wider text-white/35">五行印記</p>
          <FulfillmentFiveElements elements={fiveElements} />
        </div>
      )}

      {(card.chakra || card.resonance_keyword) && (
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          {[card.chakra ? `脈輪 · ${card.chakra}` : '', card.resonance_keyword ? `共鳴 · ${card.resonance_keyword}` : '']
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {qrDataUrl && (
        <div className="mt-3 flex items-center gap-3 rounded border border-white/10 bg-black/20 px-3 py-2">
          <img
            src={qrDataUrl}
            alt="簽約 QR"
            className="h-14 w-14 shrink-0 rounded border border-white/15 bg-white p-0.5"
          />
          <p className="text-[10px] leading-relaxed text-white/40">
            列印身分證時將一併印出此 QR<br />供買家掃描簽署契約
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
        <p className="text-[10px] tracking-wider text-white/45">
          {bespoke ? '量身訂製 · 靈魂卡屬性' : '靈魂卡屬性（可調整）'}
        </p>
        {bespoke && (
          <label className="block text-[10px] tracking-wider text-white/45">
            手串名稱
            <input
              type="text"
              value={magicTitle}
              onChange={(e) => setMagicTitle(e.target.value)}
              placeholder="例如：星河守望 · 木系專屬"
              maxLength={80}
              className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-white/25"
            />
          </label>
        )}
        <label className="block text-[10px] tracking-wider text-white/45">
          主屬性
          <select
            value={elementPrimary}
            onChange={(e) => setElementPrimary(e.target.value)}
            className="admin-select mt-1 w-full text-xs"
          >
            {FIVE_ELEMENTS.map((el: FiveElement) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] tracking-wider text-white/45">
          魔法系別
          <select
            value={magicAffiliation}
            onChange={(e) => setMagicAffiliation(e.target.value)}
            className="admin-select mt-1 w-full text-xs"
          >
            {affiliationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-[10px] tracking-wider text-white/45">功效類別</p>
          <div className="mt-1.5">
            <AdminEfficacyTagsPicker value={efficacyTags} onChange={setEfficacyTags} />
          </div>
        </div>
        <button
          type="button"
          disabled={savingProfile}
          onClick={() => void handleSaveProfile()}
          className="inline-flex items-center gap-1 rounded border border-violet-400/35 bg-violet-400/10 px-2.5 py-1 text-[11px] text-violet-200 hover:bg-violet-400/20 disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          {savingProfile ? '儲存中…' : '儲存屬性'}
        </button>
        {profileMessage && (
          <p className="text-[11px] text-amber-glow/80" role="status">
            {profileMessage}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
        <label className="block text-[10px] tracking-wider text-white/45">
          出生日期（出貨前填寫）
          <input
            type="date"
            value={birthDate}
            onChange={(e) => onBirthDateChange(e.target.value)}
            className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white [color-scheme:dark]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingBirthDate}
            onClick={onSaveBirthDate}
            className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-[11px] text-white/70 hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-40"
          >
            <Save className="h-3 w-3" />
            {savingBirthDate ? '儲存中…' : '儲存日期'}
          </button>
          <button
            type="button"
            disabled={!qrDataUrl}
            onClick={printCard}
            className="inline-flex items-center gap-1 rounded border border-amber-glow/35 bg-amber-glow/10 px-2.5 py-1 text-[11px] text-amber-glow hover:bg-amber-glow/20 disabled:opacity-40"
          >
            <IdCard className="h-3 w-3" />
            列印身分證
          </button>
          <button
            type="button"
            disabled={!qrDataUrl || savingCardImage}
            onClick={() => void handleSaveCardImage()}
            className="inline-flex items-center gap-1 rounded border border-violet-400/35 bg-violet-400/10 px-2.5 py-1 text-[11px] text-violet-200 hover:bg-violet-400/20 disabled:opacity-40"
          >
            <ImageDown className="h-3 w-3" />
            {savingCardImage ? '產生中…' : '儲存／分享身分證'}
          </button>
        </div>
        {birthDateMessage && (
          <p className="text-[11px] text-amber-glow/80" role="status">
            {birthDateMessage}
          </p>
        )}
      </div>
    </div>
  )
}

function SoulCardQrCard({
  card,
  onBirthDateSaved,
  onProfileSaved,
  onImageSaved,
}: {
  card: FulfillmentSoulCard
  onBirthDateSaved: (cardId: string, birthDate: string | null) => void
  onProfileSaved: (
    cardId: string,
    profile: Pick<
      FulfillmentSoulCard,
      | 'element_primary'
      | 'magic_affiliation'
      | 'product_tags'
      | 'five_elements'
      | 'magic_title'
    >
  ) => void
  onImageSaved: (cardId: string, imageUrl: string | null) => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [birthDate, setBirthDate] = useState(card.magic_birth_date ?? '')
  const [savingBirthDate, setSavingBirthDate] = useState(false)
  const [birthDateMessage, setBirthDateMessage] = useState('')

  const activationUrl =
    card.activation_slug != null
      ? crystalSoulCardActivationUrl(card.activation_slug)
      : ''

  useEffect(() => {
    setBirthDate(card.magic_birth_date ?? '')
  }, [card.magic_birth_date, card.id])

  useEffect(() => {
    if (!activationUrl) return
    let cancelled = false
    void QRCode.toDataURL(activationUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#1a1410', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [activationUrl])

  const handleCopy = async () => {
    if (!activationUrl) return
    try {
      await navigator.clipboard.writeText(activationUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleSaveBirthDate = async () => {
    setSavingBirthDate(true)
    setBirthDateMessage('')
    try {
      await setFulfillmentSoulCardBirthDate(card.id, birthDate || null)
      onBirthDateSaved(card.id, birthDate || null)
      setBirthDateMessage('出生日期已儲存')
      window.setTimeout(() => setBirthDateMessage(''), 2500)
    } catch (err) {
      setBirthDateMessage(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSavingBirthDate(false)
    }
  }

  const handlePrintQr = () => {
    if (!qrDataUrl) return
    openFulfillmentQrOnlyPrint({
      magic_title: card.magic_title,
      serial_number: card.serial_number,
      qr_data_url: qrDataUrl,
    })
  }

  if (!card.activation_slug) return null

  return (
    <div className="rounded-lg border border-amber-glow/25 bg-amber-glow/[0.04] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="shrink-0 lg:w-[148px]">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`${card.serial_number} 簽約 QR`}
              className="mx-auto h-[120px] w-[120px] rounded-md border border-white/10 bg-white p-1 lg:mx-0"
            />
          ) : (
            <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/30 lg:mx-0">
              <QrCode className="h-8 w-8" />
            </div>
          )}
          <div className="mt-3 space-y-2">
            <p className="text-xs tracking-widest text-amber-glow/70">隨貨 QR · 簽署契約</p>
            {card.contract_signed_at ? (
              <p className="text-xs text-emerald-300/80">買家已簽署契約</p>
            ) : (
              <p className="text-xs text-white/40">待簽署 · 購買人或友人掃描皆可</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-[11px] text-white/70 hover:border-amber-glow/40 hover:text-amber-glow"
              >
                <Copy className="h-3 w-3" />
                {copied ? '已複製' : '複製連結'}
              </button>
              <button
                type="button"
                disabled={!qrDataUrl}
                onClick={handlePrintQr}
                className="inline-flex items-center gap-1 rounded border border-amber-glow/35 bg-amber-glow/10 px-2.5 py-1 text-[11px] text-amber-glow hover:bg-amber-glow/20 disabled:opacity-40"
              >
                <Printer className="h-3 w-3" />
                列印 QR
              </button>
            </div>
          </div>
        </div>

        <FulfillmentIdCardPreview
          card={card}
          birthDate={birthDate}
          qrDataUrl={qrDataUrl}
          onBirthDateChange={setBirthDate}
          onSaveBirthDate={() => void handleSaveBirthDate()}
          savingBirthDate={savingBirthDate}
          birthDateMessage={birthDateMessage}
          onProfileSaved={onProfileSaved}
          onImageSaved={onImageSaved}
        />
      </div>
    </div>
  )
}

/** 後台：已付款訂單的魔法身分證 QR 與實體卡內容（隨貨寄出） */
export function OrderSoulCardQrPanel({ orderIds, paid }: OrderSoulCardQrPanelProps) {
  const [cards, setCards] = useState<FulfillmentSoulCard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!paid || orderIds.length === 0) {
      setCards([])
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchFulfillmentSoulCards(orderIds)
      .then((rows) => {
        if (!cancelled) setCards(rows)
      })
      .catch(() => {
        if (!cancelled) setCards([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orderIds, paid])

  const handleBirthDateSaved = (cardId: string, birthDate: string | null) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, magic_birth_date: birthDate } : card
      )
    )
  }

  const handleProfileSaved = (
    cardId: string,
    profile: Pick<
      FulfillmentSoulCard,
      | 'element_primary'
      | 'magic_affiliation'
      | 'product_tags'
      | 'five_elements'
      | 'magic_title'
    >
  ) => {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, ...profile } : card))
    )
  }

  const handleImageSaved = (cardId: string, imageUrl: string | null) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, product_image_url: imageUrl } : card
      )
    )
  }

  if (!paid) return null
  if (loading) {
    return <p className="mt-4 text-xs text-white/35">載入魔法身分證 QR…</p>
  }
  if (cards.length === 0) return null

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs tracking-widest text-amber-glow/60">
        魔法身分證 · 隨貨 QR 與實體卡
      </p>
      {cards.map((card) => (
        <SoulCardQrCard
          key={card.id}
          card={card}
          onBirthDateSaved={handleBirthDateSaved}
          onProfileSaved={handleProfileSaved}
          onImageSaved={handleImageSaved}
        />
      ))}
    </div>
  )
}
