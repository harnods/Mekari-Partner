/**
 * Where a signed-in user may go, based on their partner-organization status.
 * Pure (no Vue / router) so the routing rules are unit-testable; AuthGate
 * applies the result.
 *
 * Statuses (see usePartnerStatus):
 *   'none' / 'draft' — never had a partner org → the registration form
 *   'submitted'      — is a partner → the whole app is open
 *   'removed'        — HAD a partner org, but it was deleted (from the Mekari
 *                      backoffice); the Mekari account itself still exists →
 *                      on every sign-in, the "no partner organization" chooser:
 *                      register a new org, or go to Home.
 */
export type PartnerStatus = 'none' | 'draft' | 'submitted' | 'approved' | 'removed'

export const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']
export const REG_ROUTE = '/partner-registration'
export const ORG_CHOICE_ROUTE = '/partner-organization'

const under = (p: string, base: string) => p === base || p.startsWith(base + '/')
export const isAuthPath = (p: string) => AUTH_ROUTES.some((a) => under(p, a))

/**
 * Returns the path to redirect a signed-in user to, or null to let them stay.
 * @param homeChosen  this session, a 'removed' user picked "Go to Home"
 */
export function partnerGateTarget(status: PartnerStatus, path: string, homeChosen: boolean): string | null {
  if (isAuthPath(path)) return null
  // 'submitted' = partner org under validation; 'approved' = validated. Both are
  // partners → the whole app is open.
  if (status === 'submitted' || status === 'approved') return null
  if (status === 'removed') {
    // "Go to Home" opens the app for the rest of this session (what a user
    // without an org may do on Home is still to be decided — open for now).
    if (homeChosen) return null
    return under(path, ORG_CHOICE_ROUTE) ? null : ORG_CHOICE_ROUTE
  }
  // Never had an org: straight to the registration (the chooser stays
  // reachable by URL for review).
  if (under(path, REG_ROUTE) || under(path, ORG_CHOICE_ROUTE)) return null
  return REG_ROUTE
}
