/**
 * Partner-organization gate — where a signed-in user lands, by partner status.
 *
 * Load-bearing:
 *  - A user whose partner org was REMOVED (account still exists) sees the
 *    chooser on sign-in, and can only leave it by picking an option.
 *  - "Go to Home" opens the app for that session.
 *  - A user who NEVER had an org still goes straight to the registration form.
 *  - A partner (submitted) is never redirected.
 */
import { describe, it, expect } from 'vitest'
import { partnerGateTarget, REG_ROUTE, ORG_CHOICE_ROUTE } from '~/data/partnerGate'

describe('partnerGateTarget', () => {
  it('auth routes are never redirected', () => {
    for (const s of ['none', 'draft', 'submitted', 'removed'] as const) {
      expect(partnerGateTarget(s, '/sign-in', false)).toBeNull()
      expect(partnerGateTarget(s, '/sign-in/otp', false)).toBeNull()
    }
  })

  it('removed org → the chooser, from anywhere (incl. the registration form)', () => {
    expect(partnerGateTarget('removed', '/', false)).toBe(ORG_CHOICE_ROUTE)
    expect(partnerGateTarget('removed', '/sales/invoices', false)).toBe(ORG_CHOICE_ROUTE)
    expect(partnerGateTarget('removed', REG_ROUTE, false)).toBe(ORG_CHOICE_ROUTE)
    expect(partnerGateTarget('removed', ORG_CHOICE_ROUTE, false)).toBeNull()
  })

  it('removed org + "Go to Home" this session → the app is open', () => {
    expect(partnerGateTarget('removed', '/', true)).toBeNull()
    expect(partnerGateTarget('removed', '/sales/invoices', true)).toBeNull()
  })

  it('never had an org → straight to the registration form', () => {
    expect(partnerGateTarget('none', '/', false)).toBe(REG_ROUTE)
    expect(partnerGateTarget('draft', '/', false)).toBe(REG_ROUTE)
    expect(partnerGateTarget('none', REG_ROUTE, false)).toBeNull()
    // "Go to Home" only applies to a removed org.
    expect(partnerGateTarget('none', '/', true)).toBe(REG_ROUTE)
  })

  it('partner → never redirected', () => {
    expect(partnerGateTarget('submitted', '/', false)).toBeNull()
    expect(partnerGateTarget('submitted', ORG_CHOICE_ROUTE, false)).toBeNull()
  })
})

import { isDeletedOrgEmail, isRegisteredEmail } from '~/data/authMock'

describe('"+deleted" demo accounts', () => {
  it('any address with +deleted before the @ is a deleted-org account', () => {
    expect(isDeletedOrgEmail('dirman+deleted@gmail.com')).toBe(true)
    expect(isDeletedOrgEmail('Dirman+Deleted@Mekari.com')).toBe(true)
    expect(isDeletedOrgEmail('dirman+test+deleted@x.co')).toBe(true)
    expect(isDeletedOrgEmail('dirman@gmail.com')).toBe(false)
    expect(isDeletedOrgEmail('dirman+deletedx@gmail.com')).toBe(false)
    expect(isDeletedOrgEmail('deleted@gmail.com')).toBe(false)
  })

  it('the Mekari account still exists → treated as registered (password → OTP, not sign-up)', () => {
    expect(isRegisteredEmail('dirman+deleted@gmail.com')).toBe(true)
    expect(isRegisteredEmail('dirman@gmail.com')).toBe(false)
  })
})
