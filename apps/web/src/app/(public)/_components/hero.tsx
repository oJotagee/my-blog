import { ArrowDownIcon } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import type { Site } from '@/lib/blog'
import { twoDigits } from '@/lib/format'

type Props = { site: Site; postCount: number; tagCount: number; nextHref: string }

export function Hero({ site, postCount, tagCount, nextHref }: Props) {
  const [lead, ...rest] = site.heroTitle.split('\n')

  const stats = [
    { label: 'Artigos', value: postCount },
    { label: 'Assuntos', value: tagCount },
  ]

  return (
    <section className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-5 pt-24 pb-24 sm:px-6">
      <p className="mb-8 flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-faint uppercase">
        <span className="size-1.5 rounded-full bg-foreground" />
        {site.heroEyebrow}
      </p>

      <h1 className="max-w-4xl text-5xl leading-[0.96] font-semibold tracking-[-0.055em] text-balance break-words sm:text-7xl lg:text-[5.5rem]">
        {lead}
        {rest.length > 0 && <span className="block text-faint">{rest.join(' ')}</span>}
      </h1>

      <div className="mt-10 grid gap-8 border-t border-border pt-6 lg:grid-cols-2 lg:gap-16">
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {site.heroSubtitle}
        </p>
        <dl className="grid grid-cols-2 gap-6 lg:min-w-80 lg:justify-self-end">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse justify-end">
              <dt className="mt-1 font-mono text-[11px] tracking-widest text-faint uppercase">
                {stat.label}
              </dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                {twoDigits(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <a
        href={nextHref}
        aria-label="Ir para a próxima seção"
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon-lg',
          className:
            'absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground hover:bg-transparent dark:hover:bg-transparent',
        })}
      >
        <ArrowDownIcon />
      </a>
    </section>
  )
}
