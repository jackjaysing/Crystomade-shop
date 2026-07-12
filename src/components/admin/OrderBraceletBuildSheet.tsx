import { formatBraceletConfigSummary, formatBeadElements, formatBeadSizeLabel, type BraceletConfig } from '../../lib/braceletConfig'
import { formatBraceletSizeLabel } from '../../constants/braceletSizes'

interface OrderBraceletBuildSheetProps {
  config: BraceletConfig
}

/** 後台訂單：客戶配置手串串製清單 */
export function OrderBraceletBuildSheet({ config }: OrderBraceletBuildSheetProps) {
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
      <p className="mt-1.5 text-xs text-white/45">
        自行配珠 · 五行提示僅供參考
      </p>
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
      <p className="mt-1.5 text-xs text-white/40">
        請依下列順序選級串製（等級由你評估，不顯示給客戶）
      </p>
      <ol className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
        {config.beads.map((bead, index) => (
          <li
            key={`${bead.bead_id}-${index}`}
            className="flex items-center gap-2 text-sm text-white/80"
          >
            <span className="w-5 shrink-0 text-white/35">{index + 1}.</span>
            {bead.image_url ? (
              <img
                src={bead.image_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-[10px] text-amber-glow">
                {bead.elements[0] ?? '✦'}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">
              {bead.name}
              <span className="text-white/40">
                {' '}
                · {formatBeadElements(bead.elements)}
                {' · '}
                {formatBeadSizeLabel(bead.size)}
                {bead.efficacy_tags.length > 0
                  ? ` · ${bead.efficacy_tags.join('、')}`
                  : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
