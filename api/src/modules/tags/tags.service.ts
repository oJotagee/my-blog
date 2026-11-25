import { getUniqueViolation } from '../../shared/db-errors'
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors'
import { slugify } from '../../shared/slug'
import type { TagBody } from './tags.dto'
import { tagsRepository } from './tags.repository'

const TAG_NOT_FOUND = 'Tag not found'

function toTagData({ name }: TagBody) {
  const slug = slugify(name)

  if (!slug) throw new BadRequestError('Name must contain letters or numbers')

  return { name, slug }
}

function toConflictError(error: unknown) {
  const constraint = getUniqueViolation(error)

  if (constraint === 'tags_name_unique' || constraint === 'tags_slug_unique') {
    return new ConflictError('Tag already exists')
  }

  return error
}

export const tagsService = {
  listPublic() {
    return tagsRepository.listWithCounts(true)
  },

  listAll() {
    return tagsRepository.listWithCounts(false)
  },

  listSkills() {
    return tagsRepository.listSkills()
  },

  async create(body: TagBody) {
    try {
      const tag = await tagsRepository.create(toTagData(body))

      if (!tag) throw new Error('Failed to create tag')

      return tag
    } catch (error) {
      throw toConflictError(error)
    }
  },

  async update(id: string, body: TagBody) {
    try {
      const tag = await tagsRepository.update(id, toTagData(body))

      if (!tag) throw new NotFoundError(TAG_NOT_FOUND)

      return tag
    } catch (error) {
      throw toConflictError(error)
    }
  },

  async delete(id: string) {
    const tag = await tagsRepository.delete(id)

    if (!tag) throw new NotFoundError(TAG_NOT_FOUND)
  },
}
