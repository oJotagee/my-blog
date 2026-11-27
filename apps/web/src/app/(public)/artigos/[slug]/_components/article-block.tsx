import type { Block } from '@/lib/blog'
import { twoDigits } from '@/lib/format'

import { ArticleImage } from './article-image'
import { Markdown } from './markdown'

export function ArticleBlock({ block, lead }: { block: Block; lead: boolean }) {
  const content = block.content ?? ''

  if (block.type === 'text') return <Markdown content={content} lead={lead} />

  if (block.type === 'quote') {
    return (
      <blockquote className="my-12 border-l-2 border-foreground py-2 pl-7">
        <p className="text-2xl leading-normal font-medium tracking-tight whitespace-pre-line">
          {content}
        </p>
      </blockquote>
    )
  }

  if (block.type === 'callout') {
    return (
      <aside className="my-12 grid gap-3 rounded-lg border border-line-strong p-5 sm:grid-cols-[auto_1fr] sm:gap-5">
        <span className="pt-1 font-mono text-[0.625rem] tracking-[0.15em] text-faint uppercase">
          {block.meta?.label ?? 'Nota'}
        </span>
        <p className="leading-[1.7] whitespace-pre-line text-muted-foreground">{content}</p>
      </aside>
    )
  }

  if (block.type === 'code') {
    return (
      <figure className="my-12 overflow-hidden rounded-lg border border-border bg-card font-mono">
        {(block.meta?.filename || block.meta?.language) && (
          <figcaption className="flex justify-between gap-4 border-b border-border px-4 py-3 text-[0.6875rem] text-faint">
            <span className="truncate">{block.meta.filename}</span>
            <span>{block.meta.language}</span>
          </figcaption>
        )}
        <pre className="overflow-x-auto px-5 py-8 text-[0.8125rem] leading-[1.9] text-muted-foreground">
          <code>{content}</code>
        </pre>
      </figure>
    )
  }

  if (block.type === 'cards') {
    return (
      <ol className="my-12 divide-y divide-border rounded-lg border border-border bg-card">
        {block.meta?.items?.map((card, index) => (
          <li
            key={`${card.title}-${card.description}`}
            className="grid grid-cols-[2rem_1fr] gap-x-3 gap-y-1 p-5"
          >
            <span className="row-span-2 font-mono text-[0.6875rem] text-faint">
              {twoDigits(index + 1)}
            </span>
            <strong className="text-[0.9375rem] font-medium">{card.title}</strong>
            <p className="text-[0.8125rem] text-faint">{card.description}</p>
          </li>
        ))}
      </ol>
    )
  }

  if (!block.image?.url) return null

  return (
    <figure className="my-12">
      <ArticleImage image={block.image} className="rounded-lg border border-border" />
      {block.caption && (
        <figcaption className="mt-3 font-mono text-[0.6875rem] text-faint">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}
