/**
 * Backoffice — Registrations page logic (app/components/backoffice/registrations/regLogic.ts):
 * filter bar, board ordering, live drop feedback, drawer stage navigation + footer hint,
 * and the store wiring the page relies on (drop → moveTicket → needs → modal).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { bo, resetBackoffice, setBoToday, getTicket, moveTicket, setTicketCheck, setTicketTax, rejectTicket, checkMove, BO_STAGES } from '~/data/backoffice'
import {
  AE_NONE, emptyRegFilters, filterTickets, hasActiveFilters, distinctOf, sortTickets, dropFeedback,
  drawerFilterCount, attentionOf, distinctTags, TAX_NONE,
  stageNav, footerHint, ticketFacts, sectionRows, aeCaption, aeOptions, provenance, noteBadgeType, isLocked,
} from '~/components/backoffice/registrations/regLogic'

beforeEach(() => {
  resetBackoffice()
  setBoToday('2026-11-06')
})

describe('filter bar', () => {
  it('no filters → every ticket', () => {
    const f = emptyRegFilters()
    expect(hasActiveFilters(f)).toBe(false)
    expect(filterTickets(bo.tickets, f)).toHaveLength(bo.tickets.length)
  })
  it('search matches number, brand, code, submitter and email (case-insensitive)', () => {
    const f = { ...emptyRegFilters(), q: 'mpsinergi' }
    expect(hasActiveFilters(f)).toBe(true)
    expect(filterTickets(bo.tickets, f).map((t) => t.id)).toEqual(['REG-0152'])
    expect(filterTickets(bo.tickets, { ...f, q: 'reg-0147' }).map((t) => t.id)).toEqual(['REG-0147'])
  })
  it('"No Account Owner" sentinel finds tickets without an owner', () => {
    const res = filterTickets(bo.tickets, { ...emptyRegFilters(), ae: AE_NONE })
    expect(res.length).toBeGreaterThan(0)
    expect(res.every((t) => !t.ae)).toBe(true)
  })
  it('product + source narrow the list; options are distinct and alphabetical', () => {
    const products = distinctOf(bo.tickets, 'product')
    expect(products).toEqual([...new Set(products)].sort((a, b) => a.localeCompare(b)))
    const res = filterTickets(bo.tickets, { ...emptyRegFilters(), product: 'Klikpajak' })
    expect(res.every((t) => t.product === 'Klikpajak')).toBe(true)
    expect(filterTickets(bo.tickets, { ...emptyRegFilters(), source: 'no-such-source' })).toHaveLength(0)
  })
})

describe('board', () => {
  it('columns are newest submission first', () => {
    const rr = sortTickets(bo.tickets.filter((t) => t.stage === 'Registration Request'))
    for (let i = 1; i < rr.length; i++) expect(rr[i - 1]!.date >= rr[i]!.date).toBe(true)
  })
  it('every stage exists as a column key', () => {
    expect(BO_STAGES).toEqual(['Registration Request', 'Data Validation', 'Agreement Drafting', 'Completed', 'Rejected'])
  })
  it('live drop feedback: own column neutral, valid target ok, blocked target explains why', () => {
    const t = getTicket('REG-0152')!
    expect(dropFeedback(t, 'Registration Request').state).toBe('same')
    const blocked = dropFeedback(t, 'Data Validation')
    expect(blocked.state).toBe('blocked')
    expect(blocked.msg).toMatch(/Account Owner/)
    expect(dropFeedback(t, 'Rejected').state).toBe('ok')
    expect(dropFeedback(t, 'Agreement Drafting').msg).toMatch(/forward one stage at a time/)
  })
  it('locked tickets cannot be dropped anywhere', () => {
    const done = bo.tickets.find((t) => t.stage === 'Completed')!
    expect(isLocked(done)).toBe(true)
    expect(dropFeedback(done, 'Agreement Drafting').state).toBe('blocked')
  })
  it('drop on Rejected / Completed hands off to the modal instead of moving', () => {
    expect(moveTicket('REG-0152', 'Rejected').needs).toBe('reject')
    expect(getTicket('REG-0152')!.stage).toBe('Registration Request')
  })
  it('card note tone → badge type', () => {
    expect(noteBadgeType('warning')).toBe('warning')
    expect(noteBadgeType('danger')).toBe('critical')
    expect(noteBadgeType('success')).toBe('completed')
    expect(noteBadgeType('default')).toBe('announcement')
  })
})

describe('ticket drawer', () => {
  it('stage nav: first stage has no Back; locked tickets have no buttons', () => {
    expect(stageNav(getTicket('REG-0152')!)).toEqual({ prev: null, next: 'Data Validation', back: [], invalidLock: false })
    const done = bo.tickets.find((t) => t.stage === 'Completed')!
    expect(stageNav(done)).toEqual({ prev: null, next: null, back: [], invalidLock: false })
  })
  it('an Invalid check leaves Reject only (no Back / Move) and says so', () => {
    const t = getTicket('REG-0147')!
    const nav = stageNav(t)
    expect(nav.invalidLock).toBe(true)
    expect(nav.prev).toBeNull()
    expect(nav.next).toBeNull()
    expect(footerHint(t)).toMatch(/Reject is the only action/)
  })
  it('Data Validation hint clears once every section is marked valid', () => {
    const t = getTicket('REG-0149')!
    expect(footerHint(t)).toMatch(/Mark every section as valid/)
    for (const k of ['company', 'market', 'legal'] as const) setTicketCheck(t.id, k, 'Valid')
    expect(footerHint(t)).toBe('')
    expect(moveTicket(t.id, 'Agreement Drafting').ok).toBe(true)
    expect(footerHint(getTicket(t.id)!)).toMatch(/^To complete:/)
  })
  it('facts show the partner link only while not Completed', () => {
    expect(ticketFacts(getTicket('REG-0140')!).some((f) => f.label === 'Partner link')).toBe(true)
    expect(ticketFacts(getTicket('REG-0152')!).some((f) => f.label === 'Partner link')).toBe(false)
  })
  it('sections follow the partner registration form: labels switch on NPWP (Company) vs KTP (Individual)', () => {
    const labels = (id: string, k: 'legal' | 'company' | 'market') => sectionRows(getTicket(id)!, k).map((r) => r.label)
    expect(labels('REG-0152', 'legal')).toEqual(['Register as', 'Legal company name', 'Company NPWP', 'Tax status', 'Company NPWP file', 'Address as on NPWP'])
    expect(labels('REG-0147', 'legal').slice(1)).toEqual(['Full name as on KTP', 'NIK', 'KTP file', 'Address as on KTP'])
    expect(labels('REG-0152', 'company')).toEqual(['Business name', 'Partner code', 'Operating location', 'Website URL', 'LinkedIn URL', 'Company industry'])
    expect(labels('REG-0147', 'company').at(-1)).toBe('Your industry')
    expect(labels('REG-0152', 'market')).toEqual(['Product', 'Your specialization', 'Industries you want to sell to', 'Target company size', 'Average project value'])
    expect(sectionRows(getTicket('REG-0152')!, 'legal').find((r) => r.label === 'Tax status')!.value).toBe('PKP')
    expect(sectionRows(getTicket('REG-0147')!, 'legal').some((r) => r.label === 'Tax status')).toBe(false) // individuals have none
  })
  it('Account Owner caption follows the pre-assignment source; options carry name + email', () => {
    expect(aeCaption(getTicket('REG-0149')!)).toMatch(/ae URL parameter/)
    expect(aeCaption(getTicket('REG-0140')!)).toMatch(/registration form link/)
    expect(aeOptions().every((o) => o.label.includes(o.value))).toBe(true)
  })
  it('provenance: one log entry = Created by, more = Last updated by', () => {
    expect(provenance(getTicket('REG-0152')!).text).toMatch(/^Created by System/)
    expect(provenance(getTicket('REG-0140')!).text).toMatch(/^Last updated by/)
  })
  it('reject requires a reason and locks the ticket', () => {
    expect(rejectTicket('REG-0150', '  ').ok).toBe(false)
    expect(rejectTicket('REG-0150', 'NPWP mismatch').ok).toBe(true)
    expect(isLocked(getTicket('REG-0150')!)).toBe(true)
  })
})

describe('registrations — All filters drawer', () => {
  it('submitted date range is inclusive on both ends', () => {
    const f = { ...emptyRegFilters(), date: [new Date(2026, 9, 20), new Date(2026, 9, 27)] }
    expect(filterTickets(bo.tickets, f).map((t) => t.id).sort()).toEqual(['REG-0145', 'REG-0147', 'REG-0149', 'REG-0150'])
    expect(drawerFilterCount(f)).toBe(1)
    expect(hasActiveFilters(f)).toBe(true)
  })
  it('entity, tax and attention filters', () => {
    expect(filterTickets(bo.tickets, { ...emptyRegFilters(), entity: 'Individual' }).map((t) => t.id).sort()).toEqual(['REG-0147', 'REG-0150'])
    expect(filterTickets(bo.tickets, { ...emptyRegFilters(), tax: 'PKP' }).every((t) => t.tax === 'PKP')).toBe(true)
    expect(filterTickets(bo.tickets, { ...emptyRegFilters(), tax: TAX_NONE }).every((t) => !t.tax)).toBe(true)
    expect(attentionOf(bo.tickets.find((t) => t.id === 'REG-0147')!)).toBe('invalid-checks')
    expect(filterTickets(bo.tickets, { ...emptyRegFilters(), attention: 'checks-pending' }).map((t) => t.id)).toEqual(['REG-0149'])
  })
  it('tag fields: is any of / is none of', () => {
    const base = emptyRegFilters()
    const anyOf = { ...base, tags: { ...base.tags, specs: { cmp: 'isAnyOf' as const, values: ['Tax'] } } }
    expect(filterTickets(bo.tickets, anyOf).map((t) => t.id)).toEqual(['REG-0150'])
    const noneOf = { ...base, tags: { ...base.tags, specs: { cmp: 'isNoneOf' as const, values: ['Tax'] } } }
    expect(filterTickets(bo.tickets, noneOf).some((t) => t.id === 'REG-0150')).toBe(false)
    expect(drawerFilterCount(anyOf)).toBe(1)
    expect(distinctTags(bo.tickets, 'deal')[0]).toBe('0–50 mio')
  })
})

describe('registrations — Move to (any passed stage)', () => {
  it('Agreement Drafting can go back to Data Validation or Registration Request, forward only to Completed', () => {
    const t = getTicket('REG-0141')!
    expect(stageNav(t)).toMatchObject({ next: 'Completed', back: ['Data Validation', 'Registration Request'] })
    expect(checkMove(t, 'Registration Request').ok).toBe(true)
    expect(moveTicket(t.id, 'Registration Request').ok).toBe(true)
    expect(getTicket(t.id)!.stage).toBe('Registration Request')
  })
})
