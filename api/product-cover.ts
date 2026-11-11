/**
 * 同網域商品首圖代理（LINE 對站外圖偶發不顯示）。
 * GET /api/product-cover?id=<uuid>
 */

export const config = {
  runtime: 'edge',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveSupabaseConfig(): { url: string; key: string } | null {
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).replace(/\/$/, '')
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  return { url, key }
}

export default async function handler(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url)
  const id = (reqUrl.searchParams.get('id') || '').trim()
  if (!UUID_RE.test(id)) {
    return new Response('Missing product id', { status: 400 })
  }

  const supabase = resolveSupabaseConfig()
  if (!supabase) {
    return Response.redirect(new URL('/og-share-square.jpg?v=2', reqUrl.origin))
  }

  const apiUrl = new URL(`${supabase.url}/rest/v1/products`)
  apiUrl.searchParams.set('id', `eq.${id}`)
  apiUrl.searchParams.set('deleted_at', 'is.null')
  apiUrl.searchParams.set('select', 'image_url')
  apiUrl.searchParams.set('limit', '1')

  const lookup = await fetch(apiUrl.toString(), {
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      Accept: 'application/json',
    },
  })
  if (!lookup.ok) {
    return Response.redirect(new URL('/og-share-square.jpg?v=2', reqUrl.origin))
  }

  const rows = (await lookup.json()) as Array<{ image_url: string | null }>
  const imageUrl = String(rows[0]?.image_url || '').trim()
  if (!imageUrl) {
    return Response.redirect(new URL('/og-share-square.jpg?v=2', reqUrl.origin))
  }

  const absolute = imageUrl.startsWith('http')
    ? imageUrl
    : new URL(
        imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`,
        reqUrl.origin
      ).toString()

  try {
    const imageRes = await fetch(absolute, {
      headers: { Accept: 'image/*,*/*' },
    })
    if (!imageRes.ok || !imageRes.body) {
      return Response.redirect(absolute, 302)
    }

    const contentType =
      imageRes.headers.get('content-type') || 'image/jpeg'

    return new Response(imageRes.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'access-control-allow-origin': '*',
      },
    })
  } catch {
    return Response.redirect(absolute, 302)
  }
}
