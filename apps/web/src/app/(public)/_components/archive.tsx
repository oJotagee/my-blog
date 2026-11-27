import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { type ArchiveFilters, archiveHref } from '@/lib/archive'
import type { getPosts, Tag } from '@/lib/blog'

import { ArchivePagination } from './archive-pagination'
import { ArchiveSearch } from './archive-search'
import { PostRow } from './post-row'
import { SectionLabel } from './section-label'

type Props = {
  number: string
  filters: ArchiveFilters
  posts: Awaited<ReturnType<typeof getPosts>>
  tags: Tag[]
}

function emptyState(filtered: boolean, beyondLastPage: boolean) {
  if (beyondLastPage) return { title: 'essa página não existe_', action: 'Voltar ao começo' }

  if (filtered) return { title: 'nenhum artigo encontrado_', action: 'Limpar filtros' }

  return { title: 'ainda não há artigos publicados_', action: null }
}

export function Archive({ number, filters, posts, tags }: Props) {
  const { q, tag } = filters

  const empty = emptyState(Boolean(q || tag), posts.total > 0)

  const offset = (posts.page - 1) * posts.limit

  const chips = [{ id: 'all', name: 'Todos', slug: '' }, ...tags]

  return (
    <section id="artigos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-6 sm:py-24">
      <SectionLabel number={number} label="ARQUIVO" />

      <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16">
        <div>
          <h2 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Todos os artigos
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
            Leituras, experimentos e decisões técnicas documentadas sem atalhos.
          </p>
        </div>
        <ArchiveSearch q={q} tag={tag} />
      </div>

      <nav aria-label="Filtrar por tag" className="mt-10 flex gap-2 overflow-x-auto p-1 pb-3">
        {chips.map((chip) => (
          <Link
            key={chip.id}
            href={archiveHref({ q, tag: chip.slug })}
            scroll={false}
            aria-current={tag === chip.slug ? 'true' : undefined}
            className={buttonVariants({
              variant: tag === chip.slug ? 'solid' : 'outline',
              size: 'sm',
              className: 'font-mono text-xs',
            })}
          >
            {chip.name}
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-b border-border">
        {posts.items.map((post, index) => (
          <PostRow key={post.id} number={offset + index + 1} post={post} />
        ))}

        {posts.items.length === 0 && (
          <Empty className="rounded-none border-t border-border py-16">
            <EmptyHeader>
              <EmptyTitle className="font-mono text-muted-foreground">{empty.title}</EmptyTitle>
            </EmptyHeader>
            {empty.action && (
              <EmptyContent>
                <Link href="/" scroll={false} className={buttonVariants({ variant: 'link' })}>
                  {empty.action}
                </Link>
              </EmptyContent>
            )}
          </Empty>
        )}
      </div>

      {posts.totalPages > 1 && posts.items.length > 0 && (
        <ArchivePagination filters={filters} totalPages={posts.totalPages} />
      )}
    </section>
  )
}
