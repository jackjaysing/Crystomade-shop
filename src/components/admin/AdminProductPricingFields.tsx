import {
  calcSalePrice,
  formatDiscountZheLabel,
  parseDiscountZhe,
} from '../../lib/productPricing'

interface AdminProductPricingFieldsProps {
  price: number
  discountZhe: number | null
  onPriceChange: (price: number) => void
  onDiscountChange: (discountZhe: number | null) => void
}

/** 後台：原價 + 折扣（折）+ 特價預覽 */
export function AdminProductPricingFields({
  price,
  discountZhe,
  onPriceChange,
  onDiscountChange,
}: AdminProductPricingFieldsProps) {
  const salePrice = calcSalePrice(price, discountZhe)
  const onSale = price > 0 && salePrice < price

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium tracking-wide text-white/50">價格設定</p>
      <input
        type="number"
        min={0}
        placeholder="原價 (NT$)"
        value={price || ''}
        onChange={(e) => onPriceChange(Number(e.target.value))}
        className="input-field"
      />
      <div>
        <input
          type="number"
          min={0.1}
          max={9.9}
          step={0.1}
          placeholder="折扣（折），留空＝無折扣，例：8"
          value={discountZhe ?? ''}
          onChange={(e) => onDiscountChange(parseDiscountZhe(e.target.value))}
          className="input-field"
        />
        <p className="mt-1 text-[11px] text-white/35">
          8 折表示售價為原價的 80%，可填 8 或 8.5
        </p>
      </div>
      {price > 0 && (
        <p className="text-sm text-white/70">
          {onSale ? (
            <>
              特價{' '}
              <span className="text-amber-glow">
                NT$ {salePrice.toLocaleString()}
              </span>
              {discountZhe != null && (
                <span className="ml-2 text-xs text-white/45">
                  （{formatDiscountZheLabel(discountZhe)}）
                </span>
              )}
              <span className="ml-2 text-xs text-white/40 line-through">
                原價 NT$ {price.toLocaleString()}
              </span>
            </>
          ) : (
            <>售價 NT$ {price.toLocaleString()}</>
          )}
        </p>
      )}
    </div>
  )
}
