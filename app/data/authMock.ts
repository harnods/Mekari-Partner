/**
 * Mock account directory for the auth prototype (no backend). Decides whether an
 * email already has a Mekari Partner account:
 *   • registered  → password → OTP → Home
 *   • unregistered → Complete your profile (sign up) → Home
 * Adjust the seed list / rule here to demo different branches.
 */
const REGISTERED_EMAILS = new Set<string>([
  'rizal.candra@centralperk.co.id',
  'admin@centralperk.co.id',
  'demo@mekari.com',
])

/** True when the email already has an account (seed list, or any @mekari.com). */
export function isRegisteredEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  if (!e) return false
  if (/@mekari\.com$/.test(e)) return true
  return REGISTERED_EMAILS.has(e)
}

/** The email the "Sign in with Google" button signs in as (registered → Home). */
export const GOOGLE_DEMO_EMAIL = 'rizal.candra@mekari.com'
