import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BraceletBuilderView } from '../components/bracelet/BraceletBuilderView'
import { GlassPanel } from '../components/ui/GlassPanel'
import { SiteMaintenancePanel } from '../components/ui/SiteMaintenancePanel'
import { fetchProductById } from '../lib/api/products'
import { formatErrorMessage } from '../lib/formatError'
import { isBespokeSoulCardProduct } from '../lib/grimoireFulfillment'
import { parseProductIdFromSlug, productDetailPath } from '../lib/productSlug'
import { applyProductSiteMeta } from '../lib/siteMeta'
import type { Product } from '../lib/types'

/** 五行平衡手串客戶配置頁 */
export function BraceletBuilderPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notBespoke, setNotBespoke] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [slug])

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    setNotBespoke(false)
    setProduct(null)

    void fetchProductById(parseProductIdFromSlug(slug))
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          return
        }
        if (!isBespokeSoulCardProduct(data.name)) {
          setNotBespoke(true)
          setProduct(data)
          return
        }
        setProduct(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(formatErrorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!product) return
    applyProductSiteMeta({
      name: `${product.name}｜自行配置`,
      description: '依五行與功效自行配置水晶手串，滿意後下單由晶刻串製出貨。',
      imageUrl: product.image_url,
      pathname: `${productDetailPath(product)}/configure`,
    })
  }, [product])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-white/50">載入中…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-28">
        <SiteMaintenancePanel />
        <p className="mt-4 text-center text-sm text-white/50">{error}</p>
        <Link to="/products" className="mt-4 block text-center text-amber-glow">
          返回典藏
        </Link>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-28">
        <GlassPanel className="p-8 text-center">
          <p className="text-white/70">找不到商品</p>
          <Link to="/products" className="mt-4 inline-block text-amber-glow">
            返回典藏
          </Link>
        </GlassPanel>
      </div>
    )
  }

  if (notBespoke) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-28">
        <GlassPanel className="p-8 text-center">
          <p className="text-white/70">此商品不支援客戶配珠配置</p>
          <Link
            to={productDetailPath(product)}
            className="mt-4 inline-block text-amber-glow"
          >
            返回商品頁
          </Link>
        </GlassPanel>
      </div>
    )
  }

  return <BraceletBuilderView product={product} />
}
