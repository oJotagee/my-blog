import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'

import { MobileMenu } from './mobile-menu'

export const NAV_LINKS = [
  { href: '/#artigos', label: 'Artigos' },
  { href: '/#sobre', label: 'Sobre' },
]

export function SiteHeader({ portfolioUrl }: { portfolioUrl: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          jg<span className="text-faint">/</span>blog
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={portfolioUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'px-3 font-mono text-xs',
            })}
          >
            Portfólio
            <ArrowUpRightIcon data-icon="inline-end" />
          </a>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  )
}
