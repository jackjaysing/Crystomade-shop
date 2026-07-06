const PREFIX = 'crystomade-grimoire-seal-'

export function shouldPlaySealAnimation(cardId: string): boolean {
  try {
    return sessionStorage.getItem(PREFIX + cardId) !== '1'
  } catch {
    return true
  }
}

export function markSealAnimationPlayed(cardId: string): void {
  try {
    sessionStorage.setItem(PREFIX + cardId, '1')
  } catch {
    /* ignore */
  }
}
