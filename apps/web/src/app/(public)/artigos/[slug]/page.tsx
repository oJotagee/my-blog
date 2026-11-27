import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getArticle, getPopular, getSite } from '@/lib/blog'

import { ArticleCover } from './_components/article-cover'
import { ArticleHeader } from './_components/article-header'
import { ArticleIntro } from './_components/article-intro'
import { ArticleSection } from './_components/article-section'
import { PopularPosts } from './_components/popular-posts'
import { References } from './_components/references'
import { RegisterView } from './_components/register-view'
import { TableOfContents } from './_components/table-of-contents'

export async function generateMetadata({
  params,
}: PageProps<'/artigos/[slug]'>): Promise<Metadata> {
  const article = await getArticle((await params).slug)

  if (!article) return { title: 'Artigo não encontrado' }

  const description = article.summary ?? undefined

  return {
    title: article.title,
    description,
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      publishedTime: article.publishedAt ?? undefined,
      images: article.cover?.url ? [article.cover.url] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: PageProps<'/artigos/[slug]'>) {
  const { slug } = await params

  const [article, site, popular] = await Promise.all([getArticle(slug), getSite(), getPopular(4)])

  if (!article) notFound()

  const headings = article.sections.flatMap((section, index) => {
    const title = section.label ?? section.title

    return title ? [{ id: `secao-${index + 1}`, number: index + 1, title }] : []
  })

  return (
    <>
      <RegisterView slug={article.slug} />
      <ArticleHeader number={article.number} total={article.total} />
      <main className="flex-1">
        <article>
          <ArticleIntro article={article} author={site.authorName} />
          {article.cover?.url && <ArticleCover cover={article.cover} />}

          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[13rem_minmax(0,42rem)] lg:gap-20">
            <TableOfContents headings={headings} />
            <div className="min-w-0 lg:col-start-2 [&>:last-child]:mb-0">
              {article.sections.map((section, index) => (
                <ArticleSection
                  key={section.id}
                  id={`secao-${index + 1}`}
                  number={index + 1}
                  section={section}
                  lead={index === 0}
                />
              ))}
              {article.references.length > 0 && <References references={article.references} />}
            </div>
          </div>
        </article>
        <PopularPosts posts={popular.filter((post) => post.slug !== article.slug).slice(0, 3)} />
      </main>
    </>
  )
}
