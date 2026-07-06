import { EFFICACY_TAGS } from '../../constants/tags'

interface AdminEfficacyTagsPickerProps {
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

/** 後台出貨：功效類別多選 */
export function AdminEfficacyTagsPicker({
  value,
  onChange,
  disabled = false,
}: AdminEfficacyTagsPickerProps) {
  const toggle = (tag: string) => {
    if (disabled) return
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {EFFICACY_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          disabled={disabled}
          onClick={() => toggle(tag)}
          className={
            value.includes(tag)
              ? 'rounded-full border border-amber-glow/50 bg-amber-glow/15 px-2 py-0.5 text-[11px] text-amber-glow disabled:opacity-40'
              : 'rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/45 hover:border-white/30 disabled:opacity-40'
          }
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
