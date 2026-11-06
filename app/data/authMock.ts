/**
 * Mock account directory for the auth prototype (no backend). Decides whether an
 * email already has a Mekari Partner account:
 *   • registered  → password → OTP → Home
 *   • unregistered → Complete your profile (sign up) → Home
 *   • "+deleted" in the address (e.g. dirman+deleted@gmail.com) → a registered
 *     Mekari account whose partner organization was deleted → on sign-in, the
 *     "You don't have a partner organization" chooser (/partner-organization)
 * Adjust the seed list / rule here to demo different branches.
 */
const REGISTERED_EMAILS = new Set<string>([
  'rizal.candra@centralperk.co.id',
  'admin@centralperk.co.id',
  'demo@mekari.com',
])

/** Demo rule: any address with "+deleted" before the @ (dirman+deleted@…)
 *  is an account whose partner organization was deleted from the backoffice. */
export function isDeletedOrgEmail(email: string): boolean {
  const local = email.trim().toLowerCase().split('@')[0] || ''
  return local.split('+').slice(1).includes('deleted')
}

/** True when the email already has an account (seed list, any @mekari.com, or a
 *  "+deleted" demo address — the Mekari account itself still exists). */
export function isRegisteredEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  if (!e) return false
  if (isDeletedOrgEmail(e)) return true
  if (/@mekari\.com$/.test(e)) return true
  return REGISTERED_EMAILS.has(e)
}

/** The email the "Sign in with Google" button signs in as (registered → Home). */
export const GOOGLE_DEMO_EMAIL = 'rizal.candra@mekari.com'

/**
 * The Mekari account record of a REGISTERED mock account. Sign-up makes every
 * field required, so a real account always has all of them — a registered
 * account signing in (seed list, @mekari.com, "+deleted") gets this complete
 * record instead of blanks. Deterministic, so the same email always shows the
 * same data.
 */
export function mockAccountProfile(email: string, fullName: string) {
  return {
    fullName,
    email,
    company: 'PT Central Perk Indonesia',
    jobPosition: 'Business Consultant',
    role: 'consultant',
    phone: '81234567890',
    phoneIso2: 'id',
  }
}
