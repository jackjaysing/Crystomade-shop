import { useMemo, useState } from 'react'
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

function beadKey(bead: Pick<BraceletConfigBead, 'bead_id' | 'size'>) {
  return `${bead.bead_id}|${bead.size}`
}

/** 後台訂單：圓盤預覽＋依序串製（點選顯示種類與總數） */
export function OrderBraceletBuildSheet({ config }: OrderBraceletBuildSheetProps) {
  const countByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const bead of config.beads) {
      const key = beadKey(bead)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [config.beads])

  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const selected =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < config.beads.length
      ? config.beads[selectedIndex]
      : null
  const selectedTotal = selected ? (countByKey.get(beadKey(selected)) ?? 0) : 0

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

      <div className="mt-3">
        <p className="mb-2 text-xs tracking-wider text-white/40">圓盤預覽</p>
        <BraceletBeadPreview beads={config.beads} showStrip={false} />
      </div>

      <div className="mt-3 rounded border border-white/10 bg-black/25 p-3">
        <p className="text-xs tracking-wider text-white/45">
          依序串製（共 {config.beads.length} 顆 · 點選查看種類與數量 · 等級由你評估）
        </p>
        <div className="mt-2 -mx-1 overflow-x-auto px-1 pb-1">
          <ol className="flex min-w-max items-end gap-1.5">
            {config.beads.map((bead, index) => {
              const isSelected = selectedIndex === index
              const total = countByKey.get(beadKey(bead)) ?? 0
              return (
                <li key={`${bead.bead_id}-${index}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((prev) => (prev === index ? null : index))
                    }
                    className={`flex w-11 flex-col items-center gap-1 rounded-md p-1 transition ${
                      isSelected
                        ? 'bg-amber-glow/15 ring-1 ring-amber-glow/50'
                        : 'hover:bg-white/5'
                    }`}
                    title={`${index + 1}. ${bead.name}（共 ${total} 顆）`}
                  >
                    <span className="text-[10px] leading-none text-white/40">{index + 1}</span>
                    <BeadThumb
                      imageUrl={bead.image_url}
                      name={bead.name}
                      elements={bead.elements}
                      sizePx={32}
                      emphasize={isSelected}
                    />
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
        {selected && selectedIndex != null ? (
          <div className="mt-2 flex items-start gap-2.5 rounded border border-amber-glow/20 bg-black/40 px-2.5 py-2">
            <BeadThumb
              imageUrl={selected.image_url}
              name={selected.name}
              elements={selected.elements}
              sizePx={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-amber-glow/80">第 {selectedIndex + 1} 顆</p>
              <p className="mt-0.5 text-sm font-medium text-white">{selected.name}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/50">
                {formatBeadElements(selected.elements)}
                {' · '}
                {formatBeadSizeLabel(selected.size)}
                {selected.efficacy_tags.length > 0
                  ? ` · ${selected.efficacy_tags.join('、')}`
                  : ''}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-glow/35 bg-amber-glow/10 px-2.5 py-0.5 text-sm font-medium text-amber-glow">
              共 ×{selectedTotal}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/35">點選上方珠子查看種類與本串總數量</p>
        )}
      </div>
    </div>
  )
}
