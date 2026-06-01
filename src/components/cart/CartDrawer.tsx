import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FREE_SHIPPING_THRESHOLD } from '../../constants/shipping'
import { useCart } from '../../contexts/CartContext'

/** 側邊滑出購物車 Drawer */
export function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    shippingFee,
    grandTotal,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
  } = useCart()

  if (!isOpen) return null

  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={closeCart}
        aria-label="關閉購物車"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-amber-glow/20 bg-graphite shadow-gold">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/40">購物車是空的</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-amber-glow">
                      NT$ {item.price.toLocaleString()}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
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
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxStock}
                          className="rounded border border-white/10 p-1 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow disabled:opacity-30"
                          aria-label="增加數量"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-white/30 transition hover:text-red-400"
                        aria-label="移除商品"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 px-6 py-5">
            {shippingFee > 0 && amountToFreeShipping > 0 && (
              <p className="mb-3 text-center text-xs text-amber-glow/70">
                再消費 NT$ {amountToFreeShipping.toLocaleString()} 即可免運
              </p>
            )}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-white/60">
                <span>商品小計</span>
                <span>NT$ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>運費</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-emerald-400">免運</span>
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
            <Link
              to="/checkout"
              onClick={closeCart}
              className="mt-4 block w-full rounded-lg bg-amber-glow/90 py-3.5 text-center text-sm font-medium tracking-widest text-void transition hover:bg-amber-glow"
            >
              前往結帳
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
