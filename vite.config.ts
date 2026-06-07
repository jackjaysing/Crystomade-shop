import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const siteUrl = (env.VITE_SITE_URL || 'https://crystomade-shop.vercel.app').replace(
    /\/$/,
    ''
  )

  return {
    plugins: [
      react(),
      {
        name: 'html-site-meta',
        transformIndexHtml(html) {
          return html.replaceAll('__SITE_URL__', siteUrl)
        },
      },
    ],
  }
})
