// @vitest-environment happy-dom
/**
 * Signing in with a "+deleted" demo address (dirman+deleted@gmail.com) puts the
 * account in the "partner org removed" state, so AuthGate shows the chooser.
 * Any other address clears that leftover state. A different account signing in
 * replaces the stored sign-up profile (no one else's name in the header).
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { useProfile } from '~/composables/useProfile'
import { usePartnerStatus } from '~/composables/usePartnerStatus'

// useAuth calls these as Nuxt auto-imports — register them as globals.
beforeAll(() => {
  const g = globalThis as Record<string, unknown>
  g.useProfile = useProfile
  g.usePartnerStatus = usePartnerStatus
})

beforeEach(() => localStorage.clear())

describe('sign-in with a +deleted address', () => {
  it('marks the partner org removed and derives a clean name', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()
    const ps = usePartnerStatus()
    auth.signInMock('dirman+deleted@gmail.com')
    expect(ps.status.value).toBe('removed')
    expect(auth.user.value?.name).toBe('Dirman')
    // Profile now belongs to this account — complete, like every Mekari account.
    const p = useProfile().profile.value
    expect(p.fullName).toBe('Dirman')
    expect(p.email).toBe('dirman+deleted@gmail.com')
    for (const k of ['company', 'jobPosition', 'role', 'phone'] as const) expect(p[k]).not.toBe('')
  })

  it('a normal address afterwards clears the removed state', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()
    const ps = usePartnerStatus()
    auth.signInMock('dirman+deleted@gmail.com')
    expect(ps.status.value).toBe('removed')
    auth.signInMock('rizal.candra@mekari.com')
    expect(ps.status.value).toBe('none')
  })

  it('keeps the sign-up profile when the same account signs in', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    useProfile().save({ fullName: 'Siti Rahmawati', email: 'siti@example.com', company: 'PT Maju', jobPosition: 'Consultant', role: 'consultant', phone: '812', phoneIso2: 'id' })
    useAuth().signInMock('siti@example.com', 'Siti Rahmawati')
    expect(useProfile().profile.value.company).toBe('PT Maju')
  })

  it('fills only the blanks of an incomplete record for the same account', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    useProfile().save({ fullName: 'Dirman S', email: 'dirman+deleted@gmail.com', company: '', jobPosition: '', role: '', phone: '', phoneIso2: 'id' })
    useAuth().signInMock('dirman+deleted@gmail.com')
    const p = useProfile().profile.value
    expect(p.fullName).toBe('Dirman S')
    for (const k of ['company', 'jobPosition', 'role', 'phone'] as const) expect(p[k]).not.toBe('')
  })
})

describe('prototype session (gate off)', () => {
  it('a fresh visitor is anonymous; mock sign-in persists; sign out clears it', async () => {
    const g = globalThis as Record<string, unknown>
    g.$fetch = async (url: string) => (url === '/api/auth/me' ? { gateEnabled: false, user: null } : {})
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()
    await auth.refresh()
    expect(auth.status.value).toBe('anonymous')
    auth.signInMock('rizal.candra@mekari.com')
    await auth.refresh()
    expect(auth.status.value).toBe('authed')
    expect(auth.user.value?.email).toBe('rizal.candra@mekari.com')
    await auth.signOut()
    await auth.refresh()
    expect(auth.status.value).toBe('anonymous')
  })
})
