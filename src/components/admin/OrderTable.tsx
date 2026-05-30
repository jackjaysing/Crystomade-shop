import { shipOrder } from '../../lib/api/orders'
import type { Order } from '../../lib/types'
import { GlassPanel } from '../ui/GlassPanel'

interface OrderTableProps {
  orders: Order[]
  loading: boolean
  onUpdated: () => void
}

/** 訂單明細表格 */
export function OrderTable({ orders, loading, onUpdated }: OrderTableProps) {
  const handleShip = async (orderId: string) => {
    try {
      await shipOrder(orderId)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失敗')
    }
  }

  if (loading) {
    return <p className="text-white/50">載入訂單中…</p>
  }

  if (orders.length === 0) {
    return <p className="text-white/50">尚無訂單</p>
  }

  return (
    <GlassPanel className="overflow-x-auto p-0">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="p-4 font-normal">下單時間</th>
            <th className="p-4 font-normal">買家</th>
            <th className="p-4 font-normal">電話</th>
            <th className="p-4 font-normal">地址</th>
            <th className="p-4 font-normal">商品</th>
            <th className="p-4 font-normal">金額</th>
            <th className="p-4 font-normal">狀態</th>
            <th className="p-4 font-normal">操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-white/5 transition hover:bg-white/[0.02]"
            >
              <td className="p-4 text-white/70">
                {new Date(order.created_at).toLocaleString('zh-TW')}
              </td>
              <td className="p-4">{order.buyer_name}</td>
              <td className="p-4 text-white/70">{order.phone}</td>
              <td className="max-w-[200px] truncate p-4 text-white/70" title={order.address}>
                {order.address}
              </td>
              <td className="p-4">
                {order.products?.name ?? order.product_id.slice(0, 8)}
              </td>
              <td className="p-4 text-amber-glow">
                NT$ {Number(order.total_amount).toLocaleString()}
              </td>
              <td className="p-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    order.status === 'shipped'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-glow/10 text-amber-glow'
                  }`}
                >
                  {order.status === 'shipped' ? '已出貨' : '未處理'}
                </span>
              </td>
              <td className="p-4">
                {order.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleShip(order.id)}
                    className="rounded border border-amber-glow/40 px-3 py-1.5 text-xs text-amber-glow transition hover:bg-amber-glow/10"
                  >
                    一鍵出貨
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassPanel>
  )
}
