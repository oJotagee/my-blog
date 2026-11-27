import Image from 'next/image'

import type { Block } from '@/lib/blog'
import { cn } from '@/lib/utils'

type Props = { image: NonNullable<Block['image']>; priority?: boolean; className?: string }

// unoptimized: as imagens já saem prontas da CloudFront.
export function ArticleImage({ image, priority, className }: Props) {
  if (!image.url) return null

  return (
    <Image
      src={image.url}
      alt={image.alt ?? ''}
      width={image.width ?? 1600}
      height={image.height ?? 900}
      priority={priority}
      unoptimized
      className={cn('h-auto w-full', className)}
    />
  )
}
