import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Carregando"
      className="mx-auto w-full max-w-6xl flex-1 px-5 pt-32 pb-20 sm:px-6 sm:pt-40"
    >
      <Skeleton className="mb-12 h-3.5 w-44" />
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-20">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-3.5 w-56 max-w-full" />
          <Skeleton className="h-11 w-full sm:h-16" />
          <Skeleton className="h-11 w-3/4 sm:h-16" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
        </div>
        <div className="flex flex-col gap-4 self-end border-t border-border pt-5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  )
}
