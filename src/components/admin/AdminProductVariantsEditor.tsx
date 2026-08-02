import type { ProductVariantInput } from '../../lib/types'
import { IntegerField } from '../ui/IntegerField'

interface AdminProductVariantsEditorProps {
  variants: ProductVariantInput[]
  onChange: (variants: ProductVariantInput[]) => void
}

function emptyVariant(sortOrder: number): ProductVariantInput {
  return {
    name: '',
    price: 0,
    stock: 1,
    sort_order: sortOrder,
  }
}

/** 後台：商品規格（名稱／原價／庫存） */
export function AdminProductVariantsEditor({
  variants,
  onChange,
}: AdminProductVariantsEditorProps) {
  const addVariant = () => {
    onChange([...variants, emptyVariant(variants.length)])
  }

  const updateVariant = (
    index: number,
    patch: Partial<ProductVariantInput>
  ) => {
    onChange(
      variants.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      sort_order: i,
    })))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">商品規格（選填）</p>
          <p className="mt-0.5 text-xs text-white/40">
            例如水晶柱 A／B／C：各自售價與庫存；封面共用。不加規格則維持單一售價／庫存。
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="shrink-0 rounded-lg border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10"
        >
          新增規格
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center text-xs text-white/40">
          尚未新增規格
        </p>
      ) : (
        <ul className="space-y-2">
          {variants.map((variant, index) => (
            <li
              key={variant.id ?? `new-${index}`}
              className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
            >
              <label className="block text-xs text-white/50">
                規格名稱
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(index, { name: e.target.value })
                  }
                  placeholder={`規格 ${index + 1}`}
                  className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-white/50">
                原價（NT$）
                <input
                  type="number"
                  min={0}
                  value={variant.price || ''}
                  onChange={(e) =>
                    updateVariant(index, {
                      price: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-white/50">
                庫存
                <div className="mt-1">
                  <IntegerField
                    value={variant.stock}
                    min={0}
                    onChange={(stock) => updateVariant(index, { stock })}
                  />
                </div>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="w-full rounded-md border border-white/15 px-2 py-2 text-xs text-white/50 transition hover:border-red-400/40 hover:text-red-300 sm:w-auto"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
