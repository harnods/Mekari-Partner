/**
 * Static option data + types for the Partner registration wizard
 * (app/pages/partner-registration). Ported from the Mekari Partner v2 design
 * spec (E-01 … E-04). Option labels are plain strings rendered as-is — mostly
 * product names and domain terms; the structural labels/captions go through t().
 */

export type EntityType = 'individual' | 'company'

/** VAT registration status of a company partner (step 1, companies only).
 *  PKP = Pengusaha Kena Pajak (registered for VAT); Non-PKP = not registered. */
export type TaxStatus = '' | 'PKP' | 'Non-PKP'
export const TAX_STATUSES: Exclude<TaxStatus, ''>[] = ['PKP', 'Non-PKP']

export interface DialCode {
  value: string
  label: string
}

/** Country dial codes for the phone prefix select. */
export const DIAL_CODES: DialCode[] = [
  { value: 'id', label: '🇮🇩 +62' },
  { value: 'my', label: '🇲🇾 +60' },
  { value: 'sg', label: '🇸🇬 +65' },
  { value: 'ph', label: '🇵🇭 +63' },
  { value: 'th', label: '🇹🇭 +66' },
  { value: 'vn', label: '🇻🇳 +84' },
  { value: 'au', label: '🇦🇺 +61' },
  { value: 'us', label: '🇺🇸 +1' },
]

/** Mekari products a partner wants to sell and implement (step 3). */
export const PRODUCTS = ['Talenta', 'Jurnal', 'Klikpajak', 'Expense', 'Qontak', 'Mekari Sign', 'Officeless']

/** Specialization options (step 3 — select all that apply). */
export const SPECS = [
  'HR and payroll',
  'Accounting and finance',
  'Tax',
  'Sales and CRM',
  'Omnichannel customer service',
  'Digital signature and documents',
]

/** Target industries (step 3 — up to 3). */
export const TARGETS = [
  'Manufacturing',
  'Retail',
  'Financial services',
  'Healthcare',
  'Education',
  'Logistics',
  'Hospitality',
  'Professional services',
  'Public sector',
]

/** Target company size (step 3 — up to 2). */
export const SEGMENTS = [
  'Micro (0–50 employees)',
  'Small (51–100 employees)',
  'Medium (101–300 employees)',
  'Large (301–700 employees)',
  'Enterprises (>700 employees)',
]

/** Average project value ranges, IDR (step 3 — pick one). */
export const DEALS = ['0–50 mio', '51–250 mio', '251 mio–1 bio', '>1 bio']

/** Location options. Indonesia: all 38 provinces (BPS order), each with its
 *  cities (kota) — or the main regency seat where a province has no kota. */
export const GEO: Record<string, Record<string, string[]>> = {
  Indonesia: {
    'Aceh': ['Banda Aceh', 'Langsa', 'Lhokseumawe', 'Sabang', 'Subulussalam'],
    'Sumatera Utara': ['Medan', 'Binjai', 'Gunungsitoli', 'Padangsidimpuan', 'Pematangsiantar', 'Sibolga', 'Tanjungbalai', 'Tebing Tinggi'],
    'Sumatera Barat': ['Padang', 'Bukittinggi', 'Padang Panjang', 'Pariaman', 'Payakumbuh', 'Sawahlunto', 'Solok'],
    'Riau': ['Pekanbaru', 'Dumai'],
    'Jambi': ['Jambi', 'Sungai Penuh'],
    'Sumatera Selatan': ['Palembang', 'Lubuklinggau', 'Pagar Alam', 'Prabumulih'],
    'Bengkulu': ['Bengkulu'],
    'Lampung': ['Bandar Lampung', 'Metro'],
    'Kepulauan Bangka Belitung': ['Pangkalpinang'],
    'Kepulauan Riau': ['Batam', 'Tanjungpinang'],
    'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Kepulauan Seribu'],
    'Jawa Barat': ['Bandung', 'Banjar', 'Bekasi', 'Bogor', 'Cimahi', 'Cirebon', 'Depok', 'Sukabumi', 'Tasikmalaya'],
    'Jawa Tengah': ['Semarang', 'Magelang', 'Pekalongan', 'Salatiga', 'Surakarta', 'Tegal'],
    'DI Yogyakarta': ['Yogyakarta', 'Bantul', 'Sleman'],
    'Jawa Timur': ['Surabaya', 'Batu', 'Blitar', 'Kediri', 'Madiun', 'Malang', 'Mojokerto', 'Pasuruan', 'Probolinggo', 'Sidoarjo'],
    'Banten': ['Tangerang', 'Tangerang Selatan', 'Cilegon', 'Serang'],
    'Bali': ['Denpasar', 'Badung', 'Gianyar'],
    'Nusa Tenggara Barat': ['Mataram', 'Bima'],
    'Nusa Tenggara Timur': ['Kupang'],
    'Kalimantan Barat': ['Pontianak', 'Singkawang'],
    'Kalimantan Tengah': ['Palangka Raya'],
    'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru'],
    'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang'],
    'Kalimantan Utara': ['Tarakan', 'Tanjung Selor'],
    'Sulawesi Utara': ['Manado', 'Bitung', 'Kotamobagu', 'Tomohon'],
    'Sulawesi Tengah': ['Palu'],
    'Sulawesi Selatan': ['Makassar', 'Palopo', 'Parepare'],
    'Sulawesi Tenggara': ['Kendari', 'Baubau'],
    'Gorontalo': ['Gorontalo'],
    'Sulawesi Barat': ['Mamuju'],
    'Maluku': ['Ambon', 'Tual'],
    'Maluku Utara': ['Ternate', 'Sofifi', 'Tidore Kepulauan'],
    'Papua Barat': ['Manokwari'],
    'Papua Barat Daya': ['Sorong'],
    'Papua': ['Jayapura'],
    'Papua Selatan': ['Merauke'],
    'Papua Tengah': ['Nabire'],
    'Papua Pegunungan': ['Wamena'],
  },
}

export const COUNTRIES = Object.keys(GEO)

/** Max selections enforced in step 3. */
export const MAX_TARGETS = 3
export const MAX_SEGMENTS = 2

/** The limits on the partner code field (step 2): starts with MP, letters and
 *  digits only, 10 chars max including MP → 8 user chars. */
export const CODE_MAX_USER_CHARS = 8

/** The accepted ID file types / size (step 1). */
export const ID_FILE_ACCEPT = '.pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png'
export const ID_FILE_MAX_MB = 4

/** NIK (KTP) and the new-format NPWP are both 16 digits. */
export const LEGAL_ID_DIGITS = 16

/** Everything the wizard collects. Persisted as the draft and the submission.
 *
 *  Steps: 1 Legal information · 2 Business profile · 3 Market and expertise ·
 *  4 Review and submit. Account data (name, email, phone, company, job
 *  position, role) is NOT asked again — it comes from sign-up (useProfile). */
export interface PartnerRegData {
  step: number
  // Step 1 — Legal information (KTP for an individual, NPWP for a company)
  entity: EntityType | ''
  legalName: string
  idNumber: string
  idFileName: string
  /** Size of the uploaded ID file, bytes (shown in the upload row). */
  idFileSize: number
  /** VAT registration status — companies only (blank for an individual). */
  taxStatus: TaxStatus
  legalCountry: string
  legalProvince: string
  legalCity: string
  legalAddress: string
  // Step 2 — Business profile
  brand: string
  code: string
  /** Operating location is the same as the legal address. */
  sameLocation: boolean
  country: string
  province: string
  city: string
  website: string
  linkedin: string
  industry: string
  // Step 3 — Market and expertise
  /** The single Mekari product the partner wants to sell and implement. */
  product: string
  specs: string[]
  targets: string[]
  segments: string[]
  deal: string
  // Step 4 — Review and submit
  agreed: boolean
}

export function emptyPartnerRegData(): PartnerRegData {
  return {
    step: 1,
    entity: '',
    legalName: '',
    idNumber: '',
    idFileName: '',
    idFileSize: 0,
    taxStatus: '',
    legalCountry: 'Indonesia',
    legalProvince: '',
    legalCity: '',
    legalAddress: '',
    brand: '',
    code: '',
    sameLocation: true,
    country: 'Indonesia',
    province: '',
    city: '',
    website: '',
    linkedin: '',
    industry: '',
    product: '',
    specs: [],
    targets: [],
    segments: [],
    deal: '',
    agreed: false,
  }
}

/** The ID document required depends on the entity type. */
export function idTypeFor(entity: EntityType | ''): string {
  if (entity === 'individual') return 'KTP'
  if (entity === 'company') return 'NPWP'
  return ''
}

/** Human-readable file size, e.g. 820 KB / 1.4 MB. */
export function formatFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

/** Suggest a partner code from the business name: letters/digits, upper-case,
 *  capped at the user-typed length (the MP prefix is fixed). */
export function suggestCode(name: string): string {
  return name.replace(/^(PT|CV)\.?\s+/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_MAX_USER_CHARS)
}

/** Keep only the fields the current model knows, so an older draft (with the
 *  removed phone / bank fields) loads cleanly. */
export function normalizePartnerRegData(raw: Partial<PartnerRegData> & Record<string, unknown>): PartnerRegData {
  const base = emptyPartnerRegData()
  const out = { ...base } as Record<string, unknown>
  for (const k of Object.keys(base)) if (k in raw && raw[k] !== undefined) out[k] = raw[k]
  const d = out as unknown as PartnerRegData
  if (!(d.step >= 1 && d.step <= 4)) d.step = 1
  return d
}
