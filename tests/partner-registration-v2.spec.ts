/**
 * Partner registration v2 — data model.
 *
 * Load-bearing:
 *  1. Old drafts (with the removed phone / bank / canImplement fields) must load
 *     cleanly into the new shape, so a returning user doesn't crash or carry dead data.
 *  2. The partner-code suggestion follows the code rules (letters/digits,
 *     upper-case, ≤ 8 chars after MP) and drops a leading PT / CV.
 */
import { describe, it, expect } from 'vitest'
import {
  emptyPartnerRegData, normalizePartnerRegData, suggestCode, idTypeFor, formatFileSize,
  CODE_MAX_USER_CHARS, LEGAL_ID_DIGITS,
} from '~/data/partnerReg'

describe('partner registration v2 — draft normalisation', () => {
  it('drops removed fields from an old draft and keeps known ones', () => {
    const old = {
      step: 2, entity: 'company', brand: 'Acme', phone: '812', phoneDial: 'id',
      bank: 'BCA', holder: 'X', account: '123', canImplement: true, product: 'Jurnal',
    }
    const d = normalizePartnerRegData(old as never) as unknown as Record<string, unknown>
    for (const k of ['phone', 'phoneDial', 'bank', 'holder', 'account', 'canImplement']) expect(d).not.toHaveProperty(k)
    expect(d.brand).toBe('Acme')
    expect(d.entity).toBe('company')
    expect(d.product).toBe('Jurnal')
    // New fields get their defaults.
    expect(d.sameLocation).toBe(true)
    expect(d.agreed).toBe(false)
    expect(d.legalCountry).toBe('Indonesia')
  })

  it('resets an out-of-range step to 1', () => {
    expect(normalizePartnerRegData({ step: 9 } as never).step).toBe(1)
    expect(normalizePartnerRegData({ step: 4 } as never).step).toBe(4)
  })

  it('empty data has every step-field blank and no bank/phone fields', () => {
    const e = emptyPartnerRegData() as unknown as Record<string, unknown>
    expect(e).not.toHaveProperty('bank')
    expect(e).not.toHaveProperty('phone')
    expect(e.step).toBe(1)
  })
})

describe('partner registration v2 — partner code + legal ID', () => {
  it('suggests an upper-case alphanumeric code without PT/CV, capped', () => {
    expect(suggestCode('PT Maju Bersama')).toBe('MAJUBERS')
    expect(suggestCode('cv. kopi-senja')).toBe('KOPISENJ')
    expect(suggestCode('Ab 1')).toBe('AB1')
    expect(suggestCode('Supercalifragilistic').length).toBe(CODE_MAX_USER_CHARS)
  })

  it('maps entity type to the legal document', () => {
    expect(idTypeFor('individual')).toBe('KTP')
    expect(idTypeFor('company')).toBe('NPWP')
    expect(idTypeFor('')).toBe('')
    expect(LEGAL_ID_DIGITS).toBe(16)
  })
})

describe('partner registration v2 — upload row', () => {
  it('formats the uploaded file size shown instead of "Uploaded"', () => {
    expect(formatFileSize(0)).toBe('')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(840 * 1024)).toBe('840 KB')
    expect(formatFileSize(1.4 * 1024 * 1024)).toBe('1.4 MB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB')
  })
})

import { buildPartnerRegReview } from '~/data/partnerRegReview'

describe('partner registration v2 — tax status (companies only)', () => {
  const id = (s: string) => s
  const legalLabels = (data: ReturnType<typeof emptyPartnerRegData>) =>
    buildPartnerRegReview(data, id).find((s) => s.title === 'Legal information')!.rows.map((r) => r.label)

  it('shows Tax status in the Legal review for a company', () => {
    const d = { ...emptyPartnerRegData(), entity: 'company' as const, taxStatus: 'PKP' as const }
    const legal = buildPartnerRegReview(d, id).find((s) => s.title === 'Legal information')!
    expect(legalLabels(d)).toContain('Tax status')
    expect(legal.rows.find((r) => r.label === 'Tax status')!.value).toBe('PKP')
  })

  it('omits Tax status for an individual', () => {
    const d = { ...emptyPartnerRegData(), entity: 'individual' as const }
    expect(legalLabels(d)).not.toContain('Tax status')
  })
})

import { GEO } from '~/data/partnerReg'

describe('location options', () => {
  it('lists all 38 Indonesian provinces, each with at least one city', () => {
    const provinces = Object.keys(GEO.Indonesia!)
    expect(provinces).toHaveLength(38)
    for (const p of ['Aceh', 'Papua Pegunungan', 'Kalimantan Utara', 'DI Yogyakarta', 'Jawa Barat']) expect(provinces).toContain(p)
    for (const p of provinces) expect(GEO.Indonesia![p]!.length).toBeGreaterThan(0)
  })
})
