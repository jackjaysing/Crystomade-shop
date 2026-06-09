import { Link } from 'react-router-dom'

/** 商品列表頁底部 SEO 說明（可讀文字，利於收錄與使用者了解） */
export function ProductsPageSeoSection() {
  return (
    <section
      aria-labelledby="storefront-seo-heading"
      className="border-t border-white/10 bg-void/40 py-14"
    >
      <div className="mx-auto max-w-3xl px-6 text-sm leading-relaxed text-white/55">
        <h2
          id="storefront-seo-heading"
          className="font-display text-xl text-white/85 sm:text-2xl"
        >
          晶刻 Crystomade 水晶手串客製與五行平衡能量水晶
        </h2>
        <p className="mt-4">
          晶刻 Crystomade 專注天然水晶、水晶手串與能量水晶選品。無論您想尋找日常配戴的水晶手鍊、客製化水晶手串，或依五行平衡理念搭配的礦石組合，我們都以嚴選晶石與透明資訊，協助您刻定屬於自己的水晶能量夥伴。
        </p>
        <p className="mt-3">
          典藏商品涵蓋手串、擺件與礦石原料；熱門標籤包含招財、桃花、平安、靜心等功效方向。手串類商品支援淨手圍選擇與量身訂做建議，讓每一串水晶手鍊更貼合您的佩戴習慣與能量需求。
        </p>
        <h3 className="mt-8 text-base font-medium text-white/75">
          為什麼選擇晶刻？
        </h3>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>五行平衡搭配建議，依個人需求挑選水晶組合</li>
          <li>水晶手串客製與量身訂做，從手圍到晶石選色都可諮詢</li>
          <li>天然水晶現貨與典藏展示，圖文詳載功效與材質</li>
          <li>會員點數回饋，可至點數商城兌換或折抵消費</li>
        </ul>
        <p className="mt-6">
          想更了解水晶？歡迎到
          <Link to="/academy" className="mx-1 text-amber-glow/90 hover:underline">
            晶研所
          </Link>
          閱讀保養與選石知識。新朋友也可
          <Link to="/register" className="mx-1 text-amber-glow/90 hover:underline">
            註冊會員
          </Link>
          領取點數；若有許願商品想法，請至
          <Link to="/wish-board" className="mx-1 text-amber-glow/90 hover:underline">
            許願留言板
          </Link>
          告訴我們。
        </p>
      </div>
    </section>
  )
}
