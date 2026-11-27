import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import type { Post } from '@/lib/blog'
import { formatPublished, formatStudied } from '@/lib/format'

import { SectionLabel } from './section-label'

export function FeaturedPost({ number, post }: { number: string; post: Post }) {
  const details = [
    { label: 'publicado', value: formatPublished(post.publishedAt) },
    { label: 'estudo', value: formatStudied(post.studiedFrom, post.studiedTo) },
  ].filter((detail) => detail.value)

  return (
    <section
      id="destaque"
      className="mx-auto max-w-6xl scroll-mt-4 px-5 py-16 sm:scroll-mt-0 sm:px-6 sm:py-24"
    >
      <SectionLabel number={number} label="EM DESTAQUE" />

      <article className="grid gap-10 border-b border-border py-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16 lg:py-14">
        <div className="min-w-0">
          <div className="mb-8 flex flex-wrap gap-2 font-mono text-xs text-faint">
            {post.tags.map((tag) => (
              <span key={tag.id}>#{tag.slug}</span>
            ))}
          </div>
          <h2 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance break-words sm:text-5xl">
            {post.title}
          </h2>
          {post.summary && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {post.summary}
            </p>
          )}
          <Link
            href={`/artigos/${post.slug}`}
            className={buttonVariants({ size: 'lg', className: 'mt-9 px-4' })}
          >
            Ler artigo
            <ArrowUpRightIcon data-icon="inline-end" />
          </Link>
        </div>

        <div className="self-end rounded-lg border border-border bg-card font-mono text-xs">
          <p className="border-b border-border px-4 py-3 text-faint">
            <span className="text-foreground">~/artigos</span> · em destaque
          </p>
          <dl className="grid grid-cols-[5rem_1fr] gap-y-4 p-4">
            {details.map((detail) => (
              <div key={detail.label} className="contents">
                <dt className="text-faint">{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    </section>
  )
}
