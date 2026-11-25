import { describe, expect, it } from 'bun:test'

import { slugify } from '../../../src/shared/slug'

describe('slugify', () => {
  it('lowercases, removes accents and joins words with a dash', () => {
    expect(slugify('Banco de Dados')).toBe('banco-de-dados')

    expect(slugify('Arquitetura Hexagonal sem Complicação')).toBe(
      'arquitetura-hexagonal-sem-complicacao',
    )
  })

  it('collapses symbols and trims the edges', () => {
    expect(slugify('  Node.js & Bun!  ')).toBe('node-js-bun')
  })

  it('returns an empty string when nothing is left', () => {
    expect(slugify('!!!')).toBe('')
  })

  it('cuts at the max length without a trailing dash', () => {
    const slug = slugify('palavra '.repeat(20), 20)

    expect(slug.length).toBeLessThanOrEqual(20)

    expect(slug.endsWith('-')).toBe(false)
  })
})
