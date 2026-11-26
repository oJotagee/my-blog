import { BadRequestError } from '../../shared/errors'
import { postsRepository } from '../posts/posts.repository'
import { emptySite, type SiteBody } from './site.dto'
import { siteRepository } from './site.repository'

async function load(): Promise<SiteBody> {
  return { ...emptySite, ...(await siteRepository.get()) }
}

async function findFeatured(featuredPostId: string | null) {
  if (featuredPostId) {
    const chosen = await postsRepository.findPublishedItemById(featuredPostId)

    if (chosen) return chosen
  }

  // The chosen post was deleted or unpublished: fall back to the latest one.
  const { items } = await postsRepository.listPublished({ limit: 1, offset: 0 })

  return items[0] ?? null
}

export const siteService = {
  getAdmin: load,

  async getPublic() {
    const { featuredPostId, ...site } = await load()

    const post = await findFeatured(featuredPostId)

    return {
      ...site,
      featuredPost: post && {
        id: post.id,
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        publishedAt: post.publishedAt,
        studiedFrom: post.studiedFrom,
        studiedTo: post.studiedTo,
        readingMinutes: post.readingMinutes,
        tags: post.tags,
      },
    }
  },

  async update(body: SiteBody) {
    if (body.featuredPostId && !(await postsRepository.findRowById(body.featuredPostId))) {
      throw new BadRequestError('Unknown post')
    }

    await siteRepository.save(body)

    return body
  },
}
