import type { CrystalSoulCard } from '../types'
import { devMaxUpgradeCrystalSoulCardRpc } from '../api/grimoire'

/** 開發測試：一鍵升至極境滿級 */
export async function devMaxUpgradeCrystalSoulCard(
  card: CrystalSoulCard
): Promise<CrystalSoulCard> {
  return devMaxUpgradeCrystalSoulCardRpc(card.id)
}
