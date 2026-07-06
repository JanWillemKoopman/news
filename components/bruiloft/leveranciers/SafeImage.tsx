'use client'

import * as React from 'react'
import Image from 'next/image'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  sizes?: string
  // Extra hook naast de interne fallback (die zelf niets rendert) — voor
  // aanroepers die bij een mislukte afbeelding een eigen placeholder tonen.
  onError?: () => void
}

export function SafeImage({ src, alt, className, fill, sizes, onError }: SafeImageProps) {
  const [imageSrc, setImageSrc] = React.useState(src)
  const [hasError, setHasError] = React.useState(false)

  // Valideer URL
  const isValidUrl = React.useMemo(() => {
    try {
      if (!src) return false
      new URL(src)
      return true
    } catch {
      return false
    }
  }, [src])

  if (!isValidUrl || hasError) return null

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      fill={fill}
      sizes={sizes}
      unoptimized
      onError={() => {
        setHasError(true)
        onError?.()
      }}
    />
  )
}
