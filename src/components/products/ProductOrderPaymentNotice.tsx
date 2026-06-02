import { LINE_OFFICIAL_URL } from '../../constants/line'

/** 商品詳情：介紹下方固定的下單與付款流程說明 */
export function ProductOrderPaymentNotice() {
  return (
    <section
      className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 sm:px-5"
      aria-labelledby="product-order-payment-title"
    >
      <h3
        id="product-order-payment-title"
        className="text-center text-sm font-medium tracking-wide text-amber-glow/90"
      >
        💳 【 下單與付款流程說明 】📣
      </h3>

      <p className="mt-4 text-sm leading-relaxed text-white/65">
        本商店目前採
        <strong className="font-medium text-white/85">
          「官網下單登記 ➔ LINE 專人核對完成付款」
        </strong>
        機制。
      </p>

      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-white/65 marker:text-amber-glow/70">
        <li>
          <span className="font-medium text-white/80">步驟一：</span>{' '}
          請在網頁填妥收件超商與基本資料，點擊「確認下單」。
        </li>
        <li>
          <span className="font-medium text-white/80">步驟二：</span>{' '}
          下單完成後，會自動跳轉，請務必「主動」加入晶刻官方 LINE 客服（
          <a
            href={LINE_OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-glow/90 underline decoration-amber-glow/40 underline-offset-2 transition hover:text-amber-glow"
          >
            @811jagyw
          </a>
          ）。
        </li>
        <li>
          <span className="font-medium text-white/80">步驟三：</span>{' '}
          於 LINE 傳送您的
          <strong className="font-medium text-white/85">
            【下單姓名 + 電話後四碼】
          </strong>
          ，客服將為您核對訂單並提供轉帳帳號。完成付款後，晶刻將立即為您安排設計或出貨🚚
        </li>
      </ol>
    </section>
  )
}
