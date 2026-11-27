import { describe, expect, it } from 'bun:test'

import { archiveHref, pageItems, parseFilters } from '../src/lib/archive'

describe('archive', () => {
  it('ignores invalid search params', () => {
    expect(parseFilters({ page: 'abc', q: ['a', 'b'], tag: 'x'.repeat(61) })).toEqual({
      q: '',
      tag: '',
      page: 1,
    })

    expect(parseFilters({ page: '3', q: '  filas ' })).toEqual({ q: 'filas', tag: '', page: 3 })
  })

  it('builds the url with only the used filters', () => {
    expect(archiveHref({ q: '', tag: '', page: 1 })).toBe('/')

    expect(archiveHref({ q: 'a b', tag: 'backend', page: 2 })).toBe('/?q=a+b&tag=backend&page=2')
  })

  it('lists the page numbers with gaps', () => {
    expect(pageItems(1, 1)).toEqual([1])

    expect(pageItems(1, 3)).toEqual([1, 2, 3])

    expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])

    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10])
  })
})
