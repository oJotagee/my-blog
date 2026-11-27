import { describe, expect, it } from 'bun:test'

import { groupBlocks } from '../src/lib/article'

describe('article', () => {
  it('groups only neighbouring blocks with the same group', () => {
    const blocks = [null, null, 1, 1, null, 1, 2, 2].map((groupId, id) => ({ id, groupId }))

    expect(groupBlocks(blocks).map((group) => group.map((block) => block.id))).toEqual([
      [0],
      [1],
      [2, 3],
      [4],
      [5],
      [6, 7],
    ])

    expect(groupBlocks([])).toEqual([])
  })
})
