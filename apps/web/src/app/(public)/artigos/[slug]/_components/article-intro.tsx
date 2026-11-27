import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

import type { Article } from '@/lib/blog'
import { formatPublished, formatStudied } from '@/lib/format'

export function ArticleIntro({ article, author }: { article: Article; author: string }) {
  const details = [
    { label: 'publicado', value: formatPublished(article.publishedAt) },
    { label: 'estudo', value: formatStudied(article.studiedFrom, article.studiedTo) },
    { label: 'autor', value: author },
  ].filter((detail) => detail.value)

  return (
    <header className="mx-auto max-w-6xl px-5 pt-32 pb-14 sm:px-6 sm:pt-40 sm:pb-20">
      <Link
        href="/#artigos"
        className="mb-12 inline-flex items-center gap-2 font-mono text-xs text-faint transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        VOLTAR PARA O ARQUIVO
      </Link>
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-20">
        <div className="min-w-0">
          <div className="mb-7 flex flex-wrap gap-x-3 gap-y-2 font-mono text-xs text-faint">
            {article.tags.map((tag) => (
              <span key={tag.id}>#{tag.slug}</span>
            ))}
          </div>
          <h1 className="max-w-4xl text-5xl leading-[0.98] font-semibold tracking-[-0.05em] text-balance break-words sm:text-7xl">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {article.summary}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-[5rem_1fr] gap-y-4 self-end border-t border-line-strong pt-5 font-mono text-xs">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-faint">{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}
