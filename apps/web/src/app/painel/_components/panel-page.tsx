import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { SidebarTrigger } from '@/components/ui/sidebar'

type Props = { eyebrow: string; title: string; next: string }

/** Cabeçalho do painel; o conteúdo de cada tela entra nas próximas etapas. */
export function PanelPage({ eyebrow, title, next }: Props) {
  return (
    <>
      <header className="flex min-h-24 items-center gap-4 border-b border-border px-5 py-5 sm:px-8 lg:px-10">
        <SidebarTrigger className="md:hidden" />
        <div>
          <p className="font-mono text-[0.625rem] tracking-widest text-faint uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
      </header>
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-mono text-muted-foreground">em construção_</EmptyTitle>
          <EmptyDescription>{next}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}
