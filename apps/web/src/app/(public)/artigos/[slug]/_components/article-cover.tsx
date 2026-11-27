import type { Article } from '@/lib/blog'

import { ArticleImage } from './article-image'

export function ArticleCover({ cover }: { cover: NonNullable<Article['cover']> }) {
  return (
    <figure className="mx-auto max-w-6xl px-5 sm:px-6">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <ArticleImage image={cover} priority className="max-h-[36rem] object-cover" />
      </div>
      {cover.caption && (
        <figcaption className="mt-3 text-right font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {cover.caption}
        </figcaption>
      )}
    </figure>
  )
}
