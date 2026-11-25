import type { ContentBody } from './posts.dto'

const WORDS_PER_MINUTE = 200

export function estimateReadingMinutes(sections: ContentBody['sections']) {
  const text = sections.flatMap((section) => [
    section.title ?? '',
    ...section.blocks.flatMap((block) => {
      if (block.type === 'image') return []

      if (block.type === 'cards')
        return block.items.flatMap((item) => [item.title, item.description])

      return [block.content]
    }),
  ])

  const words = text.join(' ').split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
