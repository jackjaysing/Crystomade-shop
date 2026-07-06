import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
} from './siteMeta'

export interface PageMeta {
  title: string
  description: string
  keywords?: string
}

/** 各公開頁面預設 SEO 文案 */
export const PAGE_META: Record<string, PageMeta> = {
  '/products': {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
  },
  '/academy': {
    title: `晶研所｜${SITE_NAME}`,
    description:
      '晶研所分享水晶保養、五行選石、手串配戴與能量水晶知識，協助您更了解天然晶石與客製化水晶手鍊。',
    keywords: `${SITE_KEYWORDS},水晶知識,水晶保養,五行水晶,能量水晶`,
  },
  '/point-shop': {
    title: `點數商城｜${SITE_NAME}`,
    description:
      '使用會員點數兌換精選水晶好禮。晶刻 Crystomade 點數商城，消費累點、兌換加入購物車與典藏商品一併結帳。',
    keywords: `${SITE_KEYWORDS},點數商城,點數兌換`,
  },
  '/wish-board': {
    title: `許願留言板｜${SITE_NAME}`,
    description:
      '在晶刻 Crystomade 許願留言板告訴我們你想要的水晶商品，我們會依會員心願規劃上架與客製手串。',
    keywords: `${SITE_KEYWORDS},許願,客製水晶`,
  },
  '/checkout': {
    title: `確認訂單｜${SITE_NAME}`,
    description: '晶刻 Crystomade 結帳確認訂單與配送資訊。',
  },
  '/account': {
    title: `會員中心｜${SITE_NAME}`,
    description: '晶刻 Crystomade 會員中心：查看訂單、點數、禮物券與會員資料。',
  },
  '/account/grimoire': {
    title: `我的水晶魔導書｜${SITE_NAME}`,
    description:
      '查看已賁得水晶的魔法身分證、五行屬性與覺醒狀態，並可分享給友人瀏覽。',
  },
}

export function getPageMeta(pathname: string): PageMeta {
  if (
    pathname.startsWith('/account/grimoire/') &&
    pathname.length > '/account/grimoire/'.length
  ) {
    return {
      title: `魔導書詳情｜${SITE_NAME}`,
      description:
        '翻閱水晶魔導書、簽署能量契約並完成修行任務，滋養靈魂印記與巫師修為。',
    }
  }

  return (
    PAGE_META[pathname] ?? {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      keywords: SITE_KEYWORDS,
    }
  )
}
