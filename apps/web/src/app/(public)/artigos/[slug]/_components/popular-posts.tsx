import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import type { PopularPost } from '@/lib/blog'
import { formatPublished, twoDigits } from '@/lib/format'

import { SectionLabel } from '../../../_components/section-label'

export function PopularPosts({ posts }: { posts: PopularPost[] }) {
  if (posts.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
      <SectionLabel number={`TOP ${twoDigits(posts.length)}`} label="MAIS ACESSADOS" />
      <ol className="border-b border-border">
        {posts.map((post, index) => (
          <li
            key={post.id}
            className="group relative grid gap-5 border-t border-border py-8 first:border-t-0 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:gap-7"
          >
            <span className="font-mono text-xs text-faint">{twoDigits(index + 1)}</span>
            <div className="min-w-0">
              <p className="font-mono text-[0.6875rem] text-faint">
                {formatPublished(post.publishedAt)}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight break-words transition-colors group-hover:text-white sm:text-3xl">
                <Link href={`/artigos/${post.slug}`} className="after:absolute after:inset-0">
                  {post.title}
                </Link>
              </h2>
            </div>
            <div className="flex items-center justify-between gap-6 sm:justify-end">
              <span className="font-mono text-[0.6875rem] text-faint">
                {post.views.toLocaleString('pt-BR')} {post.views === 1 ? 'acesso' : 'acessos'}
              </span>
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-md border border-line-strong text-muted-foreground transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background"
              >
                <ArrowUpRightIcon className="size-4" />
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex justify-end">
        <Link href="/#artigos" className={buttonVariants({ variant: 'outline' })}>
          Ver todos os artigos
          <ArrowUpRightIcon data-icon="inline-end" />
        </Link>
      </div>
    </section>
  )
}
