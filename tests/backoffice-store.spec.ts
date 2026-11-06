/**
 * Backoffice store (app/data/backoffice.ts) — core business rules ported from the
 * Mekari Partner Internal Portal prototype: ticket stage moves, complete() →
 * partner, agreement status, deprecate → re-agreement batch.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  bo, resetBackoffice, setBoToday, getTicket, getPartner, getMa, checkMove, moveTicket, rejectTicket,
  completeTicket, agStatus, blockers, deprecateMa, impact, boLogin, saveAgreement, duplicateDraft,
  agreementDraftErrors, blankAgDraft, setTicketCheck, setTicketTax, dashboardCounts, approveCr,
  createPartner, setMaStatus, maAllowedStatuses, agreementRowsView, docOptionsFor,
} from '~/data/backoffice'

beforeEach(() => {
  resetBackoffice()
  setBoToday('2026-11-06')
})

describe('ticket stage moves', () => {
  it('needs an Account Owner before Data Validation', () => {
    const t = getTicket('REG-0152')!
    expect(checkMove(t, 'Data Validation').ok).toBe(false)
    t.ae = 'dimas.ardiansyah@mekari.com'
    const r = moveTicket('REG-0152', 'Data Validation')
    expect(r.ok).toBe(true)
    expect(t.stage).toBe('Data Validation')
    expect(t.log.at(-1)!.text).toBe('Registration Request → Data Validation')
  })

  it('moves one stage at a time', () => {
    const t = getTicket('REG-0152')!
    t.ae = 'x@mekari.com'
    expect(checkMove(t, 'Agreement Drafting').ok).toBe(false)
  })

  it('an Invalid check blocks everything but Reject', () => {
    const t = getTicket('REG-0147')!
    expect(checkMove(t, 'Agreement Drafting').ok).toBe(false)
    expect(checkMove(t, 'Registration Request').ok).toBe(false)
    expect(checkMove(t, 'Rejected').ok).toBe(true)
    expect(moveTicket('REG-0147', 'Rejected').needs).toBe('reject')
    expect(rejectTicket('REG-0147', '').ok).toBe(false)
    expect(rejectTicket('REG-0147', 'Bank holder mismatch').ok).toBe(true)
    expect(t.stage).toBe('Rejected')
    expect(t.rejectedOn).toBe('2026-11-06')
    expect(checkMove(t, 'Data Validation').ok).toBe(false) // locked
  })

  it('Agreement Drafting needs every section marked valid', () => {
    const t = getTicket('REG-0149')!
    expect(checkMove(t, 'Agreement Drafting').ok).toBe(false)
    setTicketCheck('REG-0149', 'market', 'Valid')
    expect(checkMove(t, 'Agreement Drafting').ok).toBe(false) // legal still unchecked
    setTicketCheck('REG-0149', 'legal', 'Valid')
    expect(moveTicket('REG-0149', 'Agreement Drafting').ok).toBe(true)
  })

  it('Completed is blocked until every document is COMPLETED', () => {
    const t = getTicket('REG-0141')!
    expect(blockers(t).length).toBeGreaterThan(0) // MS-58307 not signed
    expect(checkMove(t, 'Completed').ok).toBe(false)
    expect(completeTicket('REG-0141').ok).toBe(false)
  })
})

describe('completeTicket()', () => {
  it('creates a new Registered partner', () => {
    const t = getTicket('REG-0141')!
    t.agreements = t.agreements.map((r) => (r.id === 'ag-c1' ? { ...r, doc: 'MS-58312' } : r.id === 'ag-c3' ? { ...r, file: 'dpa-cakra-signed.pdf' } : r)) // signed docs
    const before = bo.partners.length
    const r = completeTicket('REG-0141')
    expect(r.ok).toBe(true)
    expect(bo.partners.length).toBe(before + 1)
    const p = getPartner(r.partnerId)!
    expect(p.id).toBe('P-0016')
    expect(p.status).toBe('Registered')
    expect(p.users[0]).toMatchObject({ email: 'sari@cakrasolusi.co.id', role: 'admin' })
    expect(p.agreements).toHaveLength(4)
    expect(t.stage).toBe('Completed')
    expect(t.partnerId).toBe('P-0016')
  })

  it('switches a linked Unregistered partner to Registered', () => {
    const t = getTicket('REG-0140')!
    t.agreements = [{ id: 'ag-n1', section: 'pa', method: 'esign', ma: 'ma1', doc: 'MS-58312', name: '', start: '2026-10-20', end: '2027-10-19', remarks: '', file: '', replaces: null, expired: false }]
    const before = bo.partners.length
    const r = completeTicket('REG-0140')
    expect(r.ok).toBe(true)
    expect(bo.partners.length).toBe(before)
    const p = getPartner('P-0012')!
    expect(p.status).toBe('Registered')
    expect(p.code).toBe('MPNUSA')
    expect(p.users.find((u) => u.email === 'maya@nusacloud.co.id')!.role).toBe('admin')
    expect(p.agreements.map((a) => a.id)).toContain('ag-n1')
  })
})

describe('agStatus()', () => {
  it('derives PENDING / COMPLETED / EXPIRED', () => {
    const s = getPartner('P-0004')!
    expect(agStatus(s.agreements.find((r) => r.id === 'ag-s1')!)).toBe('COMPLETED') // signed e-sign
    expect(agStatus(s.agreements.find((r) => r.id === 'ag-s2')!)).toBe('EXPIRED') // ended Feb 2026
    expect(agStatus(getTicket('REG-0141')!.agreements[0]!)).toBe('PENDING') // unsigned
    expect(agStatus({ ...s.agreements[1]!, file: '' })).toBe('PENDING') // manual, no file
  })

  it('partner rows: PENDING → edit/delete, else edit remarks; + duplicate', () => {
    const rows = agreementRowsView({ kind: 'partner', id: 'P-0004' }, 'pa')
    expect(rows[0]!.actions).toEqual(['editRemarks', 'duplicate'])
    const tRows = agreementRowsView({ kind: 'ticket', id: 'REG-0138' }, 'pa')
    expect(tRows[0]!.actions).toEqual([]) // completed ticket = read-only
  })

  it('doc picker excludes documents linked to another row', () => {
    const ids = docOptionsFor(null).map((o) => o.value)
    expect(ids).not.toContain('MS-58344')
    expect(ids).toContain('MS-58390')
  })

  it('validates overlap on partner Partnership Agreements; Duplicate replaces early', () => {
    const owner = { kind: 'partner' as const, id: 'P-0004' }
    const d = { ...blankAgDraft(owner, 'pa'), method: 'manual' as const, ma: 'ma1', name: 'X', start: '2026-06-01', end: '2027-05-31', file: 'x.pdf' }
    expect(agreementDraftErrors(d).live.start).toBe(true)
    const src = getPartner('P-0004')!.agreements.find((r) => r.id === 'ag-s1')!
    const dup = { ...duplicateDraft(owner, src), doc: 'MS-58390', start: '2026-12-01', end: '2027-11-30' }
    expect(dup.start).toBe('2026-12-01')
    const r = saveAgreement(dup)
    expect(r.ok).toBe(true)
    const old = getPartner('P-0004')!.agreements.find((x) => x.id === 'ag-s1')!
    expect(old.expired).toBe(true)
    expect(old.end).toBe('2026-12-01')
  })
})

describe('master agreement deprecation', () => {
  it('runs a re-agreement batch on the replacement', () => {
    const imp = impact('ma1')
    // P-0004 ag-s1 (completed) + P-0007 ag-g1 + P-0009 ag-m1 — all non-expired
    expect(imp.docs).toHaveLength(3)
    expect(imp.partners).toBe(3)
    expect(imp.tickets).toBe(1) // REG-0141
    expect(maAllowedStatuses(getMa('ma1')!)).toEqual(['DEPRECATED'])
    expect(deprecateMa('ma1', 'ma5').ok).toBe(false) // wrong type
    const r = deprecateMa('ma1', 'ma2')
    expect(r.ok).toBe(true)
    expect(r.created).toBe(3)
    expect(getMa('ma1')!.status).toBe('DEPRECATED')
    const added = getPartner('P-0009')!.agreements.find((a) => a.replaces === 'ag-m1')!
    expect(added).toMatchObject({ ma: 'ma2', method: 'manual', start: '2027-01-20', end: '2028-01-19' })
    expect(agStatus(added)).toBe('PENDING')
    expect(blockers(getTicket('REG-0141')!)[0]).toMatch(/not ACTIVE/)
    expect(setMaStatus('ma1', 'ACTIVE').ok).toBe(false) // final
  })
})

describe('misc', () => {
  it('login accepts only @mekari.com', () => {
    expect(boLogin('alexandria.putri@gmail.com').ok).toBe(false)
    expect(bo.session).toBeNull()
    expect(boLogin().ok).toBe(true)
    expect(bo.session?.email).toBe('rina.wijaya@mekari.com')
  })

  it('approving a change request applies the values', () => {
    expect(approveCr('CR-0021').ok).toBe(true)
    expect(getPartner('P-0007')!.brand).toBe('Garuda Integrasi Group')
  })

  it('creates a partner manually as Unregistered', () => {
    const r = createPartner({ legal: 'PT Baru', ae: 'kevin.halim@mekari.com', country: 'Indonesia', prov: 'Bali', city: 'Denpasar', web: '', li: '', users: [{ email: 'a@baru.id', name: 'A', job: 'CEO', phone: '', profession: 'Consultant', existing: false }] })
    expect(r.ok).toBe(true)
    expect(getPartner(r.id)!.status).toBe('Unregistered')
  })

  it('dashboard counts are live', () => {
    const c = dashboardCounts()
    expect(c.ticketsByStage['Data Validation']).toBe(3)
    expect(c.needsOwner).toBe(2)
    expect(c.invalidChecks).toBe(1)
    expect(c.crInReview).toBe(1)
    expect(c.partners).toBe(5)
  })
})
