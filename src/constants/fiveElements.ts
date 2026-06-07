/** 五行（固定順序：金木水火土） */
export const FIVE_ELEMENTS = ['金', '木', '水', '火', '土'] as const

export type FiveElement = (typeof FIVE_ELEMENTS)[number]
