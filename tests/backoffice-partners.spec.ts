/**
 * Backoffice — Partner Management + Partner Data Change page logic
 * (app/components/backoffice/partners/partnersView.ts) on top of the store.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  bo, resetBackoffice, setBoToday, getPartner, getCr, createPartner, approveCr, rejectCr,
  updatePartnerProfile, setPartnerStatus,
} from '~/data/backoffice'
import {
  partnerRow, partnerMatches, blankCreateDraft, userSuggestions, pickExistingUser, clearUser, toStoreDraft,
  profileDraftOf, profileDirty, profileChanges, partnerActivityEntries, provenanceText, crRow, crMatches, openCrOf,
} from '~/components/backoffice/partners/partnersView'

beforeEach(() => {
  resetBackoffice()
  setBoToday('2026-11-06')
})

describe('partner list rows + filters (K-01)', () => {
  it('names a partner by brand, falling back to the legal name', () => {
    expect(partnerRow(getPartner('P-0004')!).name).toBe('Solusi Prima')
    expect(partnerRow(getPartner('P-0012')!).name).toBe('PT Nusa Cloud Integrasi')
    expect(partnerRow(getPartner('P-0004')!).origin).toBe('Registration')
    expect(partnerRow(getPartner('P-0015')!).origin).toBe('Manual')
  })

  it('matches search, status, Account Owner and drawer scopes together', () => {
    const rows = bo.partners.map(partnerRow)
    expect(rows.filter((r) => partnerMatches(r, 'surabaya', '', '')).map((r) => r.id)).toEqual(['P-0004'])
    expect(rows.filter((r) => partnerMatches(r, '', 'Unregistered', '')).length).toBe(2)
    expect(rows.filter((r) => partnerMatches(r, '', '', 'kevin.halim@mekari.com')).map((r) => r.id).sort()).toEqual(['P-0009', 'P-0015'])
    expect(rows.filter((r) => partnerMatches(r, '', '', '', { prov: ['DKI Jakarta'], origin: ['Manual'] })).map((r) => r.id)).toEqual(['P-0012'])
    expect(rows.filter((r) => partnerMatches(r, 'nothing-matches', '', '')).length).toBe(0)
  })
})

describe('create partner draft + existing-user lookup (K-03 / K-04)', () => {
  it('starts in Indonesia with one blank user', () => {
    const d = blankCreateDraft()
    expect(d.country).toBe('Indonesia')
    expect(d.users).toHaveLength(1)
  })

  it('suggests directory users and flags members of another partner', () => {
    const d = blankCreateDraft()
    d.users[0]!.email = 'solusi'
    const s = userSuggestions(d, d.users[0]!.key)
    expect(s.length).toBeGreaterThan(0)
    expect(s.every((x) => x.partner === 'Solusi Prima')).toBe(true)
    expect(pickExistingUser(d.users[0]!, s[0]!)).toBe(false)
    expect(d.users[0]!.existing).toBe(false)
  })

  it('picks a free user, locks the row, and leaves the email out of other rows', () => {
    const d = blankCreateDraft()
    d.users[0]!.email = 'budi'
    const s = userSuggestions(d, d.users[0]!.key)
    expect(pickExistingUser(d.users[0]!, s.find((x) => x.email === 'budi.santoso@gmail.com')!)).toBe(true)
    expect(d.users[0]).toMatchObject({ existing: true, name: 'Budi Santoso', profession: 'Consultant' })
    expect(userSuggestions(d, d.users[0]!.key)).toEqual([]) // existing rows don't search
    d.users.push({ ...blankCreateDraft().users[0]!, email: 'gmail' })
    expect(userSuggestions(d, d.users[1]!.key).map((x) => x.email)).not.toContain('budi.santoso@gmail.com')
    clearUser(d.users[0]!)
    expect(d.users[0]).toMatchObject({ existing: false, email: '', name: '' })
  })

  it('creates through the store without the UI row keys', () => {
    const d = blankCreateDraft()
    Object.assign(d, { legal: 'PT Uji', ae: 'kevin.halim@mekari.com', prov: 'Bali', city: 'Denpasar' })
    Object.assign(d.users[0]!, { email: 'rani@uji.co.id', name: 'Rani', job: 'Lead', profession: 'Consultant' })
    const sd = toStoreDraft(d)
    expect('key' in sd.users[0]!).toBe(false)
    const res = createPartner(sd)
    expect(res.ok).toBe(true)
    const p = getPartner(res.id!)!
    expect(p.status).toBe('Unregistered')
    expect(p.users[0]!.role).toBe('admin')
    expect(partnerActivityEntries(p)[0]!.activity).toBe('Created')
    expect(provenanceText(p, (iso) => iso)).toBe('Created manually on 2026-11-06')
  })
})

describe('profile draft (K-09 Profile tab)', () => {
  it('tracks dirty state and describes the changes', () => {
    const p = getPartner('P-0004')!
    const d = profileDraftOf(p)
    expect(profileDirty(p, d)).toBe(false)
    d.industry = 'Software'
    d.impl = false
    expect(profileDirty(p, d)).toBe(true)
    expect(profileChanges(p, d).map((c) => c.label)).toEqual(['Partner industry', 'Can implement Mekari products'])
    expect(updatePartnerProfile(p.id, d).ok).toBe(true)
    expect(profileDirty(getPartner('P-0004')!, d)).toBe(false)
  })

  it('status toggles only Active ↔ Inactive', () => {
    expect(setPartnerStatus('P-0004', 'Inactive').ok).toBe(true)
    expect(setPartnerStatus('P-0004', 'Active').ok).toBe(true)
    expect(setPartnerStatus('P-0012', 'Active').ok).toBe(false)
  })
})

describe('partner activity log', () => {
  it('is newest first and built from creation + decided change requests', () => {
    const e = partnerActivityEntries(getPartner('P-0004')!)
    expect(e.map((x) => x.activity)).toEqual(['Data change approved', 'Data change rejected', 'Created'])
    expect(e[0]!.details[0]).toEqual({ label: 'Phone', value: '+62 31 5000 1200 → +62 31 5000 7788' })
    expect(e[2]!.details[0]!.value).toBe('Registration REG-0112')
  })

  it('records an approval made in the backoffice', () => {
    approveCr('CR-0021')
    const e = partnerActivityEntries(getPartner('P-0007')!)
    expect(e[0]!.activity).toBe('Data change approved')
    expect(e[0]!.details.map((d) => d.label)).toEqual(['Brand name', 'Website URL', 'Target industries'])
  })
})

describe('Partner Data Change (N-01)', () => {
  it('builds list rows and filters by tab, partner and search', () => {
    const rows = bo.crs.map(crRow)
    const r21 = rows.find((r) => r.id === 'CR-0021')!
    expect(r21).toMatchObject({ partner: 'Garuda Integrasi', fields: 3, status: 'In review' })
    expect(rows.filter((r) => crMatches(r, '', 'In review', '')).map((r) => r.id)).toEqual(['CR-0021'])
    expect(rows.filter((r) => crMatches(r, '', 'all', 'P-0004')).length).toBe(2)
    expect(rows.filter((r) => crMatches(r, 'bank account', 'all', '')).map((r) => r.id)).toEqual(['CR-0017'])
  })

  it('approve applies the values and clears the open request', () => {
    expect(openCrOf('P-0007')?.id).toBe('CR-0021')
    expect(approveCr('CR-0021').ok).toBe(true)
    expect(getPartner('P-0007')!.brand).toBe('Garuda Integrasi Group')
    expect(openCrOf('P-0007')).toBeUndefined()
    expect(approveCr('CR-0021').ok).toBe(false) // final
  })

  it('reject needs a reason and leaves the partner unchanged', () => {
    expect(rejectCr('CR-0021', '  ').ok).toBe(false)
    expect(rejectCr('CR-0021', 'Domain not verified').ok).toBe(true)
    expect(getCr('CR-0021')!.status).toBe('Rejected')
    expect(getPartner('P-0007')!.brand).toBe('Garuda Integrasi')
  })
})
