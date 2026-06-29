import type { RaffleWithMeta } from './types'

export function isRaffleRegistrationOpen(r: RaffleWithMeta): boolean {
  return (
    r.status === 'open' &&
    r.is_active &&
    new Date(r.registration_deadline) > new Date()
  )
}
