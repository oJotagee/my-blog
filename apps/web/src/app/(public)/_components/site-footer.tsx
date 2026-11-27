import { ArrowUpRightIcon } from 'lucide-react'

import type { Site } from '@/lib/blog'

export function SiteFooter({ site }: { site: Site }) {
  const signature = [site.authorName, site.city, site.footerYear].join(' · ')

  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pt-20 pb-8 sm:px-6">
      <div className="flex flex-col gap-5 border-t border-border py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono">jg/blog</p>
        <div className="sm:text-center">
          <p>{signature}</p>
          {site.footerNote && <p className="mt-1">{site.footerNote}</p>}
        </div>
        <a
          href={site.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          GitHub
          <ArrowUpRightIcon aria-hidden="true" className="size-4" />
        </a>
      </div>
    </footer>
  )
}
