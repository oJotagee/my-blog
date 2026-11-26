import { db } from '../../db'
import { siteSettingSchema } from '../../db/schema'

const MAIN = 'main'

export const siteRepository = {
  async get() {
    const [row] = await db.select().from(siteSettingSchema).limit(1)

    return row?.home
  },

  async save(home: Record<string, unknown>) {
    await db
      .insert(siteSettingSchema)
      .values({ id: MAIN, home })
      .onConflictDoUpdate({ target: siteSettingSchema.id, set: { home, updatedAt: new Date() } })
  },
}
