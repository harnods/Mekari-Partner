/**
 * Partner Management + Partner Data Change — page-level view logic (pure, testable).
 *
 * The business rules live in app/data/backoffice.ts; this file only shapes store
 * data for the pages under app/pages/backoffice/partners/** and
 * app/pages/backoffice/partner-data-change.vue:
 *   • list rows + search/filter matching (K-01, N-01)
 *   • the "Create partner" draft + existing-user lookup (K-03 / K-04)
 *   • the editable profile draft (K-09 Profile tab)
 *   • the partner activity log, built from the partner's own data
 *     (rule/activity-log-entries — there is no audit store in the prototype)
 */
import type { ActivityEntry } from '~/components/patterns/ActivityLogModal.vue'
import {
  bo, tr, showVal, partnerName, aeName, trainerName, allUsersDirectory, getPartner, BO_CR_FIELDS,
  type BoPartner, type BoChangeRequest, type BoNewUserDraft, type BoPartnerCreateDraft,
  type BoPartnerProfilePatch, type BoPartnerStatus, type CrStatus, type CrField,
} from '~/data/backoffice'

// ═════════════════════════════════════════════════════════════════════════════
// K-01 Partner list
// ═════════════════════════════════════════════════════════════════════════════
export const PARTNER_STATUSES: BoPartnerStatus[] = ['Unregistered', 'Registered', 'Active', 'Inactive']

export interface PartnerRow {
  id: string
  name: string
  brand: string
  legal: string
  code: string
  entity: string
  country: string
  prov: string
  city: string
  industry: string
  product: string
  status: BoPartnerStatus
  ae: string
  aeName: string
  origin: string
  created: string
  users: number
  [key: string]: unknown
}

export function partnerRow(p: BoPartner): PartnerRow {
  return {
    id: p.id, name: partnerName(p), brand: p.brand, legal: p.legal, code: p.code, entity: p.entity,
    country: p.country, prov: p.prov, city: p.city, industry: p.industry, product: p.product,
    status: p.status, ae: p.ae, aeName: p.ae ? aeName(p.ae) : '', origin: p.origin.startsWith('Registration') ? 'Registration' : 'Manual',
    created: p.created, users: p.users.length,
  }
}

/** Drawer ("All filters") selections: scope key → selected values. */
export type PartnerDrawerFilters = Record<string, string[]>

export function partnerMatches(r: PartnerRow, search: string, status: string, ae: string, drawer: PartnerDrawerFilters = {}): boolean {
  const s = search.trim().toLowerCase()
  const hay = [r.name, r.legal, r.code, r.id, r.city, r.prov, r.aeName].join(' ').toLowerCase()
  if (s && !hay.includes(s)) return false
  if (status && r.status !== status) return false
  if (ae && r.ae !== ae) return false
  const sel = (k: string) => drawer[k] ?? []
  const pick = (k: string, v: string) => !sel(k).length || sel(k).includes(v)
  return pick('entity', r.entity) && pick('prov', r.prov) && pick('industry', r.industry) && pick('product', r.product) && pick('origin', r.origin)
}

// ═════════════════════════════════════════════════════════════════════════════
// K-03 / K-04 Create partner
// ═════════════════════════════════════════════════════════════════════════════
let uid = 0
export interface NewUserRow extends BoNewUserDraft { key: string }
export interface CreateDraft extends Omit<BoPartnerCreateDraft, 'users'> { users: NewUserRow[] }

export function blankUser(): NewUserRow {
  uid += 1
  return { key: `u${Date.now().toString(36)}${uid}`, email: '', name: '', job: '', phone: '', profession: '', existing: false }
}
export function blankCreateDraft(): CreateDraft {
  return { legal: '', ae: '', country: 'Indonesia', prov: '', city: '', web: '', li: '', users: [blankUser()] }
}

export interface UserSuggestion { email: string; name: string; job: string; phone: string; profession: string; partner: string | null }

/**
 * K-04 Existing users — directory matches for one user row while typing its email
 * (≥2 chars). Emails already used by OTHER rows are left out; users who belong to a
 * partner are listed but flagged (`partner`) and cannot be picked.
 */
export function userSuggestions(draft: CreateDraft, rowKey: string, limit = 5): UserSuggestion[] {
  const row = draft.users.find((u) => u.key === rowKey)
  if (!row || row.existing) return []
  const q = row.email.trim().toLowerCase()
  if (q.length < 2) return []
  const taken = draft.users.filter((u) => u.key !== rowKey).map((u) => u.email.trim().toLowerCase())
  return Object.values(allUsersDirectory())
    .filter((x) => !taken.includes(x.email.toLowerCase()) && (x.email.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)))
    .slice(0, limit)
    .map((x) => ({ email: x.email, name: x.name, job: x.job, phone: x.phone, profession: x.profession, partner: x.partner }))
}

/** Fill a row from a picked directory user (fields lock; "Change user" clears). */
export function pickExistingUser(row: NewUserRow, s: UserSuggestion): boolean {
  if (s.partner) return false
  Object.assign(row, { email: s.email, name: s.name, job: s.job, phone: s.phone || '', profession: s.profession, existing: true })
  return true
}
export function clearUser(row: NewUserRow): void {
  Object.assign(row, { email: '', name: '', job: '', phone: '', profession: '', existing: false })
}

/** Strip the UI-only row keys before handing the draft to the store. */
export function toStoreDraft(d: CreateDraft): BoPartnerCreateDraft {
  return { ...d, users: d.users.map(({ key: _k, ...u }) => u) }
}

// ═════════════════════════════════════════════════════════════════════════════
// K-09 Profile tab (editable fields)
// ═════════════════════════════════════════════════════════════════════════════
export function profileDraftOf(p: BoPartner): BoPartnerProfilePatch {
  return { ae: p.ae, tech: p.tech, tax: p.tax, industry: p.industry, web: p.web, li: p.li, impl: !!p.impl }
}
export function profileDirty(p: BoPartner, d: BoPartnerProfilePatch): boolean {
  const base = profileDraftOf(p)
  return (Object.keys(base) as (keyof BoPartnerProfilePatch)[]).some((k) => base[k] !== d[k])
}

/** Labels of the fields that differ — for the activity log / save toast context. */
const PROFILE_LABEL: Record<keyof BoPartnerProfilePatch, string> = {
  ae: 'Account Owner', tech: 'Technical PIC', tax: 'Tax Status', industry: 'Partner industry', web: 'Website URL', li: 'LinkedIn URL', impl: 'Can implement Mekari products',
}
export function profileChanges(p: BoPartner, d: BoPartnerProfilePatch): { label: string; value: string }[] {
  const base = profileDraftOf(p)
  const fmt = (k: keyof BoPartnerProfilePatch, v: unknown) =>
    k === 'ae' ? (v ? aeName(v as string) : '—') : k === 'tech' ? (v ? trainerName(v as string) : '—') : showVal(v)
  return (Object.keys(base) as (keyof BoPartnerProfilePatch)[])
    .filter((k) => base[k] !== d[k])
    .map((k) => ({ label: tr(PROFILE_LABEL[k]), value: `${fmt(k, base[k])} → ${fmt(k, d[k])}` }))
}

// ═════════════════════════════════════════════════════════════════════════════
// Partner activity log (rule/activity-log-entries)
// ═════════════════════════════════════════════════════════════════════════════
const CR_LABEL = Object.fromEntries(BO_CR_FIELDS) as Record<CrField, string>

/** Entries newest-first, built from the partner's own data: creation (manual or the
 *  completed registration) and every decided partner data change request. */
export function partnerActivityEntries(p: BoPartner): ActivityEntry[] {
  const out: ActivityEntry[] = []
  const fromReg = p.origin.startsWith('Registration')
  const regId = fromReg ? p.origin.replace('Registration', '').trim() : ''
  const reg = regId ? bo.tickets.find((t) => t.id === regId) : undefined
  const done = reg?.log.find((l) => /→ Completed/.test(l.text))
  if (fromReg) {
    const admin = reg ? `${reg.submitter} (${reg.email})` : (p.users.find((u) => u.role === 'admin')?.name ?? '—')
    out.push({
      date: done?.at || `${p.created}T09:00`, user: done?.by || 'System', activity: tr('Created'),
      details: [
        { label: tr('Source'), value: tr('Registration {id}', { id: regId }) },
        { label: tr('Status'), value: tr('Registered') },
        { label: tr('Partner code'), value: p.code || '—' },
        { label: tr('Admin'), value: admin },
      ],
    })
  } else {
    out.push({
      date: `${p.created}T09:00`, user: p.ae ? aeName(p.ae) : 'System', activity: tr('Created'),
      details: [
        { label: tr('Source'), value: tr('Manual') },
        { label: tr('Status'), value: tr('Unregistered') },
        { label: tr('Legal name'), value: p.legal },
        { label: tr('Account Owner'), value: p.ae ? aeName(p.ae) : '—' },
        ...p.users.map((u) => ({ label: tr('User'), value: `${u.name} (${u.email})` })),
      ],
    })
  }
  bo.crs.filter((c) => c.pid === p.id && c.status !== 'In review' && c.decidedOn).forEach((c) => {
    const fields = Object.keys(c.changes) as CrField[]
    const val = (src: BoChangeRequest['before'], k: CrField) => showVal(src ? src[k] : '')
    const details = c.status === 'Approved'
      ? fields.map((k) => ({ label: tr(CR_LABEL[k]), value: `${val(c.before, k)} → ${showVal(c.changes[k])}` }))
      : [{ label: tr('Change request'), value: c.id }, ...(c.reason ? [{ label: tr('Reason'), value: c.reason }] : [])]
    out.push({
      date: `${c.decidedOn}T10:00`, user: c.decidedBy, details,
      activity: c.status === 'Approved' ? tr('Data change approved') : c.status === 'Rejected' ? tr('Data change rejected') : tr('Data change cancelled'),
    })
  })
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** "Created manually on 12 Oct 2026" / "Created from Registration REG-0112" provenance link. */
export function provenanceText(p: BoPartner, longDate: (iso: string) => string): string {
  return p.origin.startsWith('Registration')
    ? tr('Created from {origin} on {date}', { origin: p.origin.replace('Registration', tr('Registration')), date: longDate(p.created) })
    : tr('Created manually on {date}', { date: longDate(p.created) })
}

// ═════════════════════════════════════════════════════════════════════════════
// N-01 Partner Data Change list
// ═════════════════════════════════════════════════════════════════════════════
export interface CrRow {
  id: string
  pid: string
  partner: string
  legal: string
  fields: number
  fieldNames: string
  by: string
  email: string
  date: string
  status: CrStatus
  decided: string
  [key: string]: unknown
}
export function crRow(c: BoChangeRequest): CrRow {
  const p = getPartner(c.pid)
  const keys = Object.keys(c.changes) as CrField[]
  return {
    id: c.id, pid: c.pid, partner: p ? partnerName(p) : c.pid, legal: p ? p.legal : '', fields: keys.length,
    fieldNames: keys.map((k) => tr(CR_LABEL[k])).join(', '), by: c.by, email: c.email, date: c.date, status: c.status,
    decided: c.decidedOn || '',
  }
}
export function crMatches(r: CrRow, search: string, tab: string, partner: string): boolean {
  const s = search.trim().toLowerCase()
  if (s && ![r.id, r.partner, r.legal, r.by, r.email, r.fieldNames].join(' ').toLowerCase().includes(s)) return false
  if (tab && tab !== 'all' && r.status !== tab) return false
  if (partner && r.pid !== partner) return false
  return true
}
/** The open (In review) request of a partner, if any — at most one per partner. */
export const openCrOf = (pid: string) => bo.crs.find((c) => c.pid === pid && c.status === 'In review')
