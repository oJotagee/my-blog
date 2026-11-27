import ReactMarkdown, { type Components } from 'react-markdown'

import { cn } from '@/lib/utils'

const heading = 'mt-14 mb-4 text-2xl font-semibold tracking-tight'

const list = 'my-8 border-t border-border text-muted-foreground'

const item = 'border-b border-border py-4'

// O título da seção já é um h2, então os títulos do texto começam no h3.
const components: Components = {
  h1: ({ children }) => <h3 className={heading}>{children}</h3>,
  h2: ({ children }) => <h3 className={heading}>{children}</h3>,
  h3: ({ children }) => <h3 className={heading}>{children}</h3>,
  h4: ({ children }) => <h4 className="mt-10 mb-3 text-lg font-semibold">{children}</h4>,
  p: ({ children }) => (
    <p className="my-6 text-[1.0625rem] leading-[1.85] text-muted-foreground">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-foreground underline decoration-line-strong underline-offset-4 hover:decoration-foreground"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ul: ({ children }) => (
    <ul
      className={cn(
        list,
        '[&>li]:before:mr-3 [&>li]:before:font-mono [&>li]:before:text-faint [&>li]:before:content-["→"]',
      )}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className={cn(list, 'list-inside list-decimal marker:font-mono marker:text-faint')}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className={item}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-10 border-l-2 border-foreground pl-7 [&>p]:text-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-8 overflow-x-auto rounded-lg border border-border bg-card p-5 text-[0.8125rem] leading-[1.9] [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-10 border-border" />,
}

export function Markdown({ content, lead }: { content: string; lead?: boolean }) {
  return (
    <div
      className={cn(
        'break-words',
        lead &&
          '[&>p:first-child]:text-xl [&>p:first-child]:leading-[1.7] [&>p:first-child]:text-foreground',
      )}
    >
      {/* Imagens entram como bloco próprio, enviadas ao S3. */}
      <ReactMarkdown components={components} disallowedElements={['img']}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
