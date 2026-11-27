import { ArrowUpRightIcon } from 'lucide-react'

import type { Article } from '@/lib/blog'

export function References({ references }: { references: Article['references'] }) {
  return (
    <section aria-labelledby="referencias" className="mb-24 border-t border-line-strong pt-12">
      <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-faint">REFERÊNCIAS</p>
      <h2
        id="referencias"
        className="mt-4 mb-7 text-[clamp(2rem,5vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.035em]"
      >
        Para continuar estudando
      </h2>
      <p className="text-[1.0625rem] leading-[1.85] text-muted-foreground">
        Materiais usados como base para este estudo e boas leituras para aprofundar os conceitos
        apresentados.
      </p>
      <ol className="mt-10 divide-y divide-border border-y border-border">
        {references.map((reference) => (
          <li key={reference.id}>
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-8 py-5"
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <strong className="text-[0.9375rem] font-medium break-words">
                  {reference.title}
                </strong>
                {(reference.author || reference.note) && (
                  <small className="font-mono text-[0.6875rem] text-faint">
                    {[reference.author, reference.note].filter(Boolean).join(' · ')}
                  </small>
                )}
              </span>
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              />
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
