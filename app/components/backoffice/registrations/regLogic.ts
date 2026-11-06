/**
 * Registrations (J-02 / J-04) — page-level view logic, kept out of the .vue files
 * so it can be unit-tested (tests/backoffice-registrations.spec.ts).
 *
 * Every business rule (can a ticket move, what moving does, blockers, card note)
 * lives in app/data/backoffice.ts — this module only shapes store data for the
 * board, the filter bar and the ticket drawer.
 */
import {
  bo, tr, aeName, getPartner, allValid, anyInvalid, blockers, checkMove,
  BO_SEQ, BO_FINAL, BO_CHECKS,
  type BoTicket, type TicketStage, type SectionKey,
} from '~/data/backoffice'
import { formatDateLong, formatDateTimeLong } from '~/utils/date'

// ── Filter bar + All filters drawer ─────────────────────────────────────────
export type TagCmp = 'isAnyOf' | 'isNoneOf'
export interface RegTagFilter { cmp: TagCmp; values: string[] }
/** Multi-value ticket fields the drawer filters by (Is any of / Is none of). */
export const REG_TAG_FIELDS = ['prov', 'industry', 'specs', 'targets', 'segments', 'deal'] as const
export type RegTagField = (typeof REG_TAG_FIELDS)[number]
export const REG_TAG_LABEL: Record<RegTagField, string> = {
  prov: 'Province', industry: 'Industry', specs: 'Specialization', targets: 'Target industry', segments: 'Target company size', deal: 'Average project value',
}
/** "Needs attention" — the same blockers the card badge shows. */
export type RegAttention = 'ae-missing' | 'invalid-checks' | 'checks-pending' | 'docs-incomplete' | 'ready'
export const REG_ATTENTION_LABEL: Record<RegAttention, string> = {
  'ae-missing': 'Account owner missing', 'invalid-checks': 'Invalid checks', 'checks-pending': 'Checks pending',
  'docs-incomplete': 'Documents incomplete', ready: 'Ready to complete',
}
export interface RegDrawerFilters {
  /** Submitted date [start, end] (AdvancedDateRangePicker) — null = any */
  date: Date[] | null
  entity: string
  /** 'PKP' | 'Non-PKP' | TAX_NONE | '' */
  tax: string
  attention: string
  tags: Record<RegTagField, RegTagFilter>
}
export interface RegFilters extends RegDrawerFilters { q: string; ae: string; product: string; source: string }
export const TAX_NONE = '__none__'
export const emptyRegDrawerFilters = (): RegDrawerFilters => ({
  date: null, entity: '', tax: '', attention: '',
  tags: Object.fromEntries(REG_TAG_FIELDS.map((k) => [k, { cmp: 'isAnyOf', values: [] }])) as unknown as Record<RegTagField, RegTagFilter>,
})
export const emptyRegFilters = (): RegFilters => ({ q: '', ae: '', product: '', source: '', ...emptyRegDrawerFilters() })
/** Sentinel for the Account Owner filter: tickets with no Account Owner yet. */
export const AE_NONE = '__none__'

/** How many drawer filters are applied (the "All filters (n)" count). */
export function drawerFilterCount(f: RegDrawerFilters): number {
  return [f.date, f.entity, f.tax, f.attention].filter(Boolean).length + REG_TAG_FIELDS.filter((k) => f.tags[k]?.values.length).length
}
export function hasActiveFilters(f: RegFilters): boolean {
  return !!(f.q.trim() || f.ae || f.product || f.source) || drawerFilterCount(f) > 0
}

/** The blocker a ticket's card badge shows, as a filterable key ('' = none / final stage). */
export function attentionOf(t: BoTicket): RegAttention | '' {
  if (t.stage === 'Registration Request') return t.ae ? '' : 'ae-missing'
  if (t.stage === 'Data Validation') {
    if (anyInvalid(t)) return 'invalid-checks'
    return allValid(t) ? '' : 'checks-pending'
  }
  if (t.stage === 'Agreement Drafting') return blockers(t).length ? 'docs-incomplete' : 'ready'
  return ''
}

const tagValues = (t: BoTicket, k: RegTagField): string[] => {
  const v = t[k] as string | string[]
  return (Array.isArray(v) ? v : [v]).filter(Boolean)
}
function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d + 'T00:00') : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Search matches ticket number, brand, legal name, partner code, submitter and email. */
export function filterTickets(list: BoTicket[], f: RegFilters): BoTicket[] {
  const q = f.q.trim().toLowerCase()
  const range = f.date ? [dayKey(f.date[0]!), dayKey(f.date[1]!)] : null
  return list.filter((t) =>
    (!f.ae || (f.ae === AE_NONE ? !t.ae : t.ae === f.ae)) &&
    (!f.product || t.product === f.product) &&
    (!f.source || t.source === f.source) &&
    (!range || (t.date >= range[0]! && t.date.slice(0, 10) <= range[1]!)) &&
    (!f.entity || t.entity === f.entity) &&
    (!f.tax || (f.tax === TAX_NONE ? !t.tax : t.tax === f.tax)) &&
    (!f.attention || attentionOf(t) === f.attention) &&
    REG_TAG_FIELDS.every((k) => {
      const tf = f.tags?.[k]
      if (!tf || !tf.values.length) return true
      const hit = tagValues(t, k).some((v) => tf.values.includes(v))
      return tf.cmp === 'isNoneOf' ? !hit : hit
    }) &&
    (!q || [t.id, t.brand, t.legal, t.code, t.submitter, t.email].join(' ').toLowerCase().includes(q)))
}

/** Distinct values of a multi-value drawer field, alphabetical. */
export function distinctTags(list: BoTicket[], k: RegTagField): string[] {
  return [...new Set(list.flatMap((t) => tagValues(t, k)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/** Distinct values of a ticket field, alphabetical (filter options). */
export function distinctOf(list: BoTicket[], key: 'product' | 'source'): string[] {
  return [...new Set(list.map((t) => t[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

// ── Board ────────────────────────────────────────────────────────────────────
/**
 * Column order: tickets placed by a drop keep their manual `rank`; tickets
 * without one (new arrivals) sit on top, newest submission first.
 */
export function sortTickets(list: BoTicket[]): BoTicket[] {
  return [...list].sort((a, b) => {
    const ra = a.rank ?? null, rb = b.rank ?? null
    if (ra !== null && rb !== null && ra !== rb) return ra - rb
    if (ra === null && rb !== null) return -1
    if (ra !== null && rb === null) return 1
    return a.date === b.date ? b.id.localeCompare(a.id) : a.date < b.date ? 1 : -1
  })
}

export const isLocked = (t: BoTicket) => BO_FINAL.includes(t.stage)

/**
 * Live drop feedback while a card hovers a column: `same` (its own column —
 * neutral), `ok` (valid target) or the reason it can't land there.
 */
export function dropFeedback(t: BoTicket, to: TicketStage): { state: 'same' | 'ok' | 'blocked'; msg: string } {
  const c = checkMove(t, to)
  if (c.same) return { state: 'same', msg: '' }
  return c.ok ? { state: 'ok', msg: '' } : { state: 'blocked', msg: c.msg }
}

/** MpBadge type for the card-note tone from ticketCardNote(). */
export function noteBadgeType(tone: 'default' | 'warning' | 'danger' | 'success'): 'announcement' | 'warning' | 'critical' | 'completed' {
  return tone === 'warning' ? 'warning' : tone === 'danger' ? 'critical' : tone === 'success' ? 'completed' : 'announcement'
}

// ── Ticket drawer ────────────────────────────────────────────────────────────
/** Previous / next stage buttons + whether an Invalid check limits the ticket to Reject. */
export function stageNav(t: BoTicket): { prev: TicketStage | null; next: TicketStage | null; back: TicketStage[]; invalidLock: boolean } {
  if (isLocked(t)) return { prev: null, next: null, back: [], invalidLock: false }
  const idx = BO_SEQ.indexOf(t.stage)
  const invalidLock = t.stage === 'Data Validation' && anyInvalid(t)
  /** Every stage already passed, nearest first — a ticket can go back to any of them. */
  const back = !invalidLock && idx > 0 ? BO_SEQ.slice(0, idx).reverse() : []
  return {
    prev: back[0] ?? null,
    next: !invalidLock && idx >= 0 && idx < BO_SEQ.length - 1 ? BO_SEQ[idx + 1]! : null,
    back,
    invalidLock,
  }
}

/** Helper line at the left of the drawer footer (empty = none). */
export function footerHint(t: BoTicket): string {
  if (isLocked(t)) return ''
  if (t.stage === 'Data Validation') {
    if (anyInvalid(t)) return tr('One or more checks are Invalid. Reject is the only action.')
    if (!allValid(t)) return tr('Mark every section as valid to move to Agreement Drafting.')
  }
  if (t.stage === 'Agreement Drafting') {
    const bl = blockers(t)
    if (bl.length) return tr('To complete:') + ' ' + bl.join(' ')
  }
  return ''
}

export interface RegFact { label: string; value: string; /** the uploaded ID file → rendered as a preview link */ file?: boolean }
/** Summary facts at the top of the drawer — the account data from sign-up + intake. */
export function ticketFacts(t: BoTicket): RegFact[] {
  const facts: RegFact[] = [
    { label: tr('Submitted by'), value: t.submitter },
    { label: tr('Email'), value: t.email },
    { label: tr('Phone number'), value: t.phone || '—' },
    { label: tr('Job position'), value: t.job || '—' },
    { label: tr('Submitted'), value: formatDateLong(t.date) },
    { label: tr('Source'), value: t.source || '—' },
    { label: tr('Registration number'), value: t.id },
    { label: tr('Zoho acquisition ticket'), value: t.acq || '—' },
  ]
  if (t.partnerId && t.stage !== 'Completed') {
    const p = getPartner(t.partnerId)
    facts.push({ label: tr('Partner link'), value: t.partnerId + (p ? ' · ' + p.legal : '') })
  }
  return facts
}

const showList = (v: string[]) => (v && v.length ? v.map((x) => tr(x)).join(', ') : '—')
const show = (v: string) => (v ? v : '—')

/**
 * Read-only rows of each data section (J-04) — same groups, labels and order as
 * the partner registration form's review step (data/partnerRegReview.ts).
 */
export function sectionRows(t: BoTicket, key: SectionKey): RegFact[] {
  const co = t.entity === 'Company'
  const location = [t.city, t.prov, 'Indonesia'].filter(Boolean).join(', ')
  const rows: Record<SectionKey, [string, string][]> = {
    legal: [
      ['Register as', tr(t.entity)],
      [co ? 'Legal company name' : 'Full name as on KTP', show(t.legal)],
      [co ? 'Company NPWP' : 'NIK', show(t.idNo)],
      // From the registration form (companies only) — read-only here.
      ...(co ? [['Tax status', show(t.tax)] as [string, string]] : []),
      [co ? 'Company NPWP file' : 'KTP file', show(t.idFile)],
      [co ? 'Address as on NPWP' : 'Address as on KTP', [t.addr, location].filter(Boolean).join(', ') || '—'],
    ],
    company: [
      ['Business name', show(t.brand || t.legal)], ['Partner code', show(t.code)], ['Operating location', location || '—'],
      ['Website URL', show(t.web)], ['LinkedIn URL', show(t.li)], [co ? 'Company industry' : 'Your industry', show(t.industry)],
    ],
    market: [
      ['Product', show(t.product)], ['Your specialization', showList(t.specs)], ['Industries you want to sell to', showList(t.targets)],
      ['Target company size', showList(t.segments)], ['Average project value', show(t.deal)],
    ],
  }
  const fileLabel = co ? 'Company NPWP file' : 'KTP file'
  return rows[key].map(([label, value]) => ({ label: tr(label), value, ...(label === fileLabel ? { file: true } : {}) }))
}

/** Caption under the Account Owner selector — where the current value came from. */
export function aeCaption(t: BoTicket): string {
  if (t.aeFrom === 'url') return tr('Pre-assigned from the ae URL parameter.')
  if (t.aeFrom === 'link') return tr('Pre-assigned from the partner registration form link.')
  return ''
}

/** Account Owner selector options (email + name). */
export function aeOptions(): { value: string; label: string }[] {
  return [...bo.aes].sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({ value: a.email, label: `${a.name} · ${a.email}` }))
}

/** "{n} of {total} checks valid" for the drawer — mirrors the card note in Data Validation. */
export const validCount = (t: BoTicket) => BO_CHECKS.filter((k) => t.checks[k] === 'Valid').length

/** Provenance line → opens the activity log (rule/activity-log-trigger). */
export function provenance(t: BoTicket): { text: string } {
  const first = t.log[0]
  const last = t.log[t.log.length - 1]
  if (!last) return { text: tr('Submitted on {date}', { date: formatDateLong(t.date) }) }
  if (t.log.length === 1 && first) return { text: tr('Created by {user} on {date}', { user: first.by, date: formatDateTimeLong(first.at) }) }
  return { text: tr('Last updated by {user} on {date}', { user: last.by, date: formatDateTimeLong(last.at) }) }
}

/** Completed banner text — the partner the ticket created or switched. */
export function completedText(t: BoTicket): string {
  const p = getPartner(t.partnerId)
  return p
    ? tr('{name} ({id}) is {status}.', { name: p.brand || p.legal, id: p.id, status: tr(p.status) })
    : tr('The partner is Registered.')
}

/** Rejected banner text. */
export function rejectedText(t: BoTicket): string {
  return t.reason + ' ' + (t.rejectedOn
    ? tr('The reason was emailed to {email} on {date}. Partner code {code} is released.', { email: t.email, date: formatDateLong(t.rejectedOn), code: t.code })
    : tr('The reason was emailed to {email}. Partner code {code} is released.', { email: t.email, code: t.code }))
}

export { aeName }
