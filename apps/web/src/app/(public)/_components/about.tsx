import { SectionLabel } from './section-label'

type Props = { number: string; title: string; text: string }

export function About({ number, title, text }: Props) {
  const paragraphs = text.split(/\n+/).filter(Boolean)

  return (
    <section id="sobre" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-6 sm:py-24">
      <SectionLabel number={number} label="SOBRE" />
      <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
        <h2 className="text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
          {title}
        </h2>
        <div className="flex max-w-prose flex-col gap-5 leading-relaxed text-muted-foreground">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}
