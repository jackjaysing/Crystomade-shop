import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { cartItemPhotoAlt } from '../../lib/imageAlt'
import { FreeShippingProgress } from './FreeShippingProgress'
import { CartItemSizeEditor } from './CartItemSizeEditor'
import { CartPointShopSection } from './CartPointShopSection'
import { CartQuickAddSection } from './CartQuickAddSection'
import { FREE_SHIPPING_THRESHOLD } from '../../constants/shipping'
import { isPointRedemptionItem, isRaffleGiftItem } from '../../lib/cartItemKinds'
import {
  cartHasRaffleGiftBase,
  RAFFLE_GIFT_REQUIRES_BASE_MESSAGE,
} from '../../lib/cartCheckoutRules'
import { useAuth } from '../../contexts/AuthContext'
import { releaseGiftCouponFromCart } from '../../lib/api/coupons'
import { MemberPointsBadge } from '../member/MemberPointsBadge'
import { useCartAvailability } from '../../hooks/useCartAvailability'
import { useQuickAddProducts } from '../../hooks/useQuickAddProducts'

/** 側邊滑出購物車 Drawer */
export function CartDrawer() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isMemberReady = Boolean(user && profile)
  const {
    items,
    itemCount,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    addItem,
  } = useCart()

  const {
    resolvedItems,
    checkoutItemCount,
    subtotal,
    shippingFee,
    grandTotal,
    hasSnatchedItems,
    loading,
    refresh,
  } = useCartAvailability({ enabled: isOpen })

  const {
    products: quickAddProducts,
    loading: quickAddLoading,
  } = useQuickAddProducts(isOpen)

  const handleRemoveItem = (item: (typeof items)[0]) => {
    if (isRaffleGiftItem(item) && user && item.memberCouponId) {
      void releaseGiftCouponFromCart(item.memberCouponId, user.id).finally(() => {
        removeItem(item.cartItemKey)
      })
      return
    }
    removeItem(item.cartItemKey)
  }

  if (!isOpen) return null

  const raffleGiftBaseOk = cartHasRaffleGiftBase(items)
  const canCheckout = checkoutItemCount > 0 && raffleGiftBaseOk
  const hasPointRedemption = items.some(isPointRedemptionItem)
  const hasRaffleGift = items.some(isRaffleGiftItem)
  const showFreeShippingProgress = subtotal > 0

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={closeCart}
        aria-label="關閉購物車"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-amber-glow/20 bg-graphite shadow-gold">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-glow" strokeWidth={1.5} />
              <h2 className="font-display text-xl tracking-wide text-white">
                購物車
                {itemCount > 0 && (
                  <span className="ml-2 text-sm text-white/50">({itemCount})</span>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow"
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <MemberPointsBadge variant="drawer" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/40">購物車是空的</p>
          ) : (
            <>
              {loading && resolvedItems.length === 0 && items.length > 0 && (
                <p className="mb-4 text-center text-xs text-white/40">更新庫存中…</p>
              )}
              {hasSnatchedItems && !loading && (
                <p className="mb-4 rounded-lg border border-red-400/20 bg-red-950/20 px-3 py-2 text-xs text-red-300/90">
                  部分商品已被他人搶先收藏，已自動排除於結帳金額之外。
                </p>
              )}
              <ul className="space-y-5">
                {resolvedItems.map(
                  ({ item, currentStock, isFullySnatched, snatchedQuantity }) => (
                    <li
                      key={item.cartItemKey}
                      className={`flex gap-4 rounded-xl border p-3 ${
                        isFullySnatched
                          ? 'border-white/5 bg-white/[0.01] opacity-60'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={item.image_url}
                          alt={cartItemPhotoAlt(
                            item.name,
                            isRaffleGiftItem(item)
                              ? 'gift'
                              : isPointRedemptionItem(item)
                                ? 'point'
                                : 'product'
                          )}
                          className={`h-20 w-20 rounded-lg object-cover ${
                            isFullySnatched ? 'grayscale' : ''
                          }`}
                        />
                        {isFullySnatched && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-void/60 px-1 text-center text-[10px] leading-tight tracking-wide text-red-300">
                            已被搶先收藏
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            isFullySnatched ? 'text-white/50 line-through' : 'text-white'
                          }`}
                        >
                          {item.name}
                        </p>
                        <CartItemSizeEditor
                          cartItemKey={item.cartItemKey}
                          selectedSize={item.selectedSize}
                          disabled={isFullySnatched}
                        />
                        {item.braceletConfig && (
                          <p className="mt-1 text-[11px] text-violet-200/80">
                            自行配珠 {item.braceletConfig.beads.length} 顆
                            {item.braceletConfig.beads.length > 0
                              ? ` · ${item.braceletConfig.beads
                                  .slice(0, 3)
                                  .map((b) => b.name)
                                  .join('、')}${
                                  item.braceletConfig.beads.length > 3 ? '…' : ''
                                }`
                              : ''}
                            {item.braceletConfig.request_official_review
                              ? ' · 需官方確認'
                              : ''}
                          </p>
                        )}
                        {isFullySnatched ? (
                          <p className="mt-1 text-xs text-red-300/80">
                            該物品已被搶先收藏
                          </p>
                        ) : (
                          <>
                            {isRaffleGiftItem(item) ? (
                              <p className="mt-1 text-sm text-amber-glow">
                                抽獎禮物 · 免費兌換
                              </p>
                            ) : isPointRedemptionItem(item) ? (
                              <p className="mt-1 text-sm text-amber-glow">
                                點數兌換 · {item.requiredPoints ?? 0} 點
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-amber-glow">
                                NT$ {item.price.toLocaleString()}
                              </p>
                            )}
                            {snatchedQuantity > 0 && (
                              <p className="mt-1 text-xs text-red-300/80">
                                {snatchedQuantity} 件已被搶先收藏
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              {!isRaffleGiftItem(item) && !item.braceletConfig && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.cartItemKey, item.quantity - 1)
                                  }
                                  className="rounded border border-white/10 p-1 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow"
                                  aria-label="減少數量"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-[1.5rem] text-center text-sm text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.cartItemKey, item.quantity + 1)
                                  }
                                  disabled={item.quantity >= currentStock}
                                  className="rounded border border-white/10 p-1 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-30"
                                  aria-label="增加數量"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              )}
                              {item.braceletConfig && (
                                <span className="text-xs text-white/40">配置手串 × 1</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item)}
                                className={`text-white/30 transition hover:text-red-400 ${isRaffleGiftItem(item) || item.braceletConfig ? 'ml-auto' : ''}`}
                                aria-label="移除商品"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                        {isFullySnatched && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item)}
                            className="mt-2 text-xs text-white/40 transition hover:text-red-400"
                          >
                            移出購物車
                          </button>
                        )}
                      </div>
                    </li>
                  )
                )}
              </ul>

              <div className="mt-8 space-y-6 border-t border-white/10 pt-6">
                <CartPointShopSection enabled={isOpen} />
                <CartQuickAddSection
                  products={quickAddProducts}
                  loading={quickAddLoading}
                  onAdd={(product, selectedSize) => {
                    addItem(product, { quantity: 1, selectedSize })
                    void refresh()
                  }}
                />
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 space-y-5 border-t border-white/10 bg-graphite px-6 py-5">
            {showFreeShippingProgress && (
              <FreeShippingProgress
                subtotal={subtotal}
                onShopMore={() => {
                  closeCart()
                  navigate('/products')
                }}
              />
            )}
            {!canCheckout && checkoutItemCount > 0 && !raffleGiftBaseOk && (
              <p className="text-center text-xs text-amber-glow/90">
                {RAFFLE_GIFT_REQUIRES_BASE_MESSAGE}
              </p>
            )}
            {!canCheckout && checkoutItemCount === 0 && (
              <p className="text-center text-xs text-red-300/80">
                購物車內商品皆已被搶先收藏，請移除後再選購其他典藏。
              </p>
            )}
            {hasRaffleGift && raffleGiftBaseOk && (
              <p className="text-center text-[11px] text-white/40">
                抽獎禮物將隨本筆訂單一併出貨
              </p>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <span>{hasPointRedemption ? '付費商品小計' : '商品小計'}</span>
                <span>NT$ {subtotal.toLocaleString()}</span>
              </div>
              {hasPointRedemption && (
                <p className="text-[11px] text-white/35">
                  兌換商品不可折抵運費；僅兌換時仍需支付運費
                </p>
              )}
              <div className="flex justify-between text-white/60">
                <span>運費</span>
                <span>
                  {shippingFee === 0 && subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <span className="text-emerald-400">免運</span>
                  ) : shippingFee === 0 ? (
                    '—'
                  ) : (
                    `NT$ ${shippingFee.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base text-white">
                <span>應付總額</span>
                <span className="text-amber-glow">
                  NT$ {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
            {canCheckout ? (
              <Link
                to="/checkout"
                onClick={() => {
                  refresh()
                  closeCart()
                }}
                className="block w-full rounded-lg bg-amber-glow/90 py-3.5 text-center text-sm font-medium tracking-widest text-void transition hover:bg-amber-glow"
              >
                {isMemberReady ? '前往結帳' : '登入後結帳'}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-white/10 py-3.5 text-center text-sm tracking-widest text-white/30"
              >
                無可結帳商品
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
