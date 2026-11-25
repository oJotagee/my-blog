import { and, eq, isNull } from 'drizzle-orm'

import { db } from '../../db'
import { sessionSchema } from '../../db/schema'

type NewSession = typeof sessionSchema.$inferInsert

export const authRepository = {
  async createSession(data: NewSession & { id: string }) {
    await db.insert(sessionSchema).values(data)
  },

  async findSessionById(id: string) {
    const [session] = await db.select().from(sessionSchema).where(eq(sessionSchema.id, id)).limit(1)

    return session
  },

  async rotateSessionToken(id: string, refreshTokenHash: string, expiresAt: Date) {
    await db
      .update(sessionSchema)
      .set({ refreshTokenHash, expiresAt })
      .where(and(eq(sessionSchema.id, id), isNull(sessionSchema.revokedAt)))
  },

  async revokeSession(id: string) {
    await db
      .update(sessionSchema)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessionSchema.id, id), isNull(sessionSchema.revokedAt)))
  },
}
