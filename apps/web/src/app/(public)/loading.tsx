import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Cada caixa tem a altura de uma linha do texto real, para nada pular quando ele chega.
function Line({ className, bar }: { className: string; bar: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <Skeleton className={bar} />
    </div>
  )
}

const TITLE_LINE = 'h-[2.88rem] sm:h-[4.32rem] lg:h-[5.28rem]'

const TEXT_LINE = 'h-[1.625rem] sm:h-[1.83rem]'

export default function Loading() {
  return (
    <div aria-busy="true" role="status" aria-label="Carregando" className="flex-1">
      <header className="fixed inset-x-0 top-0 border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <p className="font-mono text-sm font-semibold tracking-tight">
            jg<span className="text-faint">/</span>blog
          </p>
          <div className="flex items-center gap-3 sm:gap-6">
            <Skeleton className="hidden h-3.5 w-11 sm:block" />
            <Skeleton className="hidden h-3.5 w-10 sm:block" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-5 pt-24 pb-24 sm:px-6">
        <Line className="mb-8 h-4" bar="h-3 w-64" />

        <Line className={TITLE_LINE} bar="h-3/4 w-full max-w-[34rem]" />
        <Line className={TITLE_LINE} bar="h-3/4 w-4/5 max-w-[31rem]" />

        <div className="mt-10 grid gap-8 border-t border-border pt-6 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <Line className={TEXT_LINE} bar="h-3.5 w-full max-w-[26rem]" />
            <Line className={TEXT_LINE} bar="h-3.5 w-11/12 max-w-[25rem]" />
            <Line className={TEXT_LINE} bar="h-3.5 w-1/2 max-w-52" />
          </div>
          <div className="grid grid-cols-2 gap-6 lg:min-w-80 lg:justify-self-end">
            {['artigos', 'assuntos'].map((stat) => (
              <div key={stat}>
                <Line className="h-8" bar="h-6 w-9" />
                <Line className="mt-1 h-4" bar="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
