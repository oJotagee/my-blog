import { describe, expect, it } from 'bun:test'

import { formatPublished, formatStudied } from '../src/lib/format'

describe('dates', () => {
  it('shows the publication day in the Sao Paulo timezone', () => {
    expect(formatPublished('2026-03-19T01:00:00.000Z')).toBe('18 mar 2026')

    expect(formatPublished(null)).toBeNull()
  })

  it('shortens the study range as much as possible', () => {
    expect(formatStudied('2026-03-12', '2026-03-17')).toBe('12–17 mar 2026')

    expect(formatStudied('2026-02-28', '2026-03-03')).toBe('28 fev – 03 mar 2026')

    expect(formatStudied('2025-12-30', '2026-01-02')).toBe('30 dez 2025 – 02 jan 2026')

    expect(formatStudied('2026-03-12', null)).toBe('12 mar 2026')

    expect(formatStudied(null, null)).toBeNull()
  })
})
