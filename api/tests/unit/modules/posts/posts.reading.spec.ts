import { describe, expect, it } from 'bun:test'

import { estimateReadingMinutes } from '../../../../src/modules/posts/posts.reading'

const words = (count: number) => Array.from({ length: count }, () => 'palavra').join(' ')

describe('estimateReadingMinutes', () => {
  it('is at least one minute, even without text', () => {
    expect(estimateReadingMinutes([])).toBe(1)

    expect(
      estimateReadingMinutes([{ blocks: [{ type: 'image', mediaId: crypto.randomUUID() }] }]),
    ).toBe(1)
  })

  it('counts 200 words per minute and rounds up', () => {
    const sections = (count: number) => [
      { blocks: [{ type: 'text' as const, content: words(count) }] },
    ]

    expect(estimateReadingMinutes(sections(200))).toBe(1)

    expect(estimateReadingMinutes(sections(201))).toBe(2)

    expect(estimateReadingMinutes(sections(1000))).toBe(5)
  })

  it('counts titles, code, callouts and cards, but not images', () => {
    const minutes = estimateReadingMinutes([
      {
        title: words(100),
        blocks: [
          { type: 'code', content: words(100) },
          { type: 'callout', content: words(100) },
          { type: 'cards', items: [{ title: words(50), description: words(51) }] },
          { type: 'image', mediaId: crypto.randomUUID(), caption: words(500) },
        ],
      },
    ])

    expect(minutes).toBe(3)
  })
})
