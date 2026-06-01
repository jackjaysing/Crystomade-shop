import { LINE_OFFICIAL_URL } from './line'

export { LINE_OFFICIAL_URL }

/** 官方 Instagram（請替換為實際帳號） */
export const INSTAGRAM_URL = 'https://www.instagram.com/crystomade/'

/** LINE 社群 OpenChat（請替換為實際社群連結） */
export const LINE_COMMUNITY_URL = 'https://line.me/ti/g2/tGsDuh6Nlyx-t4KPLGCONckUZOr-rcEd2_vJNA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'

export interface SocialLink {
  id: string
  label: string
  href: string
}

/** 頁尾社群連結 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'instagram',
    label: '官方 Instagram',
    href: INSTAGRAM_URL,
  },
  {
    id: 'line-official',
    label: '官方 LINE',
    href: LINE_OFFICIAL_URL,
  },
  {
    id: 'line-community',
    label: '加入 LINE 社群',
    href: LINE_COMMUNITY_URL,
  },
]
