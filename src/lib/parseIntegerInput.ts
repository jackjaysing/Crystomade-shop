/** 編輯中允許空字串；送出或失焦時再轉成整數 */
export function isIntegerInputDraft(text: string): boolean {
  return text === '' || /^\d+$/.test(text)
}

export function parseIntegerInput(text: string, min: number): number {
  if (text.trim() === '') return min
  const parsed = parseInt(text.trim(), 10)
  if (Number.isNaN(parsed)) return min
  return Math.max(min, parsed)
}
