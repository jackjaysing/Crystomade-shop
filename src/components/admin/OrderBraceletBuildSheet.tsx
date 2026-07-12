import { useMemo } from 'react'
import { BEAD_SIZE_DISPLAY_PX } from '../../constants/beadSizes'
import { formatBraceletSizeLabel } from '../../constants/braceletSizes'
import {
  formatBraceletConfigSummary,
  formatBeadElements,
  formatBeadSizeLabel,
  type BraceletConfig,
  type BraceletConfigBead,
} from '../../lib/braceletConfig'
import { BeadThumb } from '../bracelet/BeadThumb'
import { BraceletBeadPreview } from '../bracelet/BraceletBeadPreview'

interface OrderBraceletBuildSheetProps {
  config: BraceletConfig
}

interface BeadTally {
  key: string
  name: string
  size: BraceletConfigBead['size']
  image_url: string
  elements: BraceletConfigBead['elements']
  count: number
}

function tallyBeads(beads: BraceletConfigBead[]): BeadTally[] {
  const map = new Map<string, BeadTally>()
  for (const bead of beads) {
    const key = `${bead.bead_id}|${bead.size}`
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(key, {
      key,
      name: bead.name,
      size: bead.size,
      image_url: bead.image_url,
      elements: bead.elements,
      count: 1,
    })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hant'))
}

/** 後台訂單：客戶配置手串串製清單（含預覽＋珠材統計） */
export function OrderBraceletBuildSheet({ config }: OrderBraceletBuildSheetProps) {
  const tallies = useMemo(() => tallyBeads(config.beads), [config.beads])

  return (
    <div className="mt-2 rounded-lg border border-violet-400/25 bg-violet-400/5 p-3">
      <p className="text-sm tracking-wider text-violet-200/90">
        串製清單 · {formatBraceletConfigSummary(config)}
        {config.wrist_size
          ? ` · ${formatBraceletSizeLabel(config.wrist_size).replace(/^規格：/, '')}`
          : ''}
      </p>
      {config.request_official_review && (
        <p className="mt-1.5 rounded border border-amber-glow/30 bg-amber-glow/10 px-2.5 py-1.5 text-sm text-amber-glow">
          客戶要求：請官方協助確認此配置是否準確
        </p>
      )}
      <p className="mt-1.5 text-xs text-white/45">自行配珠 · 五行提示僅供參考</p>
      {(config.goals.elements.length > 0 || config.goals.efficacy.length > 0) && (
        <p className="mt-1.5 text-sm text-white/55">
          客戶目標：
          {config.goals.elements.length > 0
            ? `五行 ${config.goals.elements.join('、')}`
            : ''}
          {config.goals.elements.length > 0 && config.goals.efficacy.length > 0
            ? ' · '
            : ''}
          {config.goals.efficacy.length > 0
            ? `功效 ${config.goals.efficacy.join('、')}`
            : ''}
        </p>
      )}

      <div className="mt-3 rounded border border-white/10 bg-black/25 p-3">
        <p className="text-xs tracking-wider text-white/45">珠材統計（共 {config.beads.length} 顆）</p>
        <ul className="mt-2 space-y-2">
          {tallies.map((row) => (
            <li key={row.key} className="flex items-center gap-2.5 text-sm text-white/85">
              <BeadThumb
                imageUrl={row.image_url}
                name={row.name}
                elements={row.elements}
                sizePx={32}
              />
              <span className="min-w-0 flex-1 truncate">
                {row.name}
                <span className="text-white/40"> · {formatBeadSizeLabel(row.size)}</span>
              </span>
              <span className="shrink-0 rounded-full border border-amber-glow/35 bg-amber-glow/10 px-2.5 py-0.5 text-sm font-medium text-amber-glow">
                ×{row.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-xs tracking-wider text-white/40">
          預覽（點選珠子可看名稱）
        </p>
        <BraceletBeadPreview beads={config.beads} />
      </div>

      <p className="mt-3 text-xs text-white/40">
        請依下列順序選級串製（等級由你評估，不顯示給客戶）
      </p>
      <ol className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
        {config.beads.map((bead, index) => {
          const px = Math.max(32, Math.min(BEAD_SIZE_DISPLAY_PX[bead.size] ?? 40, 40))
          return (
            <li
              key={`${bead.bead_id}-${index}`}
              className="flex items-center gap-2.5 rounded border border-white/10 bg-black/20 p-2 text-sm text-white/80"
            >
              <span className="w-5 shrink-0 text-center text-white/35">{index + 1}</span>
              <BeadThumb
                imageUrl={bead.image_url}
                name={bead.name}
                elements={bead.elements}
                sizePx={px}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-white">{bead.name}</span>
                <span className="text-xs text-white/40">
                  {formatBeadElements(bead.elements)}
                  {' · '}
                  {formatBeadSizeLabel(bead.size)}
                  {bead.efficacy_tags.length > 0
                    ? ` · ${bead.efficacy_tags.join('、')}`
                    : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
