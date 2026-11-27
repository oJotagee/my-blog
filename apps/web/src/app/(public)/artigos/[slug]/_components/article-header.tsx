import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { twoDigits } from '@/lib/format'

export function ArticleHeader({ number, total }: { number: number; total: number }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm font-semibold transition-opacity hover:opacity-70"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          <span>
            jg<span className="text-faint">/</span>blog
          </span>
        </Link>
        <p className="font-mono text-xs text-faint">
          artigo {twoDigits(number)}
          <span className="text-line-strong">/</span>
          {twoDigits(total)}
        </p>
      </nav>
    </header>
  )
}
