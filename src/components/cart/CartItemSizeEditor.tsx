import { useCart } from '../../contexts/CartContext'
import { BraceletSizePicker } from '../products/BraceletSizePicker'

interface CartItemSizeEditorProps {
  cartItemKey: string
  selectedSize: string | null
  disabled?: boolean
}

/** 購物車內變更手串手圍 */
export function CartItemSizeEditor({
  cartItemKey,
  selectedSize,
  disabled = false,
}: CartItemSizeEditorProps) {
  const { updateItemSize } = useCart()

  if (selectedSize == null) return null

  return (
    <div className="mt-2">
      <BraceletSizePicker
        compact
        disabled={disabled}
        value={selectedSize}
        onChange={(size) => updateItemSize(cartItemKey, size)}
      />
    </div>
  )
}
