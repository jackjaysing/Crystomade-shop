import { formatEfficacyTags } from '../../lib/efficacyTags'

interface MagicContractCardPreviewProps {
  productName: string
  productImageUrl?: string | null
  magicAffiliation: string
  productTags?: string[]
  magicTitle?: string
}

/** 契約簽署前：水晶摘要（含功效類別） */
export function MagicContractCardPreview({
  productName,
  productImageUrl,
  magicAffiliation,
  productTags,
  magicTitle,
}: MagicContractCardPreviewProps) {
  const efficacyLabel = formatEfficacyTags(productTags)

  return (
    <div className="magic-gift-preview mb-4 flex items-center gap-3">
      {productImageUrl ? (
        <img
          src={productImageUrl}
          alt={productName}
          className="magic-gift-preview-thumb"
        />
      ) : (
        <span className="magic-gift-preview-glyph">✦</span>
      )}
      <div className="min-w-0">
        {magicTitle && (
          <p className="magic-gift-preview-title">{magicTitle}</p>
        )}
        <p className="magic-gift-preview-name">{productName}</p>
        <p className="magic-gift-preview-meta">魔法系別 · {magicAffiliation}</p>
        <p className="magic-gift-preview-meta">功效類別 · {efficacyLabel}</p>
      </div>
    </div>
  )
}
