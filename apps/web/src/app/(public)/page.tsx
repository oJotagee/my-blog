import { parseFilters } from '@/lib/archive'
import { getPosts, getSite, getTags } from '@/lib/blog'

import { About } from './_components/about'
import { Archive } from './_components/archive'
import { FeaturedPost } from './_components/featured-post'
import { Hero } from './_components/hero'
import { SiteFooter } from './_components/site-footer'
import { SiteHeader } from './_components/site-header'

export default async function Home({ searchParams }: PageProps<'/'>) {
  const filters = parseFilters(await searchParams)

  const [site, posts, tags, everything] = await Promise.all([
    getSite(),
    getPosts(filters),
    getTags(),
    getPosts({ q: '', tag: '', page: 1 }, 1),
  ])

  const sections = site.featuredPost ? ['01', '02', '03'] : ['', '01', '02']

  return (
    <>
      <SiteHeader portfolioUrl={site.portfolioUrl} />
      <main className="flex-1">
        <Hero
          site={site}
          postCount={everything.total}
          tagCount={tags.length}
          nextHref={site.featuredPost ? '#destaque' : '#artigos'}
        />
        {site.featuredPost && <FeaturedPost number={sections[0] ?? ''} post={site.featuredPost} />}
        <Archive number={sections[1] ?? ''} filters={filters} posts={posts} tags={tags} />
        <About number={sections[2] ?? ''} title={site.aboutTitle} text={site.aboutText} />
      </main>
      <SiteFooter site={site} />
    </>
  )
}
