import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { type ArchiveFilters, archiveHref, pageItems } from '@/lib/archive'

type Props = { filters: ArchiveFilters; totalPages: number }

export function ArchivePagination({ filters, totalPages }: Props) {
  const { page } = filters

  const href = (target: number) => `${archiveHref({ ...filters, page: target })}#artigos`

  return (
    <Pagination className="mt-8">
      <PaginationContent className="font-mono text-xs">
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1)} />
          </PaginationItem>
        )}
        {pageItems(page, totalPages).map((item, index) => (
          <PaginationItem key={item === 'gap' ? `gap-${index}` : item}>
            {item === 'gap' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={href(item)}
                isActive={item === page}
                aria-label={`Página ${item}`}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext href={href(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}
