import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'

const ZOOM_LEVEL = 2
const LENS_DIAMETER = 180

interface ProductImageMagnifierProps {
  src: string
  alt: string
  className?: string
  enabled?: boolean
}

interface HoverPoint {
  ratioX: number
  ratioY: number
  imgWidth: number
  imgHeight: number
  offsetX: number
  offsetY: number
}

function clampLensPosition(
  left: number,
  top: number,
  boundsX: number,
  boundsY: number,
  boundsW: number,
  boundsH: number
) {
  if (boundsW < LENS_DIAMETER || boundsH < LENS_DIAMETER) {
    return {
      left: boundsX + (boundsW - LENS_DIAMETER) / 2,
      top: boundsY + (boundsH - LENS_DIAMETER) / 2,
    }
  }

  const minLeft = boundsX
  const minTop = boundsY
  const maxLeft = boundsX + boundsW - LENS_DIAMETER
  const maxTop = boundsY + boundsH - LENS_DIAMETER

  return {
    left: Math.max(minLeft, Math.min(left, maxLeft)),
    top: Math.max(minTop, Math.min(top, maxTop)),
  }
}

/** 商品詳情主圖：滑鼠移入顯示跟隨游標的圓形放大鏡（不超出圖區） */
export function ProductImageMagnifier({
  src,
  alt,
  className = '',
  enabled = true,
}: ProductImageMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null)
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    setHoverPoint(null)
    setImageReady(false)

    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setImageReady(true)
    }
  }, [src])

  const resolveHoverPoint = useCallback(
    (clientX: number, clientY: number): HoverPoint | null => {
      const image = imageRef.current
      const container = containerRef.current
      if (!image || !container || image.offsetWidth <= 0 || image.offsetHeight <= 0) {
        return null
      }

      const imgRect = image.getBoundingClientRect()
      if (
        clientX < imgRect.left ||
        clientX > imgRect.right ||
        clientY < imgRect.top ||
        clientY > imgRect.bottom
      ) {
        return null
      }

      const containerRect = container.getBoundingClientRect()

      return {
        ratioX: (clientX - imgRect.left) / imgRect.width,
        ratioY: (clientY - imgRect.top) / imgRect.height,
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
      }
    },
    [imageReady]
  )

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return
    setHoverPoint(resolveHoverPoint(event.clientX, event.clientY))
  }

  const handleMouseLeave = () => {
    setHoverPoint(null)
  }

  const showLens = enabled && imageReady && hoverPoint != null

  let lensPosition: { left: number; top: number } | undefined
  let zoomImage: { width: number; height: number; left: number; top: number } | undefined

  if (showLens && hoverPoint) {
    const { ratioX, ratioY, imgWidth, imgHeight, offsetX, offsetY } = hoverPoint
    const zoomW = imgWidth * ZOOM_LEVEL
    const zoomH = imgHeight * ZOOM_LEVEL
    const half = LENS_DIAMETER / 2

    const rawLeft = offsetX + ratioX * imgWidth - half
    const rawTop = offsetY + ratioY * imgHeight - half

    lensPosition = clampLensPosition(rawLeft, rawTop, offsetX, offsetY, imgWidth, imgHeight)

    zoomImage = {
      width: zoomW,
      height: zoomH,
      left: half - ratioX * zoomW,
      top: half - ratioY * zoomH,
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block max-w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={`block max-h-[min(55vh,520px)] max-w-full object-contain transition duration-300 ${className}`}
        draggable={false}
        onLoad={() => setImageReady(true)}
      />

      {showLens && lensPosition && zoomImage && (
        <div
          className="pointer-events-none absolute z-[2] overflow-hidden rounded-full border-2 border-amber-glow/90 bg-void shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.15)]"
          style={{
            left: lensPosition.left,
            top: lensPosition.top,
            width: LENS_DIAMETER,
            height: LENS_DIAMETER,
          }}
          aria-hidden
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: zoomImage.width,
              height: zoomImage.height,
              left: zoomImage.left,
              top: zoomImage.top,
            }}
          />
        </div>
      )}
    </div>
  )
}
