import { RAFFLE_RESULT_SEEN_KEY } from '../constants/raffles'

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(RAFFLE_RESULT_SEEN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((id) => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeSet(ids: Set<string>): void {
  try {
    localStorage.setItem(RAFFLE_RESULT_SEEN_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function isRaffleResultSeen(raffleId: string): boolean {
  return readSet().has(raffleId)
}

export function markRaffleResultsSeen(raffleIds: string[]): void {
  if (raffleIds.length === 0) return
  const set = readSet()
  for (const id of raffleIds) set.add(id)
  writeSet(set)
}
