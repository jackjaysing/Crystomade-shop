/** 在陣列中將項目上移或下移一格 */
export function moveListItem<T>(
  items: T[],
  index: number,
  direction: 'up' | 'down'
): T[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
