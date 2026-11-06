/**
 * Backoffice (Mekari Partner Internal Portal) — the single store.
 *
 * Ported from the "Mekari Partner Internal Portal v2" prototype (seed data +
 * every business rule). One reactive `bo` object holds all collections; every
 * exported action mutates it AND persists the touched collection via
 * `persist.ts` snapshots (keys `bo-*` under the shared `erp-db:` prefix, so the
 * app's "Reset demo data" → `resetDb()` wipes them and the seed comes back).
 *
 * ── Rules for consumers (module pages) ──────────────────────────────────────
 *  • Read state from `bo.*` (reactive) or the selectors below.
 *  • Never mutate `bo.*` directly — call an action. If you really must, call
 *    `persistBo()` afterwards.
 *  • Action results that carry user copy are ALREADY translated (via `tr()`),
 *    so a page just shows `res.msg` (success → `successToast(res.msg)`; a failed
 *    check → inline error, never a toast — rule/form-errors-inline).
 *  • Dates are stored ISO: date-only `YYYY-MM-DD`, timestamps `YYYY-MM-DDTHH:MM`.
 *    Render with `~/utils/date` (formatDate / formatDateLong / formatDateTime /
 *    formatDateTimeLong) — rule/format-date.
 *  • Status strings (stage, doc status, MA status, partner status, CR status,
 *    check values) are keys of `ErpStatusBadge` — pass them straight to
 *    `<ErpStatusBadge :status="…" />`.
 *
 * ── API overview ─────────────────────────────────────────────────────────────
 *  State          bo, persistBo(), resetBackoffice()
 *  Clock          boTodayIso(), boNowIso(), setBoToday(iso|null), addDays(), dayDiff()
 *  Copy           tr(template, vars) — t() + {placeholder} interpolation
 *  Helpers        showVal, validEmail, validUrl, isPdf, docUrl, signUrl, isoToDmy, dmyToIso
 *  Session        boLogin(email), boLogout(), isInternalEmail(email)
 *  Lookups        getTicket, getPartner, getMa, getCr, getAnnouncement, rowsOf,
 *                 ownerLabel, aeName, trainerName, partnerName, allUsersDirectory
 *  Agreements     agBase, agStatus, agName, linkedDocs, agreementRowsView,
 *                 blankAgDraft, draftFromRow, duplicateDraft, agreementDraftErrors,
 *                 draftStatusPreview, maOptionsFor, docOptionsFor,
 *                 saveAgreement, saveAgreementRemarks, removeAgreement, allDocuments
 *  Tickets        allValid, anyInvalid, blockers, checkMove, moveTicket,
 *                 rejectTicket, completeTicket, completePreview, ticketCardNote,
 *                 setTicketAe, setTicketCheck, setTicketTax, ticketActivityEntries
 *  Partners       createPartner, partnerCreateErrors, updatePartnerProfile,
 *                 partnerProfileErrors, setPartnerStatus, setPartnerUsers,
 *                 linkedRegistration, registrationLink
 *  Change req.    crRowsView, crDecidedText, approveCr, rejectCr
 *  Announcements  announcementsSorted, announcementErrors, saveAnnouncement, deleteAnnouncement
 *  Roster         rosterList, rosterErrors, saveRosterPerson, deleteRosterPerson
 *  Masters        masterUsedBy, saveMaster, deleteMaster
 *  Master agr.    maUsed, maAllowedStatuses, maDraftErrors, saveMa, setMaStatus,
 *                 duplicateMa, impact, deprecateMa
 *  Dashboard      dashboardCounts()
 */
import { reactive } from 'vue'
import { loadSnapshot, saveSnapshot } from './persist'
import { useLocale } from '~/composables/useLocale'
import { formatDateLong } from '~/utils/date'
import type { ActivityEntry } from '~/components/patterns/ActivityLogModal.vue'

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════
export type TicketStage = 'Registration Request' | 'Data Validation' | 'Agreement Drafting' | 'Completed' | 'Rejected'
export type CheckKey = 'legal' | 'company' | 'market'
/** Ticket data sections — the partner registration form's steps (partnerReg.ts). */
export type SectionKey = 'legal' | 'company' | 'market'
export type CheckValue = '' | 'Valid' | 'Invalid'
export type TaxStatus = '' | 'PKP' | 'Non-PKP'
export type EntityType = 'Company' | 'Individual'
export type AgSection = 'pa' | 'other'
export type AgMethod = 'manual' | 'esign'
export type DocStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED'
export type MaType = 'PRIMARY' | 'OTHERS'
export type MaStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED'
export type BoPartnerStatus = 'Unregistered' | 'Registered' | 'Active' | 'Inactive'
export type CrStatus = 'In review' | 'Approved' | 'Rejected' | 'Cancelled'
export type MasterKey = 'professions' | 'specializations' | 'responsibilities' | 'roles' | 'products'
export type CrField = 'brand' | 'phone' | 'industry' | 'specs' | 'targets' | 'bank' | 'holder' | 'acct' | 'web' | 'li'
export type RosterKind = 'owners' | 'trainers'

/** Who owns an agreement row — a registration ticket or a partner. */
export interface BoOwner { kind: 'ticket' | 'partner'; id: string }
/** Generic result of an action. `msg` is already translated. */
export interface BoResult { ok: boolean; msg: string }

export interface BoLogEntry { text: string; by: string; /** ISO `YYYY-MM-DDTHH:MM` */ at: string }

export interface BoAgreement {
  id: string
  section: AgSection
  method: AgMethod
  /** Master agreement id */
  ma: string
  /** Mekari Sign document id (E-Sign only) */
  doc: string | null
  /** Manual-only name (E-Sign takes the Mekari Sign document name) */
  name: string
  start: string
  end: string
  remarks: string
  /** Manual-only uploaded PDF file name */
  file: string
  /** id of the row this one replaces (Duplicate / re-agreement batch) */
  replaces: string | null
  /** Forced EXPIRED (replaced early) */
  expired: boolean
}

export interface BoTicket {
  id: string
  brand: string
  code: string
  entity: EntityType
  stage: TicketStage
  source: string
  product: string
  /** Zoho acquisition ticket */
  acq: string
  acqBy: 'platform' | 'url'
  /** Account Owner email ('' = not assigned) */
  ae: string
  aeFrom: '' | 'url' | 'link'
  /** Linked partner (registration-form link of an Unregistered partner, or the created partner) */
  partnerId: string | null
  /** Submitted date, ISO */
  date: string
  /** Manual position inside its board column (set by a kanban drop); unset = by submitted date */
  rank?: number
  submitter: string
  email: string
  job: string
  impl: boolean
  phone: string
  industry: string
  web: string
  li: string
  specs: string[]
  targets: string[]
  segments: string[]
  deal: string
  prov: string
  city: string
  idFile: string
  idNo: string
  legal: string
  addr: string
  bank: string
  acct: string
  holder: string
  tax: TaxStatus
  /** Klikpajak NPWP validation result (Company only) */
  klik: 'Valid' | 'Invalid'
  checks: Record<CheckKey, CheckValue>
  agreements: BoAgreement[]
  reason: string
  /** ISO date the ticket was rejected */
  rejectedOn: string
  log: BoLogEntry[]
}

export interface BoPartnerUser {
  email: string
  name: string
  job: string
  phone: string
  profession: string
  role: 'admin' | 'user'
}

export interface BoPartner {
  id: string
  entity: EntityType
  brand: string
  legal: string
  code: string
  status: BoPartnerStatus
  ae: string
  /** Technical PIC (trainer email) */
  tech: string
  country: string
  prov: string
  city: string
  web: string
  li: string
  phone: string
  industry: string
  product: string
  impl: boolean
  specs: string[]
  targets: string[]
  segments: string[]
  deal: string
  idNo: string
  addr: string
  bank: string
  holder: string
  acct: string
  tax: TaxStatus
  source: string
  acq: string
  /** 'Manual' or 'Registration REG-xxxx' */
  origin: string
  /** ISO date created */
  created: string
  users: BoPartnerUser[]
  agreements: BoAgreement[]
}

export interface BoMasterRecord { name: string; desc?: string; resp?: string[] }
export type BoMasters = Record<MasterKey, BoMasterRecord[]>

export interface BoMasterAgreement {
  id: string
  name: string
  desc: string
  type: MaType
  status: MaStatus
  /** Seed flag — used historically even if no row references it now */
  used: boolean
  /** PRIMARY only: product → partner roles */
  products: Record<string, string[]>
  pdf: string
}

export interface BoRosterPerson { name: string; email: string; products: string[] }

export interface BoChangeRequest {
  id: string
  pid: string
  by: string
  email: string
  /** ISO submitted date */
  date: string
  status: CrStatus
  changes: Partial<Record<CrField, string | string[]>>
  /** Values before the decision (set on approve/reject) */
  before: Partial<Record<CrField, string | string[]>> | null
  reason: string
  decidedBy: string
  /** ISO date decided */
  decidedOn: string
}

export interface BoAnnouncement {
  id: string
  title: string
  desc: string
  /** Rich text HTML */
  content: string
  /** ISO `YYYY-MM-DDTHH:MM` */
  postedAt: string
}

export interface BoSession { name: string; email: string }

export interface BoMekariSignDoc { id: string; name: string; signed: boolean }

export interface BoState {
  tickets: BoTicket[]
  partners: BoPartner[]
  masters: BoMasters
  mas: BoMasterAgreement[]
  aes: BoRosterPerson[]
  trainers: BoRosterPerson[]
  crs: BoChangeRequest[]
  anns: BoAnnouncement[]
  /** Internal-portal session (null = signed out) */
  session: BoSession | null
}

// ═════════════════════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════════════════════
export const BO_STAGES: TicketStage[] = ['Registration Request', 'Data Validation', 'Agreement Drafting', 'Completed', 'Rejected']
export const BO_SEQ: TicketStage[] = ['Registration Request', 'Data Validation', 'Agreement Drafting', 'Completed']
export const BO_FINAL: TicketStage[] = ['Completed', 'Rejected']
export const BO_STAGE_CAPTION: Record<TicketStage, string> = {
  'Registration Request': 'Assign an account owner to proceed.',
  'Data Validation': 'All sections must be marked as valid to proceed.',
  'Agreement Drafting': 'All documents must be completed. Then drag the card to the next stage.',
  Completed: 'Registration is locked and cannot be edited.',
  Rejected: 'Registration is locked and cannot be edited.',
}
export const BO_CR_STATUSES: CrStatus[] = ['In review', 'Approved', 'Rejected', 'Cancelled']
export const BO_CR_CAPTION: Record<CrStatus, string> = {
  'In review': 'Waiting for approval. One per partner.',
  Approved: 'Final. Values applied.',
  Rejected: 'Final. Partner data unchanged.',
  Cancelled: 'Cancelled by the partner admin.',
}
export const BO_CR_FIELDS: [CrField, string][] = [['brand', 'Brand name'], ['phone', 'Phone'], ['industry', 'Partner industry'], ['specs', 'Specializations'], ['targets', 'Target industries'], ['bank', 'Bank name'], ['holder', 'Bank account holder name'], ['acct', 'Bank account number'], ['web', 'Website URL'], ['li', 'LinkedIn URL']]
export const BO_SECTIONS: [SectionKey, string][] = [['legal', 'Legal information'], ['company', 'Business profile'], ['market', 'Market and expertise']]
export const BO_CHECKS: CheckKey[] = ['legal', 'company', 'market']
export const BO_CHECK_OPTIONS: CheckValue[] = ['Valid', 'Invalid']
export const BO_TAX_OPTIONS: TaxStatus[] = ['PKP', 'Non-PKP']
export const BO_PRODUCTS = ['Talenta', 'Jurnal', 'Klikpajak', 'Expense', 'Qontak', 'Mekari Sign', 'Officeless']
export const BO_INDUSTRIES = ['IT services and consulting', 'Software', 'Accounting and tax services', 'HR services', 'Financial services', 'Other']
export const BO_GEO: Record<string, Record<string, string[]>> = {
  Indonesia: {
    'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara'],
    'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Depok'],
    'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo'],
    Banten: ['Tangerang', 'Tangerang Selatan', 'Serang'],
    Bali: ['Denpasar', 'Badung'],
  },
}
/** The signed-in internal user (prototype has a single internal persona). */
export const BO_ME = 'Rina Wijaya'
export const BO_ME_EMAIL = 'rina.wijaya@mekari.com'
export const BO_INTERNAL_DOMAIN = '@mekari.com'

export const BO_DOCS: BoMekariSignDoc[] = ([
  ['MS-58211', 'Partnership Agreement · PT Garuda Integrasi Sistem', true],
  ['MS-58307', 'Partnership Agreement · PT Cakra Solusi Digital', false],
  ['MS-58312', 'Partnership Agreement · PT Nusa Cloud Integrasi', true],
  ['MS-58318', 'Data Processing Addendum · PT Nusa Cloud Integrasi', false],
  ['MS-58325', 'Data Processing Addendum · PT Cakra Solusi Digital', false],
  ['MS-58340', 'Partnership Agreement · PT Lintas Teknologi Asia', false],
  ['MS-58344', 'Partnership Agreement · PT Solusi Prima Teknologi', true],
  ['MS-58390', 'Partnership Agreement 2027 · PT Solusi Prima Teknologi', true],
  ['MS-58391', 'Partnership Agreement 2027 · PT Garuda Integrasi Sistem', false],
  ['MS-58395', 'Partnership Agreement 2027 · CV Mitra Akuntansi Sejahtera', false],
] as [string, string, boolean][]).map(([id, name, signed]) => ({ id, name, signed }))

export const BO_MASTER_META: Record<MasterKey, { title: string; singular: string; lead: string; desc?: boolean; resp?: boolean }> = {
  professions: { title: 'Professions', singular: 'profession', lead: 'Options for the Profession field in sign-up and in manual partner creation.' },
  specializations: { title: 'Specializations', singular: 'specialization', lead: 'Options for Your specialization in the partner registration form.' },
  responsibilities: { title: 'Responsibilities', singular: 'responsibility', lead: 'Each responsibility appears as a checkbox in Partner Roles.', desc: true },
  roles: { title: 'Partner Roles', singular: 'partner role', lead: 'A partner role holds the responsibilities ticked for it.', desc: true, resp: true },
  products: { title: 'Products', singular: 'product', lead: 'Each product appears as a checkbox in Master Agreements and as an option for Product in the registration form.' },
}
/** Configurations submenu order; `agreements` = Master Agreements. Route = /backoffice/configurations/<key>. */
export const BO_CFG_ORDER: [MasterKey | 'master-agreements', string][] = [['professions', 'Professions'], ['specializations', 'Specializations'], ['responsibilities', 'Responsibilities'], ['roles', 'Partner Roles'], ['products', 'Products'], ['master-agreements', 'Master Agreements']]

/** Users that exist in the Mekari user database but belong to no partner. */
export const BO_SEED_USERS: Omit<BoPartnerUser, 'role'>[] = [
  { email: 'alexandria.putri@gmail.com', name: 'Alexandria Putri', job: 'Implementation Consultant', phone: '+62 812 3456 7890', profession: 'Consultant' },
  { email: 'budi.santoso@gmail.com', name: 'Budi Santoso', job: 'Freelance Consultant', phone: '+62 812 7788 9900', profession: 'Consultant' },
  { email: 'yoga@sinergidata.co.id', name: 'Yoga Prasetyo', job: 'Director', phone: '', profession: 'Project manager' },
  { email: 'dewi.lestari@gmail.com', name: 'Dewi Lestari', job: 'Tax Consultant', phone: '', profession: 'Accountant or tax professional' },
]

// ═════════════════════════════════════════════════════════════════════════════
// Small helpers (clock, copy, validation)
// ═════════════════════════════════════════════════════════════════════════════
const pad = (n: number) => String(n).padStart(2, '0')
const isoOfDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o))

let todayOverride: string | null = null
/** Test hook — pin "today" (ISO date) or pass null to use the real clock. */
export function setBoToday(iso: string | null): void { todayOverride = iso }
/** Today as ISO `YYYY-MM-DD`. */
export function boTodayIso(): string { return todayOverride ?? isoOfDate(new Date()) }
/** Now as ISO `YYYY-MM-DDTHH:MM` (local). */
export function boNowIso(): string {
  const d = new Date()
  return `${boTodayIso()}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoOfDate(d)
}
export function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}
/** ISO `YYYY-MM-DD` → `DD/MM/YYYY` (MpDatePicker value-type="format"). */
export function isoToDmy(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
/** `DD/MM/YYYY` → ISO `YYYY-MM-DD`. */
export function dmyToIso(dmy: string): string {
  if (!dmy) return ''
  const [d, m, y] = dmy.split('/')
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : ''
}

/** Translate an English template with t(), then fill `{name}` placeholders. */
export function tr(template: string, vars?: Record<string, string | number>): string {
  const { t } = useLocale()
  return t(template).replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ''))
}

/** Display a value: arrays joined, booleans Yes/No, empty → "—". */
export function showVal(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (v === true) return tr('Yes')
  if (v === false) return tr('No')
  return (v as string) || '—'
}
export const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test((v || '').trim())
export const validUrl = (v: string) => /^https?:\/\/\S+\.\S+/.test((v || '').trim())
export const isPdf = (f: { type?: string; name: string } | null | undefined) => !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
export const docUrl = (id: string) => 'https://sign.mekari.com/documents/' + id
export const signUrl = (id: string) => 'https://sign.mekari.com/sign/' + id
const L = (text: string, by: string, at: string): BoLogEntry => ({ text, by, at })

// ═════════════════════════════════════════════════════════════════════════════
// Seed
// ═════════════════════════════════════════════════════════════════════════════
const AG = (o: Partial<BoAgreement> & { id: string }): BoAgreement => ({ section: 'pa', method: 'manual', ma: '', doc: null, name: '', start: '', end: '', remarks: '', file: '', replaces: null, expired: false, ...o })
const U = (email: string, name: string, job: string, profession: string, role: 'admin' | 'user', phone?: string): BoPartnerUser => ({ email, name, job, phone: phone || '', profession, role })
const P = (o: Partial<BoPartner> & { id: string }): BoPartner => ({
  entity: 'Company', brand: '', legal: '', code: '', status: 'Unregistered', ae: '', tech: '', country: 'Indonesia', prov: '', city: '', web: '', li: '', phone: '', industry: '', product: '', impl: false,
  specs: [], targets: [], segments: [], deal: '', idNo: '', addr: '', bank: '', holder: '', acct: '', tax: '', source: '', acq: '', origin: 'Manual', created: '', users: [], agreements: [], ...o,
})

function seedMasters(): BoMasters {
  return {
    professions: ['Consultant', 'Implementer', 'Developer', 'Project manager', 'Accountant or tax professional', 'HR professional', 'Student or lecturer', 'Other'].map((name) => ({ name })),
    specializations: ['HR and payroll', 'Accounting and finance', 'Tax', 'Sales and CRM', 'Omnichannel customer service', 'Digital signature and documents'].map((name) => ({ name })),
    responsibilities: ([['Sell subscriptions', 'Sell Mekari subscriptions to end users.'], ['Implement products', 'Configure and roll out Mekari products for end users.'], ['Provide first-line support', 'Handle end-user questions before escalating to Mekari.'], ['Develop integrations', 'Build integrations on Mekari APIs.'], ['Deliver training', 'Train end users on Mekari products.'], ['Refer leads', 'Refer qualified leads to Mekari.']] as [string, string][]).map(([name, desc]) => ({ name, desc })),
    roles: ([['Reseller', 'Sells Mekari subscriptions to end users.', ['Sell subscriptions', 'Provide first-line support', 'Refer leads']], ['System Implementor', 'Implements Mekari products for end users.', ['Implement products', 'Provide first-line support', 'Deliver training']], ['Solution Developer', 'Builds integrations and extensions on Mekari APIs.', ['Develop integrations']], ['Referral Partner', 'Refers leads to Mekari.', ['Refer leads']]] as [string, string, string[]][]).map(([name, desc, resp]) => ({ name, desc, resp })),
    products: BO_PRODUCTS.map((name) => ({ name })),
  }
}

function seedMas(): BoMasterAgreement[] {
  return [
    { id: 'ma1', name: 'Partnership agreement 2026 · Reseller', desc: 'Standard reseller terms for 2026.', type: 'PRIMARY', status: 'ACTIVE', used: false, products: { Talenta: ['Reseller'], Jurnal: ['Reseller'], Qontak: ['Reseller'] }, pdf: 'partnership-agreement-reseller-2026.pdf' },
    { id: 'ma2', name: 'Partnership agreement 2026 · Implementation', desc: 'Implementation and first-line support terms.', type: 'PRIMARY', status: 'ACTIVE', used: false, products: { Talenta: ['System Implementor'], Jurnal: ['System Implementor'] }, pdf: 'partnership-agreement-implementation-2026.pdf' },
    { id: 'ma3', name: 'Referral agreement', desc: 'Lead referral terms.', type: 'PRIMARY', status: 'DRAFT', used: false, products: { Talenta: ['Referral Partner'], Klikpajak: ['Referral Partner'] }, pdf: 'referral-agreement-draft.pdf' },
    { id: 'ma4', name: 'Partnership agreement 2025 · Reseller', desc: 'Reseller terms for 2025. Replaced by the 2026 terms.', type: 'PRIMARY', status: 'DEPRECATED', used: true, products: { Talenta: ['Reseller'], Jurnal: ['Reseller'] }, pdf: 'partnership-agreement-reseller-2025.pdf' },
    { id: 'ma5', name: 'Non-disclosure agreement', desc: 'Mutual NDA for partners.', type: 'OTHERS', status: 'ACTIVE', used: false, products: {}, pdf: 'nda-2026.pdf' },
    { id: 'ma6', name: 'Data processing addendum', desc: 'Personal data processing terms.', type: 'OTHERS', status: 'ACTIVE', used: false, products: {}, pdf: 'dpa-2026.pdf' },
    { id: 'ma7', name: 'Co-marketing agreement', desc: 'Joint campaign terms.', type: 'OTHERS', status: 'DRAFT', used: false, products: {}, pdf: '' },
  ]
}

function seedAes(): BoRosterPerson[] {
  return [
    { name: 'Dimas Ardiansyah', email: 'dimas.ardiansyah@mekari.com', products: ['Talenta', 'Jurnal'] },
    { name: 'Putri Anggraini', email: 'putri.anggraini@mekari.com', products: ['Qontak', 'Mekari Sign'] },
    { name: 'Kevin Halim', email: 'kevin.halim@mekari.com', products: ['Klikpajak', 'Expense', 'Jurnal'] },
    { name: 'Nadia Rahman', email: 'nadia.rahman@mekari.com', products: ['Officeless', 'Talenta'] },
  ]
}
function seedTrainers(): BoRosterPerson[] {
  return [
    { name: 'Rangga Saputra', email: 'rangga.saputra@mekari.com', products: ['Talenta', 'Officeless'] },
    { name: 'Melati Kusuma', email: 'melati.kusuma@mekari.com', products: ['Jurnal', 'Klikpajak'] },
    { name: 'Fikri Ramadhan', email: 'fikri.ramadhan@mekari.com', products: ['Qontak', 'Mekari Sign', 'Expense'] },
  ]
}

const ROW_G1 = (): BoAgreement => AG({ id: 'ag-g1', method: 'esign', ma: 'ma1', doc: 'MS-58211', start: '2026-10-02', end: '2027-10-01' })

function seedPartners(): BoPartner[] {
  return [
    P({ id: 'P-0004', brand: 'Solusi Prima', legal: 'PT Solusi Prima Teknologi', code: 'MPSOLUSI', status: 'Active', ae: 'nadia.rahman@mekari.com', tech: 'rangga.saputra@mekari.com', prov: 'Jawa Timur', city: 'Surabaya', web: 'https://solusiprima.co.id', li: 'https://www.linkedin.com/company/solusiprima',
      phone: '+62 31 5000 7788', industry: 'IT services and consulting', product: 'Talenta', impl: true, specs: ['HR and payroll', 'Accounting and finance'], targets: ['Manufacturing', 'Retail', 'Logistics'], segments: ['Small (51–100 employees)', 'Medium (101–300 employees)'], deal: '51–250 mio',
      idNo: '02.345.678.9-615.000', addr: 'Jl. Raya Darmo No. 88, Surabaya 60265', bank: 'Bank Mandiri', holder: 'PT Solusi Prima Teknologi', acct: '1420098765432', tax: 'PKP', source: 'Landing page', acq: 'ZAT-19822', origin: 'Registration REG-0112', created: '2026-03-04',
      users: [U('hana@solusiprima.co.id', 'Hana Kusuma', 'Managing Director', 'Consultant', 'admin', '+62 812 3300 1100'), U('rudi@solusiprima.co.id', 'Rudi Hartanto', 'Implementation Lead', 'Implementer', 'user'), U('ika@solusiprima.co.id', 'Ika Putri', 'Support Specialist', 'Implementer', 'user')],
      agreements: [AG({ id: 'ag-s1', method: 'esign', ma: 'ma1', doc: 'MS-58344', start: '2026-03-01', end: '2027-02-28' }), AG({ id: 'ag-s2', section: 'other', ma: 'ma5', name: 'Non-disclosure agreement 2025 · PT Solusi Prima Teknologi', start: '2025-03-01', end: '2026-02-28', file: 'nda-solusi-2025-signed.pdf' })] }),
    P({ id: 'P-0007', brand: 'Garuda Integrasi', legal: 'PT Garuda Integrasi Sistem', code: 'MPGARUDA', status: 'Registered', ae: 'dimas.ardiansyah@mekari.com', prov: 'DKI Jakarta', city: 'Jakarta Pusat', web: 'https://garudaintegrasi.co.id', li: 'https://www.linkedin.com/company/garudaintegrasi',
      phone: '+62 21 2900 4400', industry: 'IT services and consulting', product: 'Talenta', impl: true, specs: ['HR and payroll'], targets: ['Manufacturing', 'Logistics'], segments: ['Medium (101–300 employees)', 'Large (301–700 employees)'], deal: '251 mio–1 bio',
      idNo: '01.234.567.8-012.000', addr: 'Jl. M.H. Thamrin No. 10, Jakarta Pusat 10230', bank: 'BCA', holder: 'PT Garuda Integrasi Sistem', acct: '5270123456', tax: 'PKP', source: 'Landing page', acq: 'ZAT-20610', origin: 'Registration REG-0138', created: '2026-10-05',
      users: [U('andi@garudaintegrasi.co.id', 'Andi Kurniawan', 'Chief Executive Officer', 'Consultant', 'admin', '+62 811 900 1234'), U('lukas@garudaintegrasi.co.id', 'Lukas Wibowo', 'Implementation Lead', 'Implementer', 'user')],
      agreements: [ROW_G1(), AG({ id: 'ag-g2', section: 'other', ma: 'ma5', name: 'Non-disclosure agreement · PT Garuda Integrasi Sistem', start: '2025-09-15', end: '2027-09-14', file: 'nda-garuda-signed.pdf' })] }),
    P({ id: 'P-0009', brand: 'Mitra Akuntansi', legal: 'CV Mitra Akuntansi Sejahtera', code: 'MPMITRA', status: 'Inactive', ae: 'kevin.halim@mekari.com', tech: 'melati.kusuma@mekari.com', prov: 'Jawa Barat', city: 'Bandung', web: 'https://mitraakuntansi.id', li: 'https://www.linkedin.com/company/mitraakuntansi',
      phone: '+62 22 4200 9911', industry: 'Accounting and tax services', product: 'Jurnal', impl: false, specs: ['Accounting and finance', 'Tax'], targets: ['Retail', 'Professional services'], segments: ['Micro (0–50 employees)', 'Small (51–100 employees)'], deal: '0–50 mio',
      idNo: '03.456.789.0-423.000', addr: 'Jl. Asia Afrika No. 77, Bandung 40111', bank: 'BNI', holder: 'CV Mitra Akuntansi Sejahtera', acct: '0912345678', tax: 'Non-PKP', source: 'Webinar Jan 2026', acq: 'ZAT-19410', origin: 'Registration REG-0098', created: '2026-01-20',
      users: [U('wulan@mitraakuntansi.id', 'Wulan Sari', 'Owner', 'Accountant or tax professional', 'admin', '+62 813 2211 4455')],
      agreements: [AG({ id: 'ag-m1', ma: 'ma1', name: 'Partnership agreement · CV Mitra Akuntansi Sejahtera', start: '2026-01-20', end: '2027-01-19', remarks: 'Signed copy received by courier.', file: 'pa-mitra-signed.pdf' })] }),
    P({ id: 'P-0012', legal: 'PT Nusa Cloud Integrasi', ae: 'putri.anggraini@mekari.com', prov: 'DKI Jakarta', city: 'Jakarta Selatan', web: 'https://nusacloud.co.id', li: 'https://www.linkedin.com/company/nusacloud', created: '2026-10-12',
      users: [U('maya@nusacloud.co.id', 'Maya Hartono', 'Partnership Lead', 'Project manager', 'admin')] }),
    P({ id: 'P-0015', legal: 'PT Kencana Data Prima', ae: 'kevin.halim@mekari.com', prov: 'Banten', city: 'Tangerang', web: 'https://kencanadata.co.id', li: 'https://www.linkedin.com/company/kencanadata', created: '2026-10-21',
      users: [U('fajar@kencanadata.co.id', 'Fajar Nugroho', 'Head of IT', 'Developer', 'admin')] }),
  ]
}

function seedCrs(): BoChangeRequest[] {
  return [
    { id: 'CR-0021', pid: 'P-0007', by: 'Andi Kurniawan', email: 'andi@garudaintegrasi.co.id', date: '2026-10-28', status: 'In review', changes: { brand: 'Garuda Integrasi Group', web: 'https://garudagroup.co.id', targets: ['Manufacturing', 'Logistics', 'Financial services'] }, before: null, reason: '', decidedBy: '', decidedOn: '' },
    { id: 'CR-0019', pid: 'P-0004', by: 'Hana Kusuma', email: 'hana@solusiprima.co.id', date: '2026-10-14', status: 'Approved', changes: { phone: '+62 31 5000 7788' }, before: { phone: '+62 31 5000 1200' }, reason: '', decidedBy: 'Nadia Rahman', decidedOn: '2026-10-15' },
    { id: 'CR-0017', pid: 'P-0004', by: 'Hana Kusuma', email: 'hana@solusiprima.co.id', date: '2026-10-02', status: 'Rejected', changes: { holder: 'Solusi Prima', acct: '1420011112222' }, before: { holder: 'PT Solusi Prima Teknologi', acct: '1420098765432' }, reason: 'The new bank account could not be verified. Submit the request again with a bank statement.', decidedBy: 'Nadia Rahman', decidedOn: '2026-10-03' },
    { id: 'CR-0016', pid: 'P-0009', by: 'Wulan Sari', email: 'wulan@mitraakuntansi.id', date: '2026-09-25', status: 'Cancelled', changes: { li: 'https://www.linkedin.com/company/mitra-akuntansi-sejahtera' }, before: { li: 'https://www.linkedin.com/company/mitraakuntansi' }, reason: '', decidedBy: 'Wulan Sari', decidedOn: '2026-09-26' },
  ]
}

const ALL_VALID: Record<CheckKey, CheckValue> = { legal: 'Valid', company: 'Valid', market: 'Valid' }
function mk(id: string, brand: string, code: string, entity: EntityType, stage: TicketStage, x: Partial<BoTicket> = {}): BoTicket {
  const slug = brand.toLowerCase().replace(/^pt /, '').split(' ')[0]
  const co = entity === 'Company'
  return {
    id, brand, code, entity, stage, source: 'Landing page', product: 'Talenta', acq: '', acqBy: 'platform', ae: '', aeFrom: '', partnerId: null, date: '2026-10-28',
    submitter: 'Alexandria Putri', email: 'alexandria.putri@gmail.com', job: 'Business Development Manager', impl: true, phone: '+62 21 5000 1234', industry: 'IT services and consulting',
    web: 'https://' + slug + '.co.id', li: 'https://www.linkedin.com/company/' + slug, specs: ['HR and payroll', 'Accounting and finance'], targets: ['Manufacturing', 'Retail'],
    segments: ['Small (51–100 employees)', 'Medium (101–300 employees)'], deal: '51–250 mio',
    prov: 'DKI Jakarta', city: 'Jakarta Selatan', idFile: (co ? 'npwp-' : 'ktp-') + slug + '.pdf', idNo: co ? '01.234.567.8-012.000' : '3174012345670001', legal: brand,
    addr: 'Jl. Jend. Sudirman Kav. 52, Jakarta Selatan 12190', bank: 'BCA', acct: '5270123456', holder: '', tax: co ? 'PKP' : '', klik: 'Valid',
    checks: { legal: '', company: '', market: '' }, agreements: [], reason: '', rejectedOn: '', log: [], ...x,
  }
}
const created = (acq: string, by: string, at: string) => L('Submitted from the partner app. Created in Registration Request. Zoho acquisition ticket ' + acq + ' created.', by || 'System', at)

function seedTickets(): BoTicket[] {
  return [
    mk('REG-0152', 'PT Sinergi Data Nusantara', 'MPSINERGI', 'Company', 'Registration Request', { acq: 'ZAT-20931', date: '2026-10-29', submitter: 'Yoga Prasetyo', email: 'yoga@sinergidata.co.id', job: 'Director', log: [created('ZAT-20931', 'System', '2026-10-29T09:12')] }),
    mk('REG-0150', 'Dewi Lestari Consulting', 'MPDEWIL', 'Individual', 'Registration Request', { source: 'Webinar Oct 2026', product: 'Klikpajak', acq: 'ZAT-20877', acqBy: 'url', date: '2026-10-27', submitter: 'Dewi Lestari', email: 'dewi.lestari@gmail.com', job: 'Tax Consultant', legal: 'Dewi Lestari', prov: 'Jawa Barat', city: 'Bandung', addr: 'Jl. Dago No. 112, Bandung 40135', specs: ['Tax'], targets: ['Professional services'], segments: ['Micro (0–50 employees)'], deal: '0–50 mio',
      log: [L('Submitted with acquisition_ticket_id ZAT-20877. The ae value andre@mekari.com is not in Partner Account Owners and was treated as empty. Created in Registration Request. No Zoho ticket created.', 'System', '2026-10-27T15:40')] }),
    mk('REG-0149', 'PT Arunika Konsultan', 'MPARUNIKA', 'Company', 'Data Validation', { tax: 'Non-PKP', source: 'Partner event', product: 'Jurnal', acq: 'ZAT-20850', acqBy: 'url', ae: 'kevin.halim@mekari.com', aeFrom: 'url', date: '2026-10-26', submitter: 'Hendra Wijaya', email: 'hendra@arunika.co.id', job: 'Managing Partner',
      checks: { legal: '', company: 'Valid', market: '' }, log: [L('Submitted with acquisition_ticket_id ZAT-20850 and ae kevin.halim@mekari.com. Created in Data Validation. NPWP validated through Mekari Klikpajak: Valid.', 'System', '2026-10-26T11:03')] }),
    mk('REG-0147', 'Rizky Pratama', 'MPRIZKY', 'Individual', 'Data Validation', { acq: 'ZAT-20790', ae: 'dimas.ardiansyah@mekari.com', date: '2026-10-21', submitter: 'Rizky Pratama', email: 'rizky.pratama@gmail.com', job: 'Freelance Implementer', legal: 'Rizky Pratama', prov: 'Jawa Timur', city: 'Surabaya', addr: 'Jl. Raya Darmo No. 45, Surabaya 60264', holder: 'Rizky P',
      checks: { legal: 'Invalid', company: 'Valid', market: 'Valid' }, log: [created('ZAT-20790', 'System', '2026-10-21T08:30'), L('Registration Request → Data Validation', 'Dimas Ardiansyah', '2026-10-22T10:15')] }),
    mk('REG-0145', 'PT Lintas Teknologi Asia', 'MPLINTAS', 'Company', 'Data Validation', { product: 'Qontak', acq: 'ZAT-20755', ae: 'putri.anggraini@mekari.com', date: '2026-10-20', submitter: 'Michael Tan', email: 'michael@lintastek.co.id', job: 'Head of Partnerships',
      checks: { ...ALL_VALID }, log: [created('ZAT-20755', 'System', '2026-10-20T14:02'), L('Registration Request → Data Validation', 'Putri Anggraini', '2026-10-21T13:20')] }),
    mk('REG-0141', 'PT Cakra Solusi Digital', 'MPCAKRA', 'Company', 'Agreement Drafting', { acq: 'ZAT-20702', ae: 'dimas.ardiansyah@mekari.com', date: '2026-10-16', submitter: 'Sari Wulandari', email: 'sari@cakrasolusi.co.id', job: 'Chief Operating Officer', checks: { ...ALL_VALID }, tax: 'PKP',
      agreements: [
        AG({ id: 'ag-c1', method: 'esign', ma: 'ma1', doc: 'MS-58307', start: '2026-11-01', end: '2027-10-31', remarks: 'Signers set up in Mekari Sign: Sari Wulandari and Hendra Gunawan.' }),
        AG({ id: 'ag-c2', section: 'other', ma: 'ma5', name: 'Non-disclosure agreement · PT Cakra Solusi Digital', start: '2026-10-20', end: '2028-10-19', file: 'nda-cakra-signed.pdf' }),
        AG({ id: 'ag-c3', section: 'other', ma: 'ma6', name: 'Data processing addendum · PT Cakra Solusi Digital', start: '2026-11-01', end: '2027-10-31', remarks: 'Waiting for the partner to return the signed copy.' }),
      ],
      log: [created('ZAT-20702', 'System', '2026-10-16T10:41'), L('Registration Request → Data Validation', 'Dimas Ardiansyah', '2026-10-17T09:00'), L('Data Validation → Agreement Drafting', BO_ME, '2026-10-20T16:45')] }),
    mk('REG-0140', 'Nusa Cloud', 'MPNUSA', 'Company', 'Agreement Drafting', { legal: 'PT Nusa Cloud Integrasi', source: 'Partner link', product: 'Mekari Sign', partnerId: 'P-0012', acq: 'ZAT-20688', ae: 'putri.anggraini@mekari.com', aeFrom: 'link', date: '2026-10-15', submitter: 'Maya Hartono', email: 'maya@nusacloud.co.id', job: 'Partnership Lead', checks: { ...ALL_VALID }, tax: 'PKP',
      web: 'https://nusacloud.co.id', li: 'https://www.linkedin.com/company/nusacloud',
      log: [L('Submitted through the registration form link of P-0012. Created in Registration Request. Zoho acquisition ticket ZAT-20688 created.', 'System', '2026-10-15T09:20'), L('Registration Request → Data Validation', 'Putri Anggraini', '2026-10-15T13:05'), L('Data Validation → Agreement Drafting', 'Putri Anggraini', '2026-10-17T11:30')] }),
    mk('REG-0138', 'Garuda Integrasi', 'MPGARUDA', 'Company', 'Completed', { legal: 'PT Garuda Integrasi Sistem', acq: 'ZAT-20610', ae: 'dimas.ardiansyah@mekari.com', partnerId: 'P-0007', date: '2026-10-02', submitter: 'Andi Kurniawan', email: 'andi@garudaintegrasi.co.id', job: 'Chief Executive Officer', prov: 'DKI Jakarta', city: 'Jakarta Pusat', checks: { ...ALL_VALID }, tax: 'PKP', agreements: [ROW_G1()],
      log: [created('ZAT-20610', 'System', '2026-10-02T08:55'), L('Registration Request → Data Validation', 'Dimas Ardiansyah', '2026-10-02T13:40'), L('Data Validation → Agreement Drafting', BO_ME, '2026-10-03T10:12'), L('Agreement Drafting → Completed. Zoho acquisition ticket updated.', BO_ME, '2026-10-05T14:10')] }),
    mk('REG-0136', 'PT Maju Bersama Teknik', 'MPMAJU', 'Company', 'Rejected', { acq: 'ZAT-20577', ae: 'kevin.halim@mekari.com', date: '2026-09-29', submitter: 'Teguh Santoso', email: 'teguh@majubersama.co.id', job: 'Owner', klik: 'Invalid',
      checks: { legal: 'Invalid', company: 'Valid', market: 'Valid' }, reason: 'The NPWP number does not match the legal name on the uploaded document.', rejectedOn: '2026-10-01',
      log: [created('ZAT-20577', 'System', '2026-09-29T16:20'), L('Registration Request → Data Validation', 'Kevin Halim', '2026-09-30T09:05'), L('Data Validation → Rejected', 'Kevin Halim', '2026-10-01T10:22')] }),
  ]
}

function seedAnns(): BoAnnouncement[] {
  return [
    { id: 'an3', title: 'Learning Center: new Partner Certification track is live', desc: 'Enrol from the Learning Center catalogue. Completion is required for Q1 2027 partner tiering.', content: '<p>The Partner Certification track is now available in the Learning Center.</p><ul><li>Six modules, about 8 hours in total</li><li>Final assessment with a passing score of 80%</li></ul><p>Completion is required for <b>Q1 2027 partner tiering</b>.</p>', postedAt: '2026-10-06T09:00' },
    { id: 'an2', title: 'Leads Management: MEDDPICC fields added to opportunities', desc: 'Opportunity records now include qualification fields. Existing records can be updated from the opportunity detail page.', content: '<p>Opportunity records now include MEDDPICC qualification fields.</p><p>Existing records can be updated from the opportunity detail page.</p>', postedAt: '2026-10-01T14:00' },
    { id: 'an1', title: 'Scheduled maintenance on 12 October', desc: 'All apps will be unavailable from 22:00 to 24:00 WIB.', content: '<p>All Mekari Partner apps will be unavailable on <b>12 October 2026</b> from 22:00 to 24:00 WIB.</p>', postedAt: '2026-09-24T10:00' },
  ]
}

// ═════════════════════════════════════════════════════════════════════════════
// State + persistence
// ═════════════════════════════════════════════════════════════════════════════
const K = {
  tickets: 'bo-tickets', partners: 'bo-partners', masters: 'bo-masters', mas: 'bo-master-agreements', aes: 'bo-account-owners',
  trainers: 'bo-trainers', crs: 'bo-change-requests', anns: 'bo-announcements', session: 'bo-session',
} as const
type Coll = keyof typeof K

function seedState(): BoState {
  return { tickets: seedTickets(), partners: seedPartners(), masters: seedMasters(), mas: seedMas(), aes: seedAes(), trainers: seedTrainers(), crs: seedCrs(), anns: seedAnns(), session: null }
}
/** Saved data from before the source was spelled out ('LP' → 'Landing page'). */
function fixSource<T extends { source: string }>(list: T[] | null): T[] | null {
  return list ? list.map((r) => (r.source === 'LP' ? { ...r, source: 'Landing page' } : r)) : list
}

function loadState(): BoState {
  const s = seedState()
  const m = loadSnapshot<BoMasters>(K.masters)
  const sess = loadSnapshot<BoSession>(K.session)
  return {
    tickets: fixSource(loadSnapshot<BoTicket>(K.tickets)) ?? s.tickets,
    partners: fixSource(loadSnapshot<BoPartner>(K.partners)) ?? s.partners,
    masters: m && m[0] ? m[0] : s.masters,
    mas: loadSnapshot<BoMasterAgreement>(K.mas) ?? s.mas,
    aes: loadSnapshot<BoRosterPerson>(K.aes) ?? s.aes,
    trainers: loadSnapshot<BoRosterPerson>(K.trainers) ?? s.trainers,
    crs: loadSnapshot<BoChangeRequest>(K.crs) ?? s.crs,
    anns: loadSnapshot<BoAnnouncement>(K.anns) ?? s.anns,
    session: sess && sess[0] ? sess[0] : null,
  }
}

/** The whole backoffice database (reactive). Read freely; mutate via actions. */
export const bo = reactive<BoState>(loadState())

/** Persist one or more collections (all when called with no args). */
export function persistBo(...colls: Coll[]): void {
  const list = colls.length ? colls : (Object.keys(K) as Coll[])
  for (const c of list) {
    if (c === 'masters') saveSnapshot(K.masters, [bo.masters])
    else if (c === 'session') saveSnapshot(K.session, bo.session ? [bo.session] : [])
    else saveSnapshot(K[c], bo[c] as unknown[])
  }
}

/** Re-seed in memory (tests). Does NOT touch storage — the UI uses resetDb(). */
export function resetBackoffice(): void {
  Object.assign(bo, seedState())
}

// ═════════════════════════════════════════════════════════════════════════════
// Session (H-01)
// ═════════════════════════════════════════════════════════════════════════════
export const isInternalEmail = (email: string) => (email || '').trim().toLowerCase().endsWith(BO_INTERNAL_DOMAIN)

/** Google SSO (mock): only @mekari.com accounts are accepted. */
export function boLogin(email: string = BO_ME_EMAIL, name: string = BO_ME): BoResult {
  if (!isInternalEmail(email)) return { ok: false, msg: tr('{email} is not a @mekari.com account. Log in with your Mekari Google account.', { email }) }
  bo.session = { name, email: email.trim().toLowerCase() }
  persistBo('session')
  return { ok: true, msg: '' }
}
export function boLogout(): void {
  bo.session = null
  persistBo('session')
}

// ═════════════════════════════════════════════════════════════════════════════
// Lookups
// ═════════════════════════════════════════════════════════════════════════════
export const getTicket = (id: string) => bo.tickets.find((t) => t.id === id)
export const getPartner = (id: string | null | undefined) => (id ? bo.partners.find((p) => p.id === id) : undefined)
export const getMa = (id: string | null | undefined) => (id ? bo.mas.find((m) => m.id === id) : undefined)
export const getCr = (id: string) => bo.crs.find((c) => c.id === id)
export const getAnnouncement = (id: string) => bo.anns.find((a) => a.id === id)
export const partnerName = (p: BoPartner) => p.brand || p.legal
export function aeName(email: string): string { const a = bo.aes.find((x) => x.email === email); return a ? a.name : (email || '—') }
export function trainerName(email: string): string { const a = bo.trainers.find((x) => x.email === email); return a ? a.name : (email || '—') }

export function rowsOf(owner: BoOwner): BoAgreement[] {
  const o = owner.kind === 'ticket' ? getTicket(owner.id) : getPartner(owner.id)
  return o ? o.agreements : []
}
function setRows(owner: BoOwner, rows: BoAgreement[]): void {
  const o = owner.kind === 'ticket' ? getTicket(owner.id) : getPartner(owner.id)
  if (!o) return
  o.agreements = rows
  persistBo(owner.kind === 'ticket' ? 'tickets' : 'partners')
}
/** "REG-0141 · Agreement Drafting" / "P-0004 · Active" style caption for an owner. */
export function ownerLabel(owner: BoOwner): string {
  if (owner.kind === 'ticket') { const t = getTicket(owner.id); return t ? `${t.id} · ${tr(t.stage)}` : owner.id }
  const p = getPartner(owner.id); return p ? `${p.id} · ${tr(p.status)}` : owner.id
}

/** Every known user (seed directory + partner members), keyed by lower-case email. `partner` = owning partner name or null. */
export function allUsersDirectory(): Record<string, Omit<BoPartnerUser, 'role'> & { partner: string | null }> {
  const all: Record<string, Omit<BoPartnerUser, 'role'> & { partner: string | null }> = {}
  BO_SEED_USERS.forEach((u) => { all[u.email] = { ...u, partner: null } })
  bo.partners.forEach((p) => p.users.forEach((u) => { all[u.email] = { email: u.email, name: u.name, job: u.job, phone: u.phone, profession: u.profession, partner: partnerName(p) } }))
  return all
}

// ═════════════════════════════════════════════════════════════════════════════
// Agreements (J-06 / K-07 / L-05)
// ═════════════════════════════════════════════════════════════════════════════
export function agBase(r: Pick<BoAgreement, 'method' | 'doc' | 'file'>): 'PENDING' | 'COMPLETED' {
  if (r.method === 'esign') { const d = BO_DOCS.find((x) => x.id === r.doc); return d && d.signed ? 'COMPLETED' : 'PENDING' }
  return r.file ? 'COMPLETED' : 'PENDING'
}
export function agStatus(r: BoAgreement): DocStatus {
  const b = agBase(r)
  return b === 'COMPLETED' && (r.expired || (!!r.end && r.end < boTodayIso())) ? 'EXPIRED' : b
}
export function agName(r: Pick<BoAgreement, 'method' | 'doc' | 'name'>): string {
  if (r.method === 'esign') { const d = BO_DOCS.find((x) => x.id === r.doc); return d ? d.name : tr('Mekari Sign document not linked yet') }
  return r.name || tr('Untitled document')
}

/** docId → the row it's linked to (and where: ticket/partner id). */
export function linkedDocs(): Record<string, { rowId: string; where: string }> {
  const seen: Record<string, 1> = {}
  const map: Record<string, { rowId: string; where: string }> = {}
  const add = (r: BoAgreement, where: string) => { if (r.method === 'esign' && r.doc && !seen[r.id]) { seen[r.id] = 1; map[r.doc] = { rowId: r.id, where } } }
  bo.tickets.forEach((t) => t.agreements.forEach((r) => add(r, t.id)))
  bo.partners.forEach((p) => p.agreements.forEach((r) => add(r, p.id)))
  return map
}

export type AgRowAction = 'edit' | 'remove' | 'delete' | 'editRemarks' | 'duplicate'
export interface AgDetail { label: string; value: string; href?: string }
export interface AgRowView {
  row: BoAgreement
  name: string
  /** "By E-Sign" / "Manual" */
  meta: string
  status: DocStatus
  details: AgDetail[]
  actions: AgRowAction[]
}

/** True while a ticket's agreements are editable (Agreement Drafting only). */
export function ownerEditable(owner: BoOwner): boolean {
  if (owner.kind === 'partner') return true
  return getTicket(owner.id)?.stage === 'Agreement Drafting'
}

/** Allowed row actions — ticket: Edit/Remove in Agreement Drafting only; partner: PENDING → Edit/Delete, else Edit remarks; + Duplicate. */
export function rowActions(owner: BoOwner, r: BoAgreement): AgRowAction[] {
  if (owner.kind === 'ticket') return ownerEditable(owner) ? ['edit', 'remove'] : []
  const acts: AgRowAction[] = agStatus(r) === 'PENDING' ? ['edit', 'delete'] : ['editRemarks']
  acts.push('duplicate')
  return acts
}

/** Rows of one section, newest start first, with display details + allowed actions. */
export function agreementRowsView(owner: BoOwner, section: AgSection): AgRowView[] {
  const rows = rowsOf(owner)
  return rows.filter((r) => r.section === section).sort((a, b) => (a.start < b.start ? 1 : -1)).map((r) => {
    const ma = getMa(r.ma)
    const rep = r.replaces ? rows.find((x) => x.id === r.replaces) : null
    const det: AgDetail[] = [
      { label: tr('Master agreement'), value: ma ? ma.name + (ma.status !== 'ACTIVE' ? ' · ' + tr(ma.status) : '') : '—' },
      { label: tr('Start date'), value: formatDateLong(r.start) },
      { label: tr('End date'), value: formatDateLong(r.end) },
    ]
    if (r.method === 'esign') {
      if (r.doc) det.push({ label: tr('Mekari Sign document'), value: r.doc }, { label: tr('Document URL'), value: docUrl(r.doc), href: docUrl(r.doc) }, { label: tr('Signing URL'), value: signUrl(r.doc), href: signUrl(r.doc) })
      else det.push({ label: tr('Mekari Sign document'), value: tr('Not linked yet') })
    } else det.push({ label: tr('File'), value: r.file || tr('Not uploaded yet') })
    if (rep) det.push({ label: tr('Replaced agreement'), value: agName(rep) })
    if (r.remarks) det.push({ label: tr('Remarks'), value: r.remarks })
    return { row: r, name: agName(r), meta: r.method === 'esign' ? tr('By E-Sign') : tr('Manual'), status: agStatus(r), details: det, actions: rowActions(owner, r) }
  })
}

/** The working copy edited by BoAgreementModal. */
export interface BoAgDraft {
  owner: BoOwner
  section: AgSection
  /** id of the row being edited (null = add / duplicate) */
  editId: string | null
  method: '' | AgMethod
  ma: string
  doc: string
  name: string
  start: string
  end: string
  remarks: string
  file: string
  replaces: string | null
  /** COMPLETED / EXPIRED partner rows allow only remarks to be edited */
  remarksOnly: boolean
}
export function blankAgDraft(owner: BoOwner, section: AgSection): BoAgDraft {
  return { owner, section, editId: null, method: '', ma: '', doc: '', name: '', start: '', end: '', remarks: '', file: '', replaces: null, remarksOnly: false }
}
export function draftFromRow(owner: BoOwner, r: BoAgreement, remarksOnly = false): BoAgDraft {
  return { owner, section: r.section, editId: r.id, method: r.method, ma: r.ma, doc: r.doc || '', name: r.name, start: r.start, end: r.end, remarks: r.remarks, file: r.file, replaces: r.replaces, remarksOnly }
}
/** Duplicate: same section + method, ACTIVE MA kept, start = old end + 1, replaces the source. */
export function duplicateDraft(owner: BoOwner, r: BoAgreement): BoAgDraft {
  const m = getMa(r.ma)
  return { ...blankAgDraft(owner, r.section), method: r.method, ma: m && m.status === 'ACTIVE' ? r.ma : '', name: r.method === 'manual' ? r.name : '', start: r.end ? addDays(r.end, 1) : '', end: '', replaces: r.id }
}

/** ACTIVE master agreements offered in a section (PRIMARY for pa, OTHERS for other). */
export function maOptionsFor(section: AgSection): { value: string; label: string }[] {
  return bo.mas.filter((m) => m.status === 'ACTIVE' && m.type === (section === 'pa' ? 'PRIMARY' : 'OTHERS')).map((m) => ({ value: m.id, label: m.name }))
}
/** Mekari Sign documents offered for a row — docs linked to ANOTHER row are excluded. */
export function docOptionsFor(editId: string | null, currentDoc = ''): { value: string; label: string }[] {
  const linked = linkedDocs()
  return BO_DOCS.filter((d) => { const l = linked[d.id]; return !l || l.rowId === editId || d.id === currentDoc }).map((d) => ({ value: d.id, label: `${d.id} · ${d.name}` }))
}

export type AgErrKey = 'ma' | 'doc' | 'name' | 'start' | 'end'
export interface AgDraftValidation {
  errors: Partial<Record<AgErrKey | 'file', string>>
  /** Errors that show immediately (not only after a save attempt): MA not ACTIVE, doc taken, overlap, end ≤ start. */
  live: Partial<Record<AgErrKey, true>>
}
/** Validate a draft (file PDF-type errors are the component's job; missing file is checked here). */
export function agreementDraftErrors(a: BoAgDraft): AgDraftValidation {
  const errors: AgDraftValidation['errors'] = {}
  const live: AgDraftValidation['live'] = {}
  if (a.remarksOnly) return { errors, live }
  const isEsign = a.method === 'esign', isManual = a.method === 'manual'
  const ownerRows = rowsOf(a.owner)
  const lk = a.doc ? linkedDocs()[a.doc] : null
  const docTaken = !!lk && lk.rowId !== a.editId
  const opts = maOptionsFor(a.section)
  const maNotActive = !!a.ma && !opts.some((m) => m.value === a.ma)
  const endBad = !!a.start && !!a.end && a.end <= a.start
  const overlap = a.owner.kind === 'partner' && a.section === 'pa' && !a.replaces && a.start && a.end
    ? ownerRows.find((r) => r.section === 'pa' && r.id !== a.editId && !r.replaces && !r.expired && r.start <= a.end && a.start <= r.end) : null
  if (!a.ma) errors.ma = tr('Select a master agreement.')
  else if (maNotActive) { errors.ma = tr('The selected master agreement is not ACTIVE. Select an ACTIVE one.'); live.ma = true }
  if (docTaken) { errors.doc = tr('{doc} is already linked to another document row ({where}).', { doc: a.doc, where: lk!.where }); live.doc = true }
  else if (isEsign && !a.doc) errors.doc = tr('Select a Mekari Sign document.')
  if (isManual && !(a.name || '').trim()) errors.name = tr('Enter a name.')
  if (!a.start) errors.start = tr('Enter a start date.')
  else if (overlap) { errors.start = tr('Overlaps with {name} ({start} – {end}). Partnership Agreement date ranges cannot overlap.', { name: agName(overlap), start: formatDateLong(overlap.start), end: formatDateLong(overlap.end) }); live.start = true }
  if (!a.end) errors.end = tr('Enter an end date.')
  else if (endBad) { errors.end = tr('End date must be later than the start date.'); live.end = true }
  if (isManual && !a.file) errors.file = tr('Upload the signed agreement as a PDF.')
  return { errors, live }
}

/** Status the row would have once saved + the explanatory note (modal footer note). */
export function draftStatusPreview(a: BoAgDraft): { status: DocStatus | ''; note: string } {
  if (!a.method) return { status: '', note: '' }
  const s0 = agBase({ method: a.method, doc: a.doc, file: a.file })
  const status: DocStatus = s0 === 'COMPLETED' && a.end && a.end < boTodayIso() ? 'EXPIRED' : s0
  const note = status === 'EXPIRED' ? tr('The end date has passed.')
    : a.method === 'esign' ? (status === 'COMPLETED' ? tr('Fully signed in Mekari Sign, reported by the webhook.') : tr('PENDING until the Mekari Sign webhook reports the document fully signed.'))
      : (a.file ? tr('COMPLETED on PDF upload.') : tr('Becomes COMPLETED when the PDF is uploaded.'))
  return { status, note }
}

/** Save remarks only (COMPLETED/EXPIRED partner rows; Document Repository remarks). */
export function saveAgreementRemarks(owner: BoOwner, rowId: string, remarks: string): BoResult {
  setRows(owner, rowsOf(owner).map((r) => (r.id === rowId ? { ...r, remarks: (remarks || '').trim() } : r)))
  return { ok: true, msg: tr('Remarks saved') }
}

/** Add / edit / duplicate a row from a draft. Returns errors when invalid. */
export function saveAgreement(a: BoAgDraft): BoResult & { errors?: AgDraftValidation['errors'] } {
  if (a.remarksOnly && a.editId) return saveAgreementRemarks(a.owner, a.editId, a.remarks)
  const { errors } = agreementDraftErrors(a)
  if (!a.method) return { ok: false, msg: tr('Choose a method.'), errors }
  const keys: (keyof AgDraftValidation['errors'])[] = a.method === 'esign' ? ['ma', 'doc', 'start', 'end'] : ['ma', 'name', 'start', 'end', 'file']
  if (keys.some((k) => errors[k])) return { ok: false, msg: '', errors }
  const isEsign = a.method === 'esign'
  const ownerRows = rowsOf(a.owner)
  const row = AG({ id: a.editId || 'ag' + Date.now(), section: a.section, method: a.method, ma: a.ma, doc: isEsign ? a.doc : null, name: isEsign ? '' : a.name.trim(), start: a.start, end: a.end, remarks: (a.remarks || '').trim(), file: isEsign ? '' : a.file, replaces: a.replaces || null })
  let out = a.editId ? ownerRows.map((r) => (r.id === a.editId ? { ...r, ...row } : r)) : [...ownerRows, row]
  let note = ''
  if (row.replaces && agBase(row) === 'COMPLETED') {
    const old = out.find((r) => r.id === row.replaces)
    if (old && !old.expired && boTodayIso() < old.end) {
      out = out.map((r) => (r.id === old.id ? { ...r, end: row.start, expired: true } : r))
      note = ' ' + tr('The replaced document now ends on {date} and is EXPIRED.', { date: formatDateLong(row.start) })
    }
  }
  setRows(a.owner, out)
  const msg = a.editId
    ? tr('Document updated') + (isEsign ? '. ' + tr('The Mekari Sign document is not changed.') : '')
    : tr('Document added. Status: {status}.', { status: agStatus(row) })
  return { ok: true, msg: msg + note }
}

/** Remove (ticket) / Delete (partner PENDING) a row. */
export function removeAgreement(owner: BoOwner, rowId: string): BoResult {
  const row = rowsOf(owner).find((r) => r.id === rowId)
  setRows(owner, rowsOf(owner).filter((r) => r.id !== rowId))
  return { ok: true, msg: tr('Document deleted') + (row?.method === 'esign' ? '. ' + tr('The linked Mekari Sign document is not changed.') : '') }
}

/** Document Repository source: every partner row + rows on Agreement Drafting tickets, newest start first. */
export interface BoDocEntry { key: string; owner: BoOwner; row: BoAgreement; partner: string; partnerSub: string; ao: string; onTicket: boolean }
export function allDocuments(): BoDocEntry[] {
  const out: BoDocEntry[] = []
  bo.partners.forEach((p) => p.agreements.forEach((r) => out.push({ key: `partner:${p.id}:${r.id}`, owner: { kind: 'partner', id: p.id }, row: r, partner: partnerName(p), partnerSub: `${p.id} · ${tr(p.status)}`, ao: aeName(p.ae), onTicket: false })))
  bo.tickets.filter((t) => t.stage === 'Agreement Drafting').forEach((t) => t.agreements.forEach((r) => out.push({ key: `ticket:${t.id}:${r.id}`, owner: { kind: 'ticket', id: t.id }, row: r, partner: t.brand, partnerSub: `${t.id} · ${tr('Agreement Drafting')}`, ao: aeName(t.ae), onTicket: true })))
  return out.sort((x, y) => (x.row.start < y.row.start ? 1 : -1))
}

// ═════════════════════════════════════════════════════════════════════════════
// Registration tickets (J-02 … J-07)
// ═════════════════════════════════════════════════════════════════════════════
export const allValid = (t: BoTicket) => BO_CHECKS.every((k) => t.checks[k] === 'Valid')
export const anyInvalid = (t: BoTicket) => BO_CHECKS.some((k) => t.checks[k] === 'Invalid')

/** Why an Agreement Drafting ticket can't complete yet (empty = ready). */
export function blockers(t: BoTicket): string[] {
  const out: string[] = []
  if (t.agreements.some((r) => { const m = getMa(r.ma); return !m || m.status !== 'ACTIVE' })) out.push(tr('An agreement row uses a master agreement that is not ACTIVE.'))
  if (t.agreements.some((r) => agStatus(r) !== 'COMPLETED')) out.push(tr('Every agreement document must be COMPLETED.'))
  if (!t.agreements.some((r) => r.section === 'pa' && agStatus(r) === 'COMPLETED')) out.push(tr('A COMPLETED Partnership Agreement document is required.'))
  return out
}

/** Can ticket `t` move to `to`? `same` = dropped on its own column (no-op). */
export function checkMove(t: BoTicket, to: TicketStage): { ok: boolean; msg: string; same?: boolean } {
  if (BO_FINAL.includes(t.stage)) return { ok: false, msg: tr('{stage} registrations are locked and cannot move.', { stage: tr(t.stage) }) }
  if (to === t.stage) return { ok: false, msg: '', same: true }
  if (to === 'Rejected') return { ok: true, msg: '' }
  if (t.stage === 'Data Validation' && anyInvalid(t)) return { ok: false, msg: tr('One or more checks are Invalid. Reject is the only action.') }
  const a = BO_SEQ.indexOf(t.stage), b = BO_SEQ.indexOf(to)
  // Forward one stage at a time; back to any stage already passed.
  if (b > a + 1) return { ok: false, msg: tr('Registrations move forward one stage at a time.') }
  if (b > a && to === 'Data Validation' && !t.ae) return { ok: false, msg: tr('Assign an Account Owner before moving to Data Validation.') }
  if (b > a && to === 'Agreement Drafting' && !allValid(t)) return { ok: false, msg: tr('Mark every section as valid before Agreement Drafting.') }
  if (to === 'Completed') { const bl = blockers(t); if (bl.length) return { ok: false, msg: bl[0]! } }
  return { ok: true, msg: '' }
}

/**
 * Attempt a stage move (kanban drop / Back / Move to). Rejected and Completed
 * are NOT applied here — they return `needs` so the page opens the Reject
 * modal (→ rejectTicket) or the Complete confirm (→ completeTicket).
 */
export function moveTicket(id: string, to: TicketStage): { ok: boolean; msg: string; same?: boolean; needs?: 'reject' | 'complete' } {
  const t = getTicket(id)
  if (!t) return { ok: false, msg: tr('Ticket not found.') }
  const c = checkMove(t, to)
  if (c.same) return { ok: false, msg: '', same: true }
  if (!c.ok) return c
  if (to === 'Rejected') return { ok: true, msg: '', needs: 'reject' }
  if (to === 'Completed') return { ok: true, msg: '', needs: 'complete' }
  const from = t.stage
  let msg = tr('Moved to {stage}.', { stage: tr(to) })
  t.stage = to
  delete t.rank
  t.log = [...t.log, L(`${from} → ${to}`, bo.session?.name || BO_ME, boNowIso())]
  persistBo('tickets')
  return { ok: true, msg }
}

/** Persist the order of a board column after a drop: `ids` top → bottom. */
export function setTicketOrder(ids: string[]): void {
  ids.forEach((id, i) => { const t = getTicket(id); if (t) t.rank = i })
  persistBo('tickets')
}

/** Reject a ticket (any non-final stage). Reason is required. */
export function rejectTicket(id: string, reason: string): BoResult {
  const t = getTicket(id)
  if (!t) return { ok: false, msg: tr('Ticket not found.') }
  if (BO_FINAL.includes(t.stage)) return { ok: false, msg: tr('{stage} registrations are locked and cannot move.', { stage: tr(t.stage) }) }
  if (!(reason || '').trim()) return { ok: false, msg: tr('Enter a reason.') }
  const from = t.stage
  t.stage = 'Rejected'
  delete t.rank
  t.reason = reason.trim()
  t.rejectedOn = boTodayIso()
  t.log = [...t.log, L(`${from} → Rejected`, bo.session?.name || BO_ME, boNowIso())]
  persistBo('tickets')
  return { ok: true, msg: tr('Rejected. The reason was emailed to {email}.', { email: t.email }) }
}

/** Lines for the "Move {brand} to Completed?" confirm. */
export function completePreview(id: string): { title: string; lines: string[] } {
  const t = getTicket(id)
  if (!t) return { title: '', lines: [] }
  const p = getPartner(t.partnerId)
  const lines = p
    ? [tr('{id} {legal} switches from Unregistered to Registered, with partner code {code}. The submitted values replace its existing data.', { id: p.id, legal: p.legal, code: t.code }), tr('{name} becomes a member with role admin.', { name: t.submitter })]
    : [tr('A partner is created with status Registered and partner code {code}.', { code: t.code }), tr('{name} becomes its first member, with role admin.', { name: t.submitter })]
  lines.push(tr('The platform calls the Zoho API for acquisition ticket {acq}.', { acq: t.acq }))
  return { title: tr('Move {brand} to Completed?', { brand: t.brand }), lines }
}

const nextPartnerId = () => 'P-' + String(Math.max(0, ...bo.partners.map((p) => parseInt(p.id.slice(2), 10) || 0)) + 1).padStart(4, '0')

/** Complete an Agreement Drafting ticket: creates a Registered partner, or switches its linked Unregistered partner to Registered. */
export function completeTicket(id: string): BoResult & { partnerId?: string } {
  const t = getTicket(id)
  if (!t) return { ok: false, msg: tr('Ticket not found.') }
  const c = checkMove(t, 'Completed')
  if (!c.ok) return { ok: false, msg: c.msg }
  const data: Partial<BoPartner> = {
    entity: t.entity, brand: t.brand, legal: t.legal, code: t.code, prov: t.prov, city: t.city, web: t.web, li: t.li, phone: t.phone, industry: t.industry, product: t.product, impl: t.impl,
    specs: [...t.specs], targets: [...t.targets], segments: [...t.segments], deal: t.deal, idNo: t.idNo, addr: t.addr, bank: t.bank, holder: t.holder || t.legal, acct: t.acct, tax: t.tax, source: t.source, acq: t.acq, ae: t.ae,
  }
  const admin: BoPartnerUser = { email: t.email, name: t.submitter, job: t.job, phone: '', profession: 'Consultant', role: 'admin' }
  let pid = t.partnerId
  let text: string
  const existing = getPartner(pid)
  if (existing) {
    Object.assign(existing, data, { status: 'Registered', origin: 'Registration ' + t.id })
    existing.users = existing.users.some((u) => u.email === t.email) ? existing.users.map((u) => (u.email === t.email ? { ...u, role: 'admin' as const } : u)) : [...existing.users, admin]
    existing.agreements = [...existing.agreements, ...clone(t.agreements).filter((r) => !existing.agreements.some((q) => q.id === r.id))]
    text = tr('{id} switched from Unregistered to Registered, and the submitted values replaced its data. {name} is an admin.', { id: existing.id, name: t.submitter })
  } else {
    pid = nextPartnerId()
    bo.partners.push(P({ id: pid, ...data, status: 'Registered', origin: 'Registration ' + t.id, created: boTodayIso(), users: [admin], agreements: clone(t.agreements) }))
    text = tr('{brand} created as {id}, Registered. {name} is its first member, with role admin.', { brand: t.brand, id: pid, name: t.submitter })
  }
  t.stage = 'Completed'
  delete t.rank
  t.partnerId = pid
  t.log = [...t.log, L('Agreement Drafting → Completed. Zoho acquisition ticket ' + t.acq + ' updated.', bo.session?.name || BO_ME, boNowIso())]
  persistBo('tickets', 'partners')
  return { ok: true, partnerId: pid!, msg: tr('Completed.') + ' ' + text + ' ' + tr('Zoho acquisition ticket {acq} updated.', { acq: t.acq }) }
}

/** Kanban card note + tone (badge status key for ErpStatusBadge, via `type` override). */
export function ticketCardNote(t: BoTicket): { note: string; tone: 'default' | 'warning' | 'danger' | 'success' } {
  const nValid = BO_CHECKS.filter((k) => t.checks[k] === 'Valid').length
  if (t.stage === 'Registration Request' && !t.ae) return { note: tr('Account owner missing'), tone: 'warning' }
  if (t.stage === 'Data Validation') {
    const nInvalid = BO_CHECKS.filter((k) => t.checks[k] === 'Invalid').length
    if (anyInvalid(t)) return { note: tr(nInvalid === 1 ? '1 invalid check' : '{n} invalid checks', { n: nInvalid || 1 }), tone: 'danger' }
    return { note: tr('{n} of {total} checks valid', { n: nValid, total: BO_CHECKS.length }), tone: nValid === BO_CHECKS.length ? 'success' : 'default' }
  }
  if (t.stage === 'Agreement Drafting') { const bl = blockers(t); return bl.length ? { note: tr('Documents incomplete'), tone: 'warning' } : { note: tr('Ready to complete'), tone: 'success' } }
  return { note: '', tone: 'default' }
}

/** Assign the Account Owner (manual pick clears the pre-assignment source). */
export function setTicketAe(id: string, email: string): void {
  const t = getTicket(id); if (!t || BO_FINAL.includes(t.stage)) return
  t.ae = email; t.aeFrom = ''
  persistBo('tickets')
}
/** Set a section check (Data Validation). Identity of a Company is Klikpajak-locked. */
export function setTicketCheck(id: string, key: CheckKey, v: CheckValue): void {
  const t = getTicket(id); if (!t || t.stage !== 'Data Validation') return
  t.checks = { ...t.checks, [key]: v }
  persistBo('tickets')
}
export function setTicketTax(id: string, v: TaxStatus): void {
  const t = getTicket(id); if (!t || BO_FINAL.includes(t.stage)) return
  t.tax = v
  persistBo('tickets')
}

/** Ticket log → ActivityLogModal entries (newest first). */
export function ticketActivityEntries(t: BoTicket): ActivityEntry[] {
  return [...t.log].reverse().map((l) => {
    const arrow = l.text.match(/^([A-Za-z ]+) → ([A-Za-z ]+?)(\.|$)/)
    return arrow
      ? { date: l.at, user: l.by, activity: tr('Stage changed'), details: [{ label: tr('Stage'), value: `${tr(arrow[1]!.trim())} → ${tr(arrow[2]!.trim())}` }] }
      : { date: l.at, user: l.by, activity: tr('Created'), details: [{ label: tr('Note'), value: l.text }] }
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// Partners (K-01 … K-08)
// ═════════════════════════════════════════════════════════════════════════════
export interface BoNewUserDraft { email: string; name: string; job: string; phone: string; profession: string; existing: boolean }
export interface BoPartnerCreateDraft { legal: string; ae: string; country: string; prov: string; city: string; web: string; li: string; users: BoNewUserDraft[] }

/** Field errors for "New partner" (users: one error map per row). */
export function partnerCreateErrors(c: BoPartnerCreateDraft): { fields: Partial<Record<'legal' | 'ae' | 'country' | 'prov' | 'city' | 'web' | 'li', string>>; users: Partial<Record<'email' | 'name' | 'job' | 'profession', string>>[]; hasErrors: boolean } {
  const fields: Partial<Record<'legal' | 'ae' | 'country' | 'prov' | 'city' | 'web' | 'li', string>> = {}
  if (!c.legal.trim()) fields.legal = tr('Enter a legal name.')
  if (!c.ae) fields.ae = tr('Select an Account Owner.')
  if (!c.country) fields.country = tr('Select a country.')
  if (!c.prov) fields.prov = tr('Select a province.')
  if (!c.city) fields.city = tr('Select a city.')
  if (c.web && !validUrl(c.web)) fields.web = tr('Enter a valid URL starting with https://')
  if (c.li && !validUrl(c.li)) fields.li = tr('Enter a valid URL starting with https://')
  const dir = allUsersDirectory()
  const taken = c.users.map((u) => u.email.trim().toLowerCase())
  const users = c.users.map((u) => {
    const e: Partial<Record<'email' | 'name' | 'job' | 'profession', string>> = {}
    const q = u.email.trim().toLowerCase()
    const exact = !u.existing ? dir[q] : null
    if (exact) e.email = exact.partner ? tr('This user belongs to {partner} and cannot be added until they leave it.', { partner: exact.partner }) : tr('This email belongs to an existing user. Select it from the list.')
    else if (q && taken.filter((x) => x === q).length > 1) e.email = tr('This email is already added.')
    else if (!validEmail(u.email)) e.email = tr('Enter a valid email address.')
    if (!u.name.trim()) e.name = tr('Enter a user name.')
    if (!u.job.trim()) e.job = tr('Enter a job title.')
    if (!u.profession) e.profession = tr('Select a profession.')
    return e
  })
  return { fields, users, hasErrors: Object.keys(fields).length > 0 || users.some((e) => Object.keys(e).length > 0) }
}

/** Create a partner manually (status Unregistered; every user is admin). */
export function createPartner(c: BoPartnerCreateDraft): BoResult & { id?: string } {
  if (partnerCreateErrors(c).hasErrors) return { ok: false, msg: '' }
  const id = nextPartnerId()
  const nNew = c.users.filter((u) => !u.existing).length
  bo.partners.push(P({ id, legal: c.legal.trim(), ae: c.ae, country: c.country, prov: c.prov, city: c.city, web: c.web.trim(), li: c.li.trim(), created: boTodayIso(),
    users: c.users.map((u) => ({ email: u.email.trim(), name: u.name.trim(), job: u.job.trim(), phone: u.phone, profession: u.profession, role: 'admin' as const })) }))
  persistBo('partners')
  const tail = nNew ? ' ' + (nNew > 1 ? tr('{n} new users are informed by email and can log in directly.', { n: nNew }) : tr('1 new user is informed by email and can log in directly.')) : ''
  return { ok: true, id, msg: tr('Partner created as Unregistered.') + tail }
}

export interface BoPartnerProfilePatch { ae: string; tech: string; tax: TaxStatus; industry: string; web: string; li: string; impl: boolean }
export function partnerProfileErrors(d: BoPartnerProfilePatch): Partial<Record<'ae' | 'web' | 'li', string>> {
  const e: Partial<Record<'ae' | 'web' | 'li', string>> = {}
  if (!d.ae) e.ae = tr('Select an Account Owner.')
  if (d.web && !validUrl(d.web)) e.web = tr('Enter a valid URL starting with https://')
  if (d.li && !validUrl(d.li)) e.li = tr('Enter a valid URL starting with https://')
  return e
}
/** Save the editable partner-profile fields (K-03). */
export function updatePartnerProfile(id: string, d: BoPartnerProfilePatch): BoResult & { errors?: ReturnType<typeof partnerProfileErrors> } {
  const p = getPartner(id); if (!p) return { ok: false, msg: tr('Partner not found.') }
  const errors = partnerProfileErrors(d)
  if (Object.keys(errors).length) return { ok: false, msg: '', errors }
  Object.assign(p, { ae: d.ae, tech: d.tech, tax: d.tax, industry: d.industry, web: d.web.trim(), li: d.li.trim(), impl: !!d.impl })
  persistBo('partners')
  return { ok: true, msg: tr('Partner profile saved') }
}
/** Activate (Inactive → Active) / Deactivate (Active → Inactive). */
export function setPartnerStatus(id: string, status: BoPartnerStatus): BoResult {
  const p = getPartner(id); if (!p) return { ok: false, msg: tr('Partner not found.') }
  const allowed = (p.status === 'Inactive' && status === 'Active') || (p.status === 'Active' && status === 'Inactive')
  if (!allowed) return { ok: false, msg: tr('{name} cannot change from {from} to {to}.', { name: partnerName(p), from: tr(p.status), to: tr(status) }) }
  p.status = status
  persistBo('partners')
  return { ok: true, msg: tr('{name} is {status}.', { name: partnerName(p), status: tr(status) }) }
}
/** Replace a partner's member list. */
export function setPartnerUsers(id: string, users: BoPartnerUser[]): void {
  const p = getPartner(id); if (!p) return
  p.users = clone(users)
  persistBo('partners')
}
/** The registration (not Rejected) submitted through this partner's link, if any. `open` = still in progress. */
export function linkedRegistration(pid: string): { ticket: BoTicket | undefined; open: BoTicket | undefined } {
  const ticket = bo.tickets.find((t) => t.partnerId === pid && t.stage !== 'Rejected')
  return { ticket, open: ticket && !BO_FINAL.includes(ticket.stage) ? ticket : undefined }
}
/** Pre-filled registration-form link for an Unregistered partner (K-08). */
export function registrationLink(pid: string): { url: string; params: [string, string][] } {
  const p = getPartner(pid)
  if (!p) return { url: '', params: [] }
  const params: [string, string][] = [['partner_id', p.id], ['ae', p.ae], ['legal_name', p.legal], ['country', p.country], ['province', p.prov], ['city', p.city], ['website', p.web], ['linkedin', p.li]]
  const url = 'https://partner.mekari.com/register?' + params.map(([k, v]) => k + '=' + (k === 'ae' ? v : encodeURIComponent(v || ''))).join('&')
  return { url, params }
}

// ═════════════════════════════════════════════════════════════════════════════
// Partner data change requests (L-*)
// ═════════════════════════════════════════════════════════════════════════════
export interface CrRowView { field: CrField; label: string; current: string; requested: string; changed: boolean }
export function crRowsView(cr: BoChangeRequest): CrRowView[] {
  const p = getPartner(cr.pid)
  return BO_CR_FIELDS.map(([k, label]) => {
    const changed = k in cr.changes
    const cur = cr.before && k in cr.before ? cr.before[k] : p ? (p as any)[k] : ''
    return { field: k, label: tr(label), current: showVal(cur), requested: changed ? showVal(cr.changes[k]) : showVal(cur), changed }
  })
}
/** "Approved by Nadia Rahman on 2026-10-15." — returns parts; pages format the date. */
export function crDecidedText(cr: BoChangeRequest): { verb: string; by: string; on: string } {
  const verb = cr.status === 'Approved' ? 'Approved by' : cr.status === 'Rejected' ? 'Rejected by' : cr.status === 'Cancelled' ? 'Cancelled by' : ''
  return { verb: verb ? tr(verb) : '', by: cr.decidedBy, on: cr.decidedOn }
}
export function approveCr(id: string): BoResult {
  const cr = getCr(id); if (!cr) return { ok: false, msg: tr('Change request not found.') }
  if (cr.status !== 'In review') return { ok: false, msg: tr('Only requests in review can be approved.') }
  const p = getPartner(cr.pid)
  if (p) {
    cr.before = Object.fromEntries(Object.keys(cr.changes).map((k) => [k, clone((p as any)[k])]))
    Object.assign(p, clone(cr.changes))
  }
  cr.status = 'Approved'
  cr.decidedBy = bo.session?.name || BO_ME
  cr.decidedOn = boTodayIso()
  persistBo('crs', 'partners')
  return { ok: true, msg: tr('Approved. {name} is updated with the requested values.', { name: p ? partnerName(p) : cr.pid }) }
}
export function rejectCr(id: string, reason: string): BoResult {
  const cr = getCr(id); if (!cr) return { ok: false, msg: tr('Change request not found.') }
  if (cr.status !== 'In review') return { ok: false, msg: tr('Only requests in review can be rejected.') }
  if (!(reason || '').trim()) return { ok: false, msg: tr('Enter a reason.') }
  const p = getPartner(cr.pid)
  cr.before = cr.before || Object.fromEntries(Object.keys(cr.changes).map((k) => [k, p ? clone((p as any)[k]) : '']))
  cr.status = 'Rejected'
  cr.reason = reason.trim()
  cr.decidedBy = bo.session?.name || BO_ME
  cr.decidedOn = boTodayIso()
  persistBo('crs')
  return { ok: true, msg: tr('Rejected. The partner admin is informed by email.') }
}

// ═════════════════════════════════════════════════════════════════════════════
// Announcements
// ═════════════════════════════════════════════════════════════════════════════
export const announcementsSorted = () => [...bo.anns].sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1))
const plain = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
export interface BoAnnouncementDraft { id: string | null; title: string; desc: string; content: string }
export function announcementErrors(d: BoAnnouncementDraft): Partial<Record<'title' | 'desc' | 'content', string>> {
  const e: Partial<Record<'title' | 'desc' | 'content', string>> = {}
  if (!d.title.trim()) e.title = tr('Enter a title.')
  if (!d.desc.trim()) e.desc = tr('Enter a short description.')
  if (!plain(d.content)) e.content = tr('Enter the content.')
  return e
}
export function saveAnnouncement(d: BoAnnouncementDraft): BoResult & { id?: string; errors?: ReturnType<typeof announcementErrors> } {
  const errors = announcementErrors(d)
  if (Object.keys(errors).length) return { ok: false, msg: '', errors }
  const rec = { title: d.title.trim(), desc: d.desc.trim(), content: d.content }
  const ex = d.id ? getAnnouncement(d.id) : undefined
  if (ex) { Object.assign(ex, rec); persistBo('anns'); return { ok: true, id: ex.id, msg: tr('Announcement updated') } }
  const id = 'an' + Date.now()
  bo.anns.unshift({ id, ...rec, postedAt: boNowIso() })
  persistBo('anns')
  return { ok: true, id, msg: tr('Announcement posted') }
}
export function deleteAnnouncement(id: string): BoResult {
  bo.anns = bo.anns.filter((a) => a.id !== id)
  persistBo('anns')
  return { ok: true, msg: tr('Announcement deleted') }
}

// ═════════════════════════════════════════════════════════════════════════════
// Roster (I-10 Partner Account Owners / I-11 Trainers)
// ═════════════════════════════════════════════════════════════════════════════
export const rosterList = (kind: RosterKind) => (kind === 'trainers' ? bo.trainers : bo.aes)
/** idx = position being edited (-1 = new). */
export function rosterErrors(kind: RosterKind, idx: number, rec: BoRosterPerson): Partial<Record<'name' | 'email' | 'products', string>> {
  const e: Partial<Record<'name' | 'email' | 'products', string>> = {}
  const dup = rosterList(kind).some((x, i) => i !== idx && x.email.toLowerCase() === (rec.email || '').trim().toLowerCase())
  if (!rec.name.trim()) e.name = tr('Enter a name.')
  if (!validEmail(rec.email)) e.email = tr('Enter a valid email address.')
  else if (dup) e.email = tr('This email is already in the list.')
  if (!rec.products.length) e.products = tr('Select at least one product.')
  return e
}
export function saveRosterPerson(kind: RosterKind, idx: number, rec: BoRosterPerson): BoResult & { errors?: ReturnType<typeof rosterErrors> } {
  const errors = rosterErrors(kind, idx, rec)
  if (Object.keys(errors).length) return { ok: false, msg: '', errors }
  const clean = { name: rec.name.trim(), email: rec.email.trim(), products: [...rec.products] }
  const list = rosterList(kind)
  if (idx >= 0 && list[idx]) list[idx] = clean
  else list.push(clean)
  persistBo(kind === 'trainers' ? 'trainers' : 'aes')
  return { ok: true, msg: tr('{name} saved', { name: clean.name }) }
}
/** Delete is blocked while the person is assigned (ticket/partner AE, partner Technical PIC). */
export function deleteRosterPerson(kind: RosterKind, idx: number): BoResult {
  const list = rosterList(kind)
  const p = list[idx]; if (!p) return { ok: false, msg: tr('Not found.') }
  const inUse = kind === 'owners'
    ? bo.tickets.some((t) => t.ae === p.email) || bo.partners.some((x) => x.ae === p.email)
    : bo.partners.some((x) => x.tech === p.email)
  if (inUse) return { ok: false, msg: tr('{name} is assigned to a partner or registration and cannot be deleted.', { name: p.name }) }
  list.splice(idx, 1)
  persistBo(kind === 'trainers' ? 'trainers' : 'aes')
  return { ok: true, msg: tr('{name} deleted', { name: p.name }) }
}

// ═════════════════════════════════════════════════════════════════════════════
// Master data (I-02 … I-06)
// ═════════════════════════════════════════════════════════════════════════════
export function masterUsedBy(key: MasterKey, n: string): boolean {
  switch (key) {
    case 'professions': return Object.values(allUsersDirectory()).some((u) => u.profession === n)
    case 'specializations': return bo.tickets.some((t) => t.specs.includes(n)) || bo.partners.some((p) => p.specs.includes(n))
    case 'responsibilities': return bo.masters.roles.some((r) => (r.resp || []).includes(n))
    case 'roles': return bo.mas.some((m) => Object.values(m.products).some((rs) => rs.includes(n)))
    case 'products': return bo.mas.some((m) => !!m.products[n]) || bo.aes.some((x) => x.products.includes(n)) || bo.trainers.some((x) => x.products.includes(n)) || bo.tickets.some((t) => t.product === n)
  }
}
/** Add (idx -1) or edit a master record. */
export function saveMaster(key: MasterKey, idx: number, rec: BoMasterRecord): BoResult & { errors?: { name?: string } } {
  const name = (rec.name || '').trim()
  if (!name) return { ok: false, msg: '', errors: { name: tr('Enter a name.') } }
  if (bo.masters[key].some((r, i) => i !== idx && r.name.toLowerCase() === name.toLowerCase())) return { ok: false, msg: '', errors: { name: tr('This name is already in the list.') } }
  const out: BoMasterRecord = { name }
  if (BO_MASTER_META[key].desc) out.desc = (rec.desc || '').trim()
  if (BO_MASTER_META[key].resp) out.resp = [...(rec.resp || [])]
  const list = bo.masters[key]
  if (idx >= 0 && list[idx]) list[idx] = out
  else list.push(out)
  persistBo('masters')
  return { ok: true, msg: tr('{name} saved', { name }) }
}
export function deleteMaster(key: MasterKey, idx: number): BoResult {
  const r = bo.masters[key][idx]; if (!r) return { ok: false, msg: tr('Not found.') }
  if (masterUsedBy(key, r.name)) return { ok: false, msg: tr('{name} is in use and cannot be deleted.', { name: r.name }) }
  bo.masters[key].splice(idx, 1)
  persistBo('masters')
  return { ok: true, msg: tr('{name} deleted', { name: r.name }) }
}

// ═════════════════════════════════════════════════════════════════════════════
// Master agreements (I-07 … I-09)
// ═════════════════════════════════════════════════════════════════════════════
const allRows = () => [...bo.tickets.flatMap((t) => t.agreements), ...bo.partners.flatMap((p) => p.agreements)]
/** A document row uses it (or the seed says it was used). */
export function maUsed(m: BoMasterAgreement | undefined): boolean {
  return !!m && (m.used || allRows().some((r) => r.ma === m.id && !r.expired))
}
/** Status transitions available from the current one. DEPRECATED is final; ACTIVE → DRAFT only while unused. */
export function maAllowedStatuses(m: BoMasterAgreement): MaStatus[] {
  return ({ DRAFT: ['ACTIVE'], ACTIVE: maUsed(m) ? ['DEPRECATED'] : ['DRAFT', 'DEPRECATED'], DEPRECATED: [] } as Record<MaStatus, MaStatus[]>)[m.status]
}
export interface BoMaDraft { id: string | null; name: string; desc: string; type: MaType; products: Record<string, string[]>; pdf: string }
export function maDraftErrors(d: BoMaDraft): Partial<Record<'name' | 'products' | 'pdf', string>> {
  const e: Partial<Record<'name' | 'products' | 'pdf', string>> = {}
  const keys = Object.keys(d.products || {})
  if (!d.name.trim()) e.name = tr('Enter a name.')
  if (d.type === 'PRIMARY') {
    if (!keys.length) e.products = tr('A PRIMARY master agreement must list at least one product.')
    else if (keys.some((k) => !d.products[k]!.length)) e.products = tr('Tick at least one partner role under each selected product.')
  }
  if (!d.pdf) e.pdf = tr('Upload the master agreement PDF.')
  return e
}
/** Create (status DRAFT) or update. Type is fixed once saved. */
export function saveMa(d: BoMaDraft): BoResult & { id?: string; errors?: ReturnType<typeof maDraftErrors> } {
  const errors = maDraftErrors(d)
  if (Object.keys(errors).length) return { ok: false, msg: '', errors }
  const saved = getMa(d.id)
  const rec: BoMasterAgreement = { id: saved?.id || 'ma' + Date.now(), name: d.name.trim(), desc: (d.desc || '').trim(), type: saved ? saved.type : d.type, status: saved ? saved.status : 'DRAFT', used: saved ? saved.used : false, products: (saved ? saved.type : d.type) === 'PRIMARY' ? clone(d.products) : {}, pdf: d.pdf }
  if (saved) Object.assign(saved, rec)
  else bo.mas.push(rec)
  persistBo('mas')
  return { ok: true, id: rec.id, msg: tr('{name} saved', { name: rec.name }) }
}
/** DRAFT ↔ ACTIVE. DEPRECATED must go through deprecateMa (needs a replacement). */
export function setMaStatus(id: string, status: MaStatus): BoResult {
  const m = getMa(id); if (!m) return { ok: false, msg: tr('Not found.') }
  if (status === 'DEPRECATED') return { ok: false, msg: tr('Deprecating requires an ACTIVE replacement of the same type.') }
  if (!maAllowedStatuses(m).includes(status)) return { ok: false, msg: tr('{from} cannot change to {to}.', { from: m.status, to: status }) }
  m.status = status
  persistBo('mas')
  return { ok: true, msg: tr('Status changed to {status}', { status }) }
}
export function duplicateMa(id: string): BoResult & { id?: string } {
  const m = getMa(id); if (!m) return { ok: false, msg: tr('Not found.') }
  const copy: BoMasterAgreement = { ...clone(m), id: 'ma' + Date.now(), name: tr('Copy of {name}', { name: m.name }), status: 'DRAFT', used: false }
  bo.mas.push(copy)
  persistBo('mas')
  return { ok: true, id: copy.id, msg: tr('Duplicated as DRAFT: {name}', { name: copy.name }) }
}
/** Deprecation impact: non-expired partner docs on it, partners affected, Agreement Drafting tickets using it. */
export function impact(id: string): { docs: { partnerId: string; row: BoAgreement }[]; partners: number; tickets: number } {
  const docs: { partnerId: string; row: BoAgreement }[] = []
  bo.partners.forEach((p) => p.agreements.forEach((r) => { if (r.ma === id && agStatus(r) !== 'EXPIRED') docs.push({ partnerId: p.id, row: r }) }))
  return { docs, partners: new Set(docs.map((x) => x.partnerId)).size, tickets: bo.tickets.filter((t) => t.stage === 'Agreement Drafting' && t.agreements.some((r) => r.ma === id)).length }
}
/** ACTIVE same-type replacements a master agreement can be deprecated onto. */
export const deprecateOptions = (id: string) => { const m = getMa(id); return m ? bo.mas.filter((x) => x.status === 'ACTIVE' && x.type === m.type && x.id !== id) : [] }
/**
 * Deprecate `id` onto replacement `repl` and run the re-agreement batch: one new
 * PENDING row on the replacement per non-expired partner row (same section,
 * start = old end + 1, same duration, Replaced Agreement = old row).
 */
export function deprecateMa(id: string, repl: string): BoResult & { created?: number } {
  const m = getMa(id)
  if (!m) return { ok: false, msg: tr('Not found.') }
  if (m.status !== 'ACTIVE') return { ok: false, msg: tr('Only an ACTIVE master agreement can be deprecated.') }
  if (!deprecateOptions(id).some((x) => x.id === repl)) return { ok: false, msg: tr('Select an ACTIVE replacement of the same type.') }
  const imp = impact(id)
  let n = 0
  const base = Date.now()
  for (const p of bo.partners) {
    const add = p.agreements.filter((r) => r.ma === id && agStatus(r) !== 'EXPIRED').map((r) => AG({
      id: `ag-b${base}-${n++}`, section: r.section, method: r.method, ma: repl, doc: r.method === 'esign' ? '' : null,
      name: r.method === 'manual' ? r.name : '', start: addDays(r.end, 1), end: addDays(r.end, 1 + dayDiff(r.start, r.end)), replaces: r.id,
    }))
    if (add.length) p.agreements = [...p.agreements, ...add]
  }
  m.status = 'DEPRECATED'
  persistBo('partners', 'mas')
  const tail = imp.tickets ? ' ' + (imp.tickets === 1 ? tr('1 Agreement Drafting ticket needs its rows switched to an ACTIVE master agreement.') : tr('{n} Agreement Drafting tickets need their rows switched to an ACTIVE master agreement.', { n: imp.tickets })) : ''
  return { ok: true, created: n, msg: (n === 1 ? tr('DEPRECATED. The re-agreement batch created 1 PENDING document on the replacement.') : tr('DEPRECATED. The re-agreement batch created {n} PENDING documents on the replacement.', { n })) + tail }
}

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard (J-01)
// ═════════════════════════════════════════════════════════════════════════════
export interface BoDashboardCounts {
  ticketsByStage: Record<TicketStage, number>
  openTickets: number
  /** Registration Request without an Account Owner */
  needsOwner: number
  /** Data Validation with an Invalid check */
  invalidChecks: number
  /** Agreement Drafting tickets ready to complete */
  readyToComplete: number
  partnersByStatus: Record<BoPartnerStatus, number>
  partners: number
  crInReview: number
  docsPending: number
  /** COMPLETED docs ending within 30 days */
  docsExpiringSoon: number
  docsExpired: number
  activeMas: number
  draftMas: number
  announcements: number
  latestAnnouncement: BoAnnouncement | undefined
  accountOwners: number
  trainers: number
}
export function dashboardCounts(): BoDashboardCounts {
  const ticketsByStage = Object.fromEntries(BO_STAGES.map((s) => [s, bo.tickets.filter((t) => t.stage === s).length])) as Record<TicketStage, number>
  const partnersByStatus = Object.fromEntries((['Unregistered', 'Registered', 'Active', 'Inactive'] as BoPartnerStatus[]).map((s) => [s, bo.partners.filter((p) => p.status === s).length])) as Record<BoPartnerStatus, number>
  const docs = allDocuments()
  const today = boTodayIso(), soon = addDays(today, 30)
  return {
    ticketsByStage,
    openTickets: bo.tickets.filter((t) => !BO_FINAL.includes(t.stage)).length,
    needsOwner: bo.tickets.filter((t) => t.stage === 'Registration Request' && !t.ae).length,
    invalidChecks: bo.tickets.filter((t) => t.stage === 'Data Validation' && anyInvalid(t)).length,
    readyToComplete: bo.tickets.filter((t) => t.stage === 'Agreement Drafting' && !blockers(t).length).length,
    partnersByStatus,
    partners: bo.partners.length,
    crInReview: bo.crs.filter((c) => c.status === 'In review').length,
    docsPending: docs.filter((d) => agStatus(d.row) === 'PENDING').length,
    docsExpiringSoon: docs.filter((d) => agStatus(d.row) === 'COMPLETED' && d.row.end >= today && d.row.end <= soon).length,
    docsExpired: docs.filter((d) => agStatus(d.row) === 'EXPIRED').length,
    activeMas: bo.mas.filter((m) => m.status === 'ACTIVE').length,
    draftMas: bo.mas.filter((m) => m.status === 'DRAFT').length,
    announcements: bo.anns.length,
    latestAnnouncement: announcementsSorted()[0],
    accountOwners: bo.aes.length,
    trainers: bo.trainers.length,
  }
}
