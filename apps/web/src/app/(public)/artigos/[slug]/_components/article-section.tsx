import { groupBlocks } from '@/lib/article'
import type { Article } from '@/lib/blog'
import { twoDigits } from '@/lib/format'

import { ArticleBlock } from './article-block'

type Props = { id: string; number: number; section: Article['sections'][number]; lead: boolean }

export function ArticleSection({ id, number, section, lead }: Props) {
  const leadId = lead ? section.blocks.find((block) => block.type === 'text')?.id : undefined

  return (
    <section id={id} className="mb-24 scroll-mt-28">
      {section.label && (
        <p className="mb-4 font-mono text-[0.6875rem] tracking-[0.16em] text-faint uppercase">
          {twoDigits(number)} — {section.label}
        </p>
      )}
      {section.title && (
        <h2 className="mb-7 text-[clamp(2rem,5vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance">
          {section.title}
        </h2>
      )}
      {groupBlocks(section.blocks).map((group) => {
        const blocks = group.map((block) => (
          <div key={block.id} className="min-w-0">
            <ArticleBlock block={block} lead={block.id === leadId} />
          </div>
        ))

        return group.length === 1 ? (
          blocks
        ) : (
          <div key={group[0]?.id} className="grid items-start gap-x-8 md:grid-cols-2">
            {blocks}
          </div>
        )
      })}
    </section>
  )
}
