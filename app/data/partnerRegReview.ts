/**
 * Builds the read-only "review" summary of a submitted partner registration —
 * the same sections shown on the registration wizard's Step 4, reused by the
 * Home "preview registration" drawer. Pure (data + t in, sections out) so both
 * surfaces stay identical.
 */
import type { PartnerRegData } from './partnerReg'

export interface ReviewRow {
  label: string
  value: string
}
export interface ReviewSection {
  title: string
  rows: ReviewRow[]
}

export function buildPartnerRegReview(data: PartnerRegData, t: (s: string) => string): ReviewSection[] {
  const isCompany = data.entity === 'company'
  const legalLocation = [data.legalCity, data.legalProvince, data.legalCountry].filter(Boolean).join(', ')
  const loc = data.sameLocation
    ? legalLocation
    : [data.city, data.province, data.country].filter(Boolean).join(', ')
  const list = (a: string[]) => a.map((x) => t(x)).join(', ')
  return [
    {
      title: t('Legal information'),
      rows: [
        { label: t('Register as'), value: data.entity ? t(isCompany ? 'Company' : 'Individual') : '' },
        { label: isCompany ? t('Legal company name') : t('Full name as on KTP'), value: data.legalName },
        { label: isCompany ? t('Company NPWP') : t('NIK'), value: data.idNumber },
        ...(isCompany ? [{ label: t('Tax status'), value: data.taxStatus }] : []),
        { label: isCompany ? t('Company NPWP file') : t('KTP file'), value: data.idFileName },
        { label: isCompany ? t('Address as on NPWP') : t('Address as on KTP'), value: [data.legalAddress, legalLocation].filter(Boolean).join(', ') },
      ],
    },
    {
      title: t('Business profile'),
      rows: [
        { label: t('Business name'), value: data.brand || data.legalName },
        { label: t('Partner code'), value: data.code ? `MP${data.code}` : '' },
        { label: t('Operating location'), value: loc },
        { label: t('Website URL'), value: data.website },
        { label: t('LinkedIn URL'), value: data.linkedin },
        { label: isCompany ? t('Company industry') : t('Your industry'), value: data.industry },
      ],
    },
    {
      title: t('Market and expertise'),
      rows: [
        { label: t('Product'), value: data.product },
        { label: t('Your specialization'), value: list(data.specs) },
        { label: t('Industries you want to sell to'), value: list(data.targets) },
        { label: t('Target company size'), value: list(data.segments) },
        { label: t('Average project value'), value: data.deal },
      ],
    },
  ]
}
