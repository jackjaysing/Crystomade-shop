import { formatErrorMessage } from '../formatError'
import { parseMagicianShippingQuota, type MagicianShippingQuota } from '../grimoireMagicianShipping'
import { supabase } from '../supabase'

/** 會員：查詢魔法師免運額度 */
export async function fetchMemberMagicianShippingQuota(
  userId: string
): Promise<MagicianShippingQuota> {
  const { data, error } = await supabase.rpc('get_member_magician_shipping_status', {
    p_user_id: userId,
  })

  if (error) {
    const msg = formatErrorMessage(error)
    if (/get_member_magician_shipping_status|42883/i.test(msg)) {
      return {
        eligible: false,
        tier: 0,
        totalXp: 0,
        limit: 0,
        used: 0,
        remaining: 0,
        periodKey: null,
      }
    }
    throw new Error(msg)
  }

  return parseMagicianShippingQuota(data)
}
