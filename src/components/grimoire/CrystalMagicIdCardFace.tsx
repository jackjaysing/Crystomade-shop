import type { ReactNode } from 'react'
import { FIVE_ELEMENTS, type FiveElement } from '../../constants/fiveElements'
import { formatEfficacyTags } from '../../lib/efficacyTags'
import { resolveSoulCardDisplayHeadlines } from '../../lib/grimoireFulfillment'

export interface CrystalMagicIdCardFaceProps {
  magicTitle?: string | null
  productName: string
  serialNumber: string
  magicAffiliation: string
  elementPrimary: string
  productTags?: string[] | null
  fiveElements?: string[] | null
  magicBirthDate?: string | null
  productImageUrl?: string | null
  selectedSize?: string | null
  /** 有 QR 時顯示掃描區；簽約後可改顯示封印章 */
  qrDataUrl?: string | null
  signedStamp?: boolean
  className?: string
}

function formatBirthDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return '—'
  const parts = isoDate.trim().slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

function CrystalConstellationBg() {
  return (
    <svg
      className="crystal-id-card__constellation"
      viewBox="0 0 900 650"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g
        fill="none"
        stroke="rgba(212,184,116,0.22)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        <path d="M70 520 L110 460 L160 490 L130 560 Z M110 460 L145 420 L190 455" />
        <path d="M40 180 L85 130 L130 165 L95 220 Z M85 130 L120 90" />
        <path d="M780 90 L830 50 L870 95 L835 145 Z M830 50 L855 20" />
        <path d="M820 520 L860 470 L900 510 L870 560 Z" />
        <path d="M200 80 L235 40 L275 70 L245 110 Z" />
        <path d="M620 560 L660 510 L710 545 L675 595 Z" />
        <path d="M500 40 L540 10 L575 45 L545 80 Z" />
        <path d="M30 360 L60 320 L95 350 L70 390 Z" />
      </g>
      <g fill="rgba(232,201,122,0.28)">
        <circle cx="110" cy="460" r="2.2" />
        <circle cx="145" cy="420" r="1.6" />
        <circle cx="830" cy="50" r="2" />
        <circle cx="660" cy="510" r="1.8" />
        <circle cx="235" cy="40" r="1.5" />
        <circle cx="60" cy="320" r="1.4" />
      </g>
    </svg>
  )
}

function QrOrnateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="crystal-id-card__qr-ornament">
      <svg className="crystal-id-card__qr-rays" viewBox="0 0 200 200" aria-hidden>
        <g
          fill="none"
          stroke="rgba(212,184,116,0.55)"
          strokeWidth="1.1"
          transform="translate(100 100)"
        >
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <line
              key={deg}
              x1="0"
              y1="-88"
              x2="0"
              y2="-72"
              transform={`rotate(${deg})`}
            />
          ))}
          <polygon
            points="0,-68 18,-18 68,0 18,18 0,68 -18,18 -68,0 -18,-18"
            stroke="rgba(232,201,122,0.65)"
            strokeWidth="1.2"
          />
          <circle r="58" stroke="rgba(201,168,76,0.35)" />
          <circle r="52" stroke="rgba(201,168,76,0.22)" strokeDasharray="3 4" />
        </g>
      </svg>
      <div className="crystal-id-card__qr-inner">{children}</div>
    </div>
  )
}

/** 橫式燙金水晶魔法身分證畫面（會員／後台預覽共用） */
export function CrystalMagicIdCardFace({
  magicTitle,
  productName,
  serialNumber,
  magicAffiliation,
  elementPrimary,
  productTags,
  fiveElements,
  magicBirthDate,
  productImageUrl,
  selectedSize,
  qrDataUrl,
  signedStamp = false,
  className = '',
}: CrystalMagicIdCardFaceProps) {
  const headlines = resolveSoulCardDisplayHeadlines(magicTitle ?? '', productName)
  const active = new Set(fiveElements ?? [])
  const showQr = Boolean(qrDataUrl)
  const showRight = showQr || signedStamp

  return (
    <article className={`crystal-id-card ${className}`.trim()}>
      <CrystalConstellationBg />
      {productImageUrl && (
        <img
          src={productImageUrl}
          alt=""
          className="crystal-id-card__hero-fade"
          aria-hidden
        />
      )}
      <div className="crystal-id-card__frame" aria-hidden />

      <header className="crystal-id-card__head">
        <p className="crystal-id-card__eyebrow">CRYSTAL GRIMOIRE</p>
        <h2 className="crystal-id-card__title">水晶魔法身分證</h2>
      </header>

      <div className={`crystal-id-card__body${showRight ? '' : ' crystal-id-card__body--solo'}`}>
        <div className="crystal-id-card__main">
          <div className="crystal-id-card__hero">
            {productImageUrl ? (
              <img
                src={productImageUrl}
                alt={productName}
                className="crystal-id-card__thumb"
              />
            ) : (
              <span className="crystal-id-card__glyph">✦</span>
            )}
            <div className="crystal-id-card__hero-text">
              <p className="crystal-id-card__name">{headlines.primary}</p>
              {headlines.secondary && (
                <p className="crystal-id-card__product">{headlines.secondary}</p>
              )}
              {selectedSize?.trim() && (
                <p className="crystal-id-card__size">尺寸 · {selectedSize.trim()}</p>
              )}
            </div>
          </div>

          <dl className="crystal-id-card__grid">
            <div>
              <dt>魔法編號</dt>
              <dd className="crystal-id-card__serial">{serialNumber}</dd>
            </div>
            <div>
              <dt>出生日期</dt>
              <dd>{formatBirthDate(magicBirthDate)}</dd>
            </div>
            <div>
              <dt>魔法系別</dt>
              <dd>{magicAffiliation}</dd>
            </div>
            <div>
              <dt>主屬性</dt>
              <dd className="crystal-id-card__primary">{elementPrimary}</dd>
            </div>
            <div className="crystal-id-card__span2">
              <dt>功效類別</dt>
              <dd>{formatEfficacyTags(productTags)}</dd>
            </div>
          </dl>

          <div className="crystal-id-card__elements" role="list" aria-label="五行">
            {FIVE_ELEMENTS.map((el: FiveElement) => (
              <span
                key={el}
                role="listitem"
                className={
                  active.has(el) || el === elementPrimary
                    ? 'crystal-id-card__el crystal-id-card__el--on'
                    : 'crystal-id-card__el'
                }
              >
                {el}
              </span>
            ))}
          </div>
        </div>

        {showRight && (
          <aside className="crystal-id-card__side">
            <QrOrnateFrame>
              {showQr ? (
                <img src={qrDataUrl!} alt="掃描簽署契約" className="crystal-id-card__qr" />
              ) : (
                <div className="crystal-id-card__stamp">
                  <span>已簽約</span>
                </div>
              )}
            </QrOrnateFrame>
            <p className="crystal-id-card__qr-hint">
              {showQr ? (
                <>
                  掃描
                  <br />
                  簽署契約
                </>
              ) : (
                '靈魂印記已啟'
              )}
            </p>
          </aside>
        )}
      </div>

      <p className="crystal-id-card__footer">晶刻 CRYSTOMADE · 靈魂印記</p>
    </article>
  )
}
