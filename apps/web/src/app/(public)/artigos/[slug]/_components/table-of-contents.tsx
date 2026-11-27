'use client'

import { useEffect, useState } from 'react'

import { twoDigits } from '@/lib/format'
import { cn } from '@/lib/utils'

type Heading = { id: string; number: number; title: string }

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id)

  useEffect(() => {
    // Linha de leitura: a faixa logo abaixo do header.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)

        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-112px 0px -60% 0px' },
    )

    for (const heading of headings) {
      const element = document.getElementById(heading.id)

      if (element) observer.observe(element)
    }

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <p className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
        Neste artigo
      </p>
      <nav
        aria-label="Neste artigo"
        className="mt-5 flex flex-col items-start gap-3 border-l border-border pl-4 text-sm"
      >
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            aria-current={active === heading.id ? 'location' : undefined}
            className={cn(
              'transition-colors hover:text-foreground',
              active === heading.id ? 'text-foreground' : 'text-faint',
            )}
          >
            {twoDigits(heading.number)}. {heading.title}
          </a>
        ))}
      </nav>
    </aside>
  )
}
