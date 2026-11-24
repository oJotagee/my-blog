import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const postSchema = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull().unique('posts_slug_unique'),
    title: varchar('title', { length: 160 }).notNull(),
    summary: varchar('summary', { length: 300 }),
    status: varchar('status', { length: 12 })
      .$type<'draft' | 'published'>()
      .notNull()
      .default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    studiedAt: date('studied_at', { mode: 'string' }),
    coverMediaId: uuid('cover_media_id'),
    ...timestamps,
  },
  (table) => [index('posts_status_published_at_idx').on(table.status, table.publishedAt)],
)

export const sectionSchema = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => postSchema.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (table) => [index('sections_post_id_position_idx').on(table.postId, table.position)],
)

export const mediaSchema = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique('media_key_unique'),
    mimeType: varchar('mime_type', { length: 32 }).notNull(),
    size: integer('size').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: varchar('alt', { length: 200 }),
    status: varchar('status', { length: 16 })
      .$type<'pending' | 'ready' | 'failed'>()
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (table) => [index('media_status_idx').on(table.status)],
)

export const blockSchema = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sectionSchema.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    type: varchar('type', { length: 8 }).$type<'text' | 'image'>().notNull(),
    groupId: integer('group_id'),
    content: text('content'),
    mediaId: uuid('media_id').references(() => mediaSchema.id, { onDelete: 'set null' }),
    caption: varchar('caption', { length: 200 }),
    ...timestamps,
  },
  (table) => [
    index('blocks_section_id_position_idx').on(table.sectionId, table.position),
    check(
      'blocks_type_check',
      sql`(${table.type} = 'text' AND ${table.content} IS NOT NULL) OR (${table.type} = 'image')`,
    ),
  ],
)

export const tagSchema = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique('tags_name_unique'),
  slug: varchar('slug', { length: 60 }).notNull().unique('tags_slug_unique'),
  ...timestamps,
})

export const postTagSchema = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => postSchema.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tagSchema.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index('post_tags_tag_id_idx').on(table.tagId),
  ],
)

export const postViewsDailySchema = pgTable(
  'post_views_daily',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => postSchema.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    views: integer('views').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.date] }),
    index('post_views_daily_date_idx').on(table.date),
  ],
)

export const siteSettingSchema = pgTable('site_settings', {
  id: varchar('id', { length: 16 }).primaryKey().default('main'),
  home: jsonb('home').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
})
