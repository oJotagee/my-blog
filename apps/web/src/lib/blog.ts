import { isAxiosError } from 'axios'
import { cache } from 'react'
import { z } from 'zod'

import { api } from './api'
import { type ArchiveFilters, PAGE_SIZE } from './archive'

const tagSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() })

const postSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  publishedAt: z.string().nullable(),
  studiedFrom: z.string().nullable(),
  studiedTo: z.string().nullable(),
  tags: z.array(tagSchema),
})

const postPageSchema = z.object({
  items: z.array(postSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

const text = z.string().nullable()

const imageSchema = z.object({
  id: z.string(),
  url: text,
  alt: text,
  width: z.number().nullable(),
  height: z.number().nullable(),
})

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'code', 'callout', 'cards', 'quote']),
  groupId: z.number().nullable(),
  content: text,
  caption: text,
  meta: z
    .object({
      language: z.string().optional(),
      filename: z.string().optional(),
      label: z.string().optional(),
      items: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
    })
    .nullable(),
  image: imageSchema.nullable(),
})

const articleSchema = postSchema.extend({
  cover: imageSchema.extend({ caption: text }).nullable(),
  sections: z.array(
    z.object({ id: z.string(), label: text, title: text, blocks: z.array(blockSchema) }),
  ),
  references: z.array(
    z.object({ id: z.string(), title: z.string(), author: text, note: text, url: z.string() }),
  ),
  number: z.number(),
  total: z.number(),
})

const popularSchema = z.array(
  z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    publishedAt: text,
    views: z.number(),
  }),
)

const siteSchema = z.object({
  heroEyebrow: text,
  heroTitle: text,
  heroSubtitle: text,
  aboutTitle: text,
  aboutText: text,
  authorName: text,
  city: text,
  githubUrl: text,
  portfolioUrl: text,
  footerNote: text,
  footerYear: z.number().nullable(),
  featuredPost: postSchema.nullable(),
})

export type Post = z.infer<typeof postSchema>

export type Tag = z.infer<typeof tagSchema>

export async function getSite() {
  const { data } = await api.get('/site')

  const site = siteSchema.parse(data)

  // Textos do design, usados enquanto o campo não é preenchido no painel.
  return {
    featuredPost: site.featuredPost,
    heroEyebrow: site.heroEyebrow ?? 'Notas sobre o que estou estudando',
    heroTitle: site.heroTitle ?? 'Aprender, escrever\ne tornar público.',
    heroSubtitle:
      site.heroSubtitle ??
      'Um arquivo pessoal sobre desenvolvimento de software. Cada assunto estudado vira uma nota; cada nota, uma forma de consolidar conhecimento.',
    aboutTitle: site.aboutTitle ?? 'Um caderno de estudo aberto.',
    aboutText:
      site.aboutText ??
      'Este blog existe para criar um compromisso: se eu estudei ou li algo, preciso conseguir explicar com clareza.\n\nOs textos registram o processo, as dúvidas e o que realmente ficou. Depois, viram repertório para projetos, LinkedIn e currículo.',
    authorName: site.authorName ?? 'João Guilherme',
    city: site.city ?? 'Itapetininga, SP',
    footerNote: site.footerNote,
    footerYear: site.footerYear ?? new Date().getFullYear(),
    githubUrl: site.githubUrl ?? 'https://github.com/oJotagee',
    portfolioUrl: site.portfolioUrl ?? 'https://joaoguilherme.website/pt',
  }
}

export type Site = Awaited<ReturnType<typeof getSite>>

export async function getPosts({ q, tag, page }: ArchiveFilters, limit = PAGE_SIZE) {
  const { data } = await api.get('/posts', {
    params: { q: q || undefined, tag: tag || undefined, page, limit },
  })

  return postPageSchema.parse(data)
}

export async function getTags() {
  const { data } = await api.get('/tags')

  return z.array(tagSchema).parse(data)
}

export type Article = z.infer<typeof articleSchema>

export type Block = z.infer<typeof blockSchema>

export type PopularPost = z.infer<typeof popularSchema>[number]

// cache: a página e os metadados pedem o mesmo artigo na mesma requisição.
export const getArticle = cache(async (slug: string) => {
  try {
    const { data } = await api.get(`/posts/${encodeURIComponent(slug)}`)

    return articleSchema.parse(data)
  } catch (error) {
    // 400 é um endereço fora do formato de slug: para o leitor, também não existe.
    if (isAxiosError(error) && [400, 404].includes(error.response?.status ?? 0)) return null

    throw error
  }
})

export async function getPopular(limit: number) {
  const { data } = await api.get('/analytics/popular', { params: { limit } })

  return popularSchema.parse(data)
}
