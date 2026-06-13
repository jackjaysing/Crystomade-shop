import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProductById } from '../lib/api/products'
import { formatErrorMessage } from '../lib/formatError'
import { parseProductIdFromSlug, productDetailPath } from '../lib/productSlug'
import { applyProductSiteMeta } from '../lib/siteMeta'
import type { Product } from '../lib/types'
import { ProductDetailView } from '../components/products/ProductDetailView'
import { BreadcrumbStructuredData } from '../components/seo/BreadcrumbStructuredData'
import { ProductStructuredData } from '../components/seo/ProductStructuredData'
import { GlassPanel } from '../components/ui/GlassPanel'
import { SiteMaintenancePanel } from '../components/ui/SiteMaintenancePanel'

/** 單一商品詳情頁（可被 Google 收錄的獨立 URL） */
export function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

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
    setProduct(null)

    const productId = parseProductIdFromSlug(slug)

    void fetchProductById(productId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
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
      name: product.name,
      description: product.description,
      imageUrl: product.image_url,
      pathname: productDetailPath(product),
    })
  }, [product])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center pt-24 text-sm text-white/40">
        載入商品中…
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-6">
          <GlassPanel className="p-8 text-center">
            <h1 className="font-display text-2xl text-white">找不到此商品</h1>
            <p className="mt-3 text-sm text-white/50">
              商品可能已下架或連結已失效。
            </p>
            <Link
              to="/products"
              className="mt-6 inline-block text-sm text-amber-glow hover:underline"
            >
              返回典藏選購
            </Link>
          </GlassPanel>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-6">
          <SiteMaintenancePanel />
          <Link
            to="/products"
            className="mt-6 block text-center text-sm text-amber-glow hover:underline"
          >
            返回典藏選購
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-lg px-6">
          <GlassPanel className="p-8 text-center">
            <p className="text-sm text-white/50">載入失敗，請稍後再試</p>
            <Link
              to="/products"
              className="mt-6 inline-block text-sm text-amber-glow hover:underline"
            >
              返回典藏選購
            </Link>
          </GlassPanel>
        </div>
      </div>
    )
  }

  const breadcrumbItems = [
    { name: '典藏選購', path: '/products' },
    { name: product.name, path: productDetailPath(product) },
  ]

  return (
    <>
      <ProductStructuredData product={product} />
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <ProductDetailView product={product} />
    </>
  )
}
