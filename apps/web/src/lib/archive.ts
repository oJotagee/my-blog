import { z } from 'zod'

export const PAGE_SIZE = 10

const text = (max: number) => z.string().trim().max(max).catch('')

const filtersSchema = z.object({
  q: text(100),
  tag: text(60),
  page: z.coerce.number().int().min(1).catch(1),
})

export type ArchiveFilters = z.infer<typeof filtersSchema>

export function parseFilters(params: Record<string, string | string[] | undefined>) {
  return filtersSchema.parse(params)
}

export function archiveHref({ q, tag, page }: Partial<ArchiveFilters>) {
  const params = new URLSearchParams()

  if (q) params.set('q', q)

  if (tag) params.set('tag', tag)

  if (page && page > 1) params.set('page', String(page))

  const query = params.toString()

  return query ? `/?${query}` : '/'
}

export function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b)

  return wanted.flatMap((item, index) => {
    const previous = wanted[index - 1]

    if (previous === undefined || item - previous === 1) return [item]

    return item - previous === 2 ? [item - 1, item] : ['gap' as const, item]
  })
}
