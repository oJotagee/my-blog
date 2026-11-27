import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

import type { Post } from '@/lib/blog'
import { formatPublished, twoDigits } from '@/lib/format'

export function PostRow({ number, post }: { number: number; post: Post }) {
  return (
    <article className="group relative grid gap-5 border-t border-border py-8 sm:grid-cols-[3rem_1fr_auto] sm:gap-6 sm:py-10">
      <span className="font-mono text-xs text-faint tabular-nums">{twoDigits(number)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
          {post.tags.map((tag) => (
            <span key={tag.id}>{tag.name}</span>
          ))}
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight break-words transition-colors group-hover:text-white sm:text-3xl">
          {/* O ::after estica o link para a linha inteira ser clicável. */}
          <Link href={`/artigos/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.summary && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {post.summary}
          </p>
        )}
      </div>
      <div className="flex items-end justify-between gap-6 sm:flex-col sm:items-end">
        <p className="font-mono text-[11px] text-faint">{formatPublished(post.publishedAt)}</p>
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-md border border-line-strong text-muted-foreground transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background"
        >
          <ArrowUpRightIcon className="size-4" />
        </span>
      </div>
    </article>
  )
}
