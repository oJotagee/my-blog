type Grouped = { groupId: number | null }

/** Blocos vizinhos com o mesmo groupId ficam lado a lado. */
export function groupBlocks<T extends Grouped>(blocks: T[]) {
  const groups: T[][] = []

  for (const block of blocks) {
    const last = groups.at(-1)

    if (last && block.groupId !== null && last[0]?.groupId === block.groupId) last.push(block)
    else groups.push([block])
  }

  return groups
}
