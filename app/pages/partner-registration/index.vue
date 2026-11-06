<template>
  <div class="preg">
    <PartnerTopBar />

    <main class="preg__main">
      <!-- ───────────────── Success ───────────────── -->
      <div v-if="submitted" class="preg__done">
        <span class="preg__done-icon"><MpIcon name="done" variant="fill" size="48px" color="icon.success" data-devchange="preg-done-icon" /></span>
        <h1 class="preg__done-title">{{ t('Registration submitted') }}</h1>
        <p class="preg__done-text">{{ t('Your registration is submitted. The Mekari team will reach out about the next steps.') }}</p>
        <MpButton variant="primary" is-rounded @click="continueHome">{{ t('Continue to Home') }}</MpButton>
      </div>

      <!-- ───────────────── Wizard ───────────────── -->
      <div v-else class="preg__grid" data-devchange="preg-form-v2">
        <!-- Left: step nav + account summary (from sign-up, read-only) -->
        <aside class="preg__nav">
          <span class="preg__overline">{{ t('MEKARI PARTNER NETWORK') }}</span>
          <h1 class="preg__title">{{ t('Partner registration') }}</h1>
          <p class="preg__lead">{{ t('Sell and implement Mekari products for your clients. Four steps — you can save a draft and continue later.') }}</p>
          <ol class="preg__steps">
            <li v-for="(label, i) in stepLabels" :key="i">
              <button
                type="button"
                class="preg__step"
                :class="{ 'is-current': data.step === i + 1, 'is-done': data.step > i + 1 }"
                :disabled="i + 1 > data.step"
                @click="goStep(i + 1)"
              >
                <span class="preg__dot">{{ data.step > i + 1 ? '✓' : i + 1 }}</span>
                <span>{{ label }}</span>
              </button>
            </li>
          </ol>

          <div class="preg__account">
            <span class="preg__account-title">{{ t('Your account') }}</span>
            <p class="preg__account-hint">{{ t('From your Mekari account sign-up. No need to fill these in again.') }}</p>
            <ContentList :label="t('Full name')" :value="profile.fullName" />
            <ContentList :label="t('Email')" :value="profile.email || auth.user.value?.email" />
            <ContentList :label="t('Phone number')" :value="phoneDisplay" />
            <ContentList :label="t('Company')" :value="profile.company" />
            <ContentList :label="t('Job position')" :value="profile.jobPosition" />
            <ContentList :label="t('Role')" :value="roleDisplay" />
          </div>
        </aside>

        <!-- Right: form card -->
        <form class="preg__card" @submit.prevent="data.step === 4 ? onSubmit() : onNext()">
          <div class="preg__head">
            <span class="preg__overline">{{ t('STEP') }} {{ data.step }} {{ t('OF') }} 4</span>
            <h2 class="preg__step-title">{{ stepLabels[data.step - 1] }}</h2>
          </div>

          <!-- ── Step 1 — Legal information ── -->
          <section v-if="data.step === 1" class="preg__form">
            <MpFormControl is-required id="preg-entity" :is-invalid="err.entity">
              <MpFormLabel>{{ t('Register as') }}</MpFormLabel>
              <div class="preg__types">
                <label class="preg__type" :class="{ 'is-on': data.entity === 'individual' }">
                  <MpRadio id="preg-ent-ind" name="preg-entity" :is-checked="data.entity === 'individual'" @change="setEntity('individual')" />
                  <span class="preg__type-text">
                    <span class="preg__type-title">{{ t('Individual') }}</span>
                    <span class="preg__type-desc">{{ t('Independent consultant or practitioner') }}</span>
                  </span>
                </label>
                <label class="preg__type" :class="{ 'is-on': data.entity === 'company' }">
                  <MpRadio id="preg-ent-co" name="preg-entity" :is-checked="data.entity === 'company'" @change="setEntity('company')" />
                  <span class="preg__type-text">
                    <span class="preg__type-title">{{ t('Company') }}</span>
                    <span class="preg__type-desc">{{ t('Consulting firm, agency, or system integrator') }}</span>
                  </span>
                </label>
              </div>
              <MpFormErrorMessage>{{ t('You must select partner type') }}</MpFormErrorMessage>
            </MpFormControl>

            <template v-if="data.entity">
              <MpFormControl is-required id="preg-legalname" :is-invalid="err.legalName">
                <MpFormLabel>{{ isCompany ? t('Legal company name') : t('Full name as on KTP') }}</MpFormLabel>
                <MpInput v-model="data.legalName" @input="err.legalName = false" />
                <MpFormHelpText>{{ isCompany ? t('As registered on the company NPWP.') : t('As written on your KTP.') }}</MpFormHelpText>
                <MpFormErrorMessage>{{ isCompany ? t('You must fill in legal company name') : t('You must fill in full name') }}</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl is-required id="preg-idnum" :is-invalid="err.idNumber">
                <MpFormLabel>{{ isCompany ? t('Company NPWP') : t('NIK') }}</MpFormLabel>
                <MpInput :model-value="data.idNumber" inputmode="numeric" @input="onIdNumber" />
                <MpFormHelpText>{{ isCompany ? t('16-digit NPWP number.') : t('16-digit number on your KTP.') }}</MpFormHelpText>
                <MpFormErrorMessage>{{ idNumberError }}</MpFormErrorMessage>
              </MpFormControl>

              <!-- Tax status — companies only (PKP = registered for VAT). -->
              <MpFormControl v-if="isCompany" is-required id="preg-tax" :is-invalid="err.taxStatus" data-devchange="preg-tax-status">
                <MpFormLabel>{{ t('Tax status') }}</MpFormLabel>
                <div class="preg__radiorow">
                  <MpRadio v-for="opt in TAX_STATUSES" :key="opt" :id="`tax-${opt}`" name="preg-tax" :is-checked="data.taxStatus === opt" @change="data.taxStatus = opt; err.taxStatus = false">{{ opt }}</MpRadio>
                </div>
                <MpFormHelpText>{{ t('Choose PKP if your company is registered for VAT (Pengusaha Kena Pajak).') }}</MpFormHelpText>
                <MpFormErrorMessage>{{ t('You must select tax status') }}</MpFormErrorMessage>
              </MpFormControl>

              <MpFormControl is-required id="preg-idfile" class="preg__half" :is-invalid="err.idFile || fileErr">
                <MpFormLabel>{{ isCompany ? t('Company NPWP file') : t('KTP file') }}</MpFormLabel>
                <MpUpload id="preg-idfile-up" :accept="ID_FILE_ACCEPT" is-full-width is-reset-on-change :is-invalid="err.idFile || fileErr" :button-text="t('Choose file')" :placeholder="t('or drag and drop here')" @change="pickFile" />
                <MpUploadList v-if="data.idFileName" id="preg-idfile-item" :title="data.idFileName" status="success" :subtitle="formatFileSize(data.idFileSize)" :icon-name="fileIcon(data.idFileName)" :is-show-download-button="false" is-show-remove-button @remove="data.idFileName = ''; data.idFileSize = 0" />
                <MpFormHelpText>{{ t('PDF, JPG, or PNG, max 4 MB. Only used to verify your registration.') }}</MpFormHelpText>
                <MpFormErrorMessage>{{ fileErr ? t('File must be in PDF, JPEG, JPG, or PNG with a maximum of 4 MB.') : (isCompany ? t('You must upload company NPWP') : t('You must upload KTP')) }}</MpFormErrorMessage>
              </MpFormControl>

              <div class="preg__subhead">{{ isCompany ? t('Address as on NPWP') : t('Address as on KTP') }}</div>

              <MpFormControl is-required id="preg-lcountry" class="preg__half" :is-invalid="err.legalCountry">
                <MpFormLabel>{{ t('Country') }}</MpFormLabel>
                <MpAutocomplete id="preg-lcountry-ac" v-model="data.legalCountry" :data="countryOptions" label-prop="label" value-prop="value" :placeholder="t('Select country')" is-searchable use-portal is-full-width :is-invalid="err.legalCountry" @update:model-value="onLegalCountry" />
                <MpFormErrorMessage>{{ t('You must select country') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl is-required id="preg-lprovince" class="preg__half" :is-invalid="err.legalProvince">
                <MpFormLabel>{{ t('Province') }}</MpFormLabel>
                <MpAutocomplete id="preg-lprovince-ac" v-model="data.legalProvince" :data="provinceOptionsFor(data.legalCountry)" label-prop="label" value-prop="value" :placeholder="t('Select province')" is-searchable use-portal is-full-width :is-disabled="!data.legalCountry" :is-invalid="err.legalProvince" @update:model-value="onLegalProvince" />
                <MpFormErrorMessage>{{ t('You must select province') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl is-required id="preg-lcity" class="preg__half" :is-invalid="err.legalCity">
                <MpFormLabel>{{ t('City') }}</MpFormLabel>
                <MpAutocomplete id="preg-lcity-ac" v-model="data.legalCity" :data="cityOptionsFor(data.legalCountry, data.legalProvince)" label-prop="label" value-prop="value" :placeholder="t('Select city')" is-searchable use-portal is-full-width :is-disabled="!data.legalProvince" :is-invalid="err.legalCity" @update:model-value="err.legalCity = false" />
                <MpFormErrorMessage>{{ t('You must select city') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl is-required id="preg-laddr" :is-invalid="err.legalAddress">
                <MpFormLabel>{{ t('Street address') }}</MpFormLabel>
                <MpTextarea v-model="data.legalAddress" @input="err.legalAddress = false" />
                <MpFormHelpText>{{ isCompany ? t('Street, building, and number, as on the NPWP.') : t('Street, RT/RW, village, and district, as on the KTP.') }}</MpFormHelpText>
                <MpFormErrorMessage>{{ t('You must fill in street address') }}</MpFormErrorMessage>
              </MpFormControl>
            </template>
          </section>

          <!-- ── Step 2 — Business profile ── -->
          <section v-else-if="data.step === 2" class="preg__form">
            <MpFormControl :is-required="isCompany" id="preg-brand" :is-invalid="err.brand">
              <MpFormLabel>{{ t('Business name') }}</MpFormLabel>
              <MpInput v-model="data.brand" @input="err.brand = false" />
              <MpFormHelpText>{{ isCompany ? t('The name your clients know you by. Shown on your partner profile.') : t('The name your clients know you by. Leave empty to use your KTP name.') }}</MpFormHelpText>
              <MpFormErrorMessage>{{ t('You must fill in business name') }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl is-required id="preg-code" :is-invalid="err.code || codeTaken">
              <MpFormLabel>{{ t('Partner code') }}</MpFormLabel>
              <MpInputGroup id="preg-code-group">
                <MpInputLeftAddon id="preg-code-prefix">MP</MpInputLeftAddon>
                <MpInput :model-value="data.code" @input="onCode" @blur="codeBlur = true" />
                <MpInputRightAddon v-if="codeAvailable" id="preg-code-ok">
                  <span class="preg__code-ok"><MpIcon name="done" variant="fill" size="sm" color="icon.success" /></span>
                </MpInputRightAddon>
              </MpInputGroup>
              <MpFormHelpText>{{ t('Letters and numbers only, up to 8 characters after MP. This code cannot be changed later.') }}</MpFormHelpText>
              <MpFormErrorMessage>{{ isReserved ? `MP${data.code} ${t('is already taken')}` : t('You must fill in partner code') }}</MpFormErrorMessage>
            </MpFormControl>

            <div class="preg__subhead">{{ t('Operating location') }}</div>
            <MpCheckbox id="preg-same-loc" :is-checked="data.sameLocation" @change="data.sameLocation = !data.sameLocation">{{ isCompany ? t('Same as the address on NPWP') : t('Same as the address on KTP') }}</MpCheckbox>
            <template v-if="!data.sameLocation">
              <MpFormControl is-required id="preg-country" class="preg__half" :is-invalid="err.country">
                <MpFormLabel>{{ t('Country') }}</MpFormLabel>
                <MpAutocomplete id="preg-country-ac" v-model="data.country" :data="countryOptions" label-prop="label" value-prop="value" :placeholder="t('Select country')" is-searchable use-portal is-full-width :is-invalid="err.country" @update:model-value="onCountry" />
                <MpFormErrorMessage>{{ t('You must select country') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl is-required id="preg-province" class="preg__half" :is-invalid="err.province">
                <MpFormLabel>{{ t('Province') }}</MpFormLabel>
                <MpAutocomplete id="preg-province-ac" v-model="data.province" :data="provinceOptionsFor(data.country)" label-prop="label" value-prop="value" :placeholder="t('Select province')" is-searchable use-portal is-full-width :is-disabled="!data.country" :is-invalid="err.province" @update:model-value="onProvince" />
                <MpFormErrorMessage>{{ t('You must select province') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl is-required id="preg-city" class="preg__half" :is-invalid="err.city">
                <MpFormLabel>{{ t('City') }}</MpFormLabel>
                <MpAutocomplete id="preg-city-ac" v-model="data.city" :data="cityOptionsFor(data.country, data.province)" label-prop="label" value-prop="value" :placeholder="t('Select city')" is-searchable use-portal is-full-width :is-disabled="!data.province" :is-invalid="err.city" @update:model-value="err.city = false" />
                <MpFormErrorMessage>{{ t('You must select city') }}</MpFormErrorMessage>
              </MpFormControl>
            </template>
            <p v-else class="preg__same-loc">{{ legalLocation || t('Fill in the address in step 1 first.') }}</p>

            <div class="preg__subhead">{{ t('Online presence') }}</div>
            <MpFormControl id="preg-web">
              <MpFormLabel>{{ t('Website URL') }}</MpFormLabel>
              <MpInput v-model="data.website" type="url" />
            </MpFormControl>
            <MpFormControl id="preg-li">
              <MpFormLabel>{{ t('LinkedIn URL') }}</MpFormLabel>
              <MpInput v-model="data.linkedin" type="url" />
            </MpFormControl>

            <MpFormControl is-required id="preg-industry" class="preg__half" :is-invalid="err.industry">
              <MpFormLabel>{{ isCompany ? t('Company industry') : t('Your industry') }}</MpFormLabel>
              <MpAutocomplete id="preg-industry-ac" v-model="data.industry" :data="industryOptions" label-prop="label" value-prop="value" :placeholder="t('Select industry')" is-searchable use-portal is-full-width :is-invalid="err.industry" @update:model-value="err.industry = false" />
              <MpFormErrorMessage>{{ t('You must select your industry') }}</MpFormErrorMessage>
            </MpFormControl>
          </section>

          <!-- ── Step 3 — Market and expertise ── -->
          <!-- Full-width step: each question is its own segment, divided edge to edge across the card. -->
          <section v-else-if="data.step === 3" class="preg__market">
            <div class="preg__seg">
            <MpFormControl is-required id="preg-products" :is-invalid="err.product" data-devchange="preg-product-single">
              <div class="preg__list-head">
                <MpFormLabel>{{ t('Mekari product you want to sell and implement') }}</MpFormLabel>
              </div>
              <MpFormHelpText>{{ t('Choose the one product you want to focus on. You can add more later.') }}</MpFormHelpText>
              <div class="preg__checklist">
                <div v-for="p in PRODUCTS" :key="p" class="preg__checkrow">
                  <MpRadio :id="`product-${p}`" name="preg-product" :is-checked="data.product === p" @change="setProduct(p)">{{ p }}</MpRadio>
                </div>
              </div>
              <MpFormErrorMessage>{{ t('Select a product') }}</MpFormErrorMessage>
            </MpFormControl>
            </div>

            <div class="preg__seg">
            <MpFormControl is-required id="preg-specs" :is-invalid="err.specs">
              <div class="preg__list-head">
                <MpFormLabel>{{ t('Your specialization') }}</MpFormLabel>
                <span class="preg__count">{{ data.specs.length }} {{ t('selected') }}</span>
              </div>
              <MpFormHelpText>{{ t('Select all that apply.') }}</MpFormHelpText>
              <div class="preg__checklist">
                <div v-for="s in SPECS" :key="s" class="preg__checkrow">
                  <MpCheckbox :id="`spec-${s}`" :is-checked="data.specs.includes(s)" @change="toggle(data.specs, s); err.specs = false">{{ t(s) }}</MpCheckbox>
                </div>
              </div>
              <MpFormErrorMessage>{{ t('Select at least one') }}</MpFormErrorMessage>
            </MpFormControl>
            </div>

            <div class="preg__seg">
            <MpFormControl is-required id="preg-targets" :is-invalid="err.targets">
              <div class="preg__list-head">
                <MpFormLabel>{{ t('Industries you want to sell to') }}</MpFormLabel>
                <span class="preg__count">{{ data.targets.length }}/{{ MAX_TARGETS }}</span>
              </div>
              <MpFormHelpText>{{ t('Select up to 3.') }}</MpFormHelpText>
              <div class="preg__checklist">
                <div v-for="s in TARGETS" :key="s" class="preg__checkrow">
                  <MpCheckbox :id="`target-${s}`" :is-checked="data.targets.includes(s)" :disabled="!data.targets.includes(s) && data.targets.length >= MAX_TARGETS" @change="toggle(data.targets, s); err.targets = false">{{ t(s) }}</MpCheckbox>
                </div>
              </div>
              <MpFormErrorMessage>{{ t('Select at least one') }}</MpFormErrorMessage>
            </MpFormControl>
            </div>

            <div class="preg__seg">
            <MpFormControl is-required id="preg-segs" :is-invalid="err.segments">
              <div class="preg__list-head">
                <MpFormLabel>{{ t('Target company size') }}</MpFormLabel>
                <span class="preg__count">{{ data.segments.length }}/{{ MAX_SEGMENTS }}</span>
              </div>
              <MpFormHelpText>{{ t('Select up to 2.') }}</MpFormHelpText>
              <div class="preg__checklist">
                <div v-for="s in SEGMENTS" :key="s" class="preg__checkrow">
                  <MpCheckbox :id="`seg-${s}`" :is-checked="data.segments.includes(s)" :disabled="!data.segments.includes(s) && data.segments.length >= MAX_SEGMENTS" @change="toggle(data.segments, s); err.segments = false">{{ t(s) }}</MpCheckbox>
                </div>
              </div>
              <MpFormErrorMessage>{{ t('Select at least one') }}</MpFormErrorMessage>
            </MpFormControl>
            </div>

            <div class="preg__seg">
            <MpFormControl is-required id="preg-deal" :is-invalid="err.deal">
              <MpFormLabel>{{ t('Average project value') }}</MpFormLabel>
              <MpFormHelpText>{{ t('The value of the projects you usually handle, in IDR.') }}</MpFormHelpText>
              <div class="preg__checklist">
                <div v-for="d in DEALS" :key="d" class="preg__checkrow">
                  <MpRadio :id="`deal-${d}`" name="preg-deal" :is-checked="data.deal === d" @change="data.deal = d; err.deal = false" />
                  <label :for="`deal-${d}`" class="preg__radio-label">{{ d }}</label>
                </div>
              </div>
              <MpFormErrorMessage>{{ t('You must select a range') }}</MpFormErrorMessage>
            </MpFormControl>
            </div>
          </section>

          <!-- ── Step 4 — Review and submit ── -->
          <section v-else class="preg__review">
            <div v-for="(sec, i) in reviewSections" :key="i" class="preg__review-sec">
              <div class="preg__review-head">
                <span class="preg__review-title">{{ sec.title }}</span>
                <MpButton variant="ghost" is-rounded type="button" @click="goStep(i + 1)">{{ t('Edit') }}</MpButton>
              </div>
              <ContentList v-for="row in sec.rows" :key="row.label" class="preg__review-row" horizontal :label="row.label" :value="row.value || '—'" />
            </div>

            <MpFormControl is-required id="preg-agree" :is-invalid="err.agreed">
              <MpCheckbox id="preg-agree-cb" :is-checked="data.agreed" @change="data.agreed = !data.agreed; err.agreed = false">{{ t('I confirm this information is correct and agree to the Mekari Partner Program terms and conditions.') }}</MpCheckbox>
              <MpFormErrorMessage>{{ t('You must agree to continue') }}</MpFormErrorMessage>
            </MpFormControl>
          </section>

          <div class="preg__divider"></div>

          <!-- Footer actions -->
          <div class="preg__actions">
            <MpButton variant="ghost" is-rounded type="button" @click="onSaveDraft">{{ t('Save as draft') }}</MpButton>
            <div class="preg__actions-right">
              <MpButton v-if="data.step > 1" variant="secondary" is-rounded type="button" @click="onBack">{{ t('Back') }}</MpButton>
              <MpButton v-if="data.step < 4" variant="primary" is-rounded type="button" @click="onNext">{{ t('Next') }}</MpButton>
              <MpButton v-else variant="primary" is-rounded type="submit">{{ t('Submit registration') }}</MpButton>
            </div>
          </div>
          <p v-if="stepError" class="preg__step-error">{{ t('Please complete the required fields on this step.') }}</p>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { MpUpload, MpUploadList, MpTextarea } from '@mekari/pixel3'
import { MpAutocomplete, MpButton, MpFormControl, MpFormLabel, MpFormErrorMessage, MpFormHelpText, MpInput, MpInputGroup, MpInputLeftAddon, MpInputRightAddon, MpRadio, MpCheckbox, MpIcon } from '@mekari/pixel3'
import ContentList from '~/components/patterns/ContentList.vue'
import PartnerTopBar from '~/components/PartnerTopBar.vue'
import {
  PRODUCTS, SPECS, TARGETS, SEGMENTS, DEALS, GEO, COUNTRIES, DIAL_CODES, TAX_STATUSES,
  MAX_TARGETS, MAX_SEGMENTS, CODE_MAX_USER_CHARS, ID_FILE_ACCEPT, ID_FILE_MAX_MB, LEGAL_ID_DIGITS,
  emptyPartnerRegData, suggestCode, formatFileSize, type EntityType, type PartnerRegData,
} from '~/data/partnerReg'
import { buildPartnerRegReview } from '~/data/partnerRegReview'
import { successToast } from '~/utils/toasts'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const ps = usePartnerStatus()
const auth = useAuth()
const { profile } = useProfile()

// Account data comes from sign-up (shown read-only in the sidebar, never asked again).
const ROLE_LABELS: Record<string, string> = {
  consultant: 'Consultant', implementer: 'Implementer', developer: 'Developer', project_manager: 'Project manager',
  accountant: 'Accountant or tax professional', hr: 'HR professional', student: 'Student or lecturer',
}
const roleDisplay = computed(() => {
  const r = profile.value.role
  return r ? (ROLE_LABELS[r] ? t(ROLE_LABELS[r]) : r) : ''
})
const phoneDisplay = computed(() => {
  const p = profile.value.phone
  if (!p) return ''
  const dial = DIAL_CODES.find((d) => d.value === profile.value.phoneIso2)?.label.split(' ').pop()
  return dial ? `${dial} ${p}` : p
})

// Resume from a saved draft, else start fresh.
const data = reactive<PartnerRegData>({ ...emptyPartnerRegData(), ...ps.draft.value })
const isCompany = computed(() => data.entity === 'company')

const submitted = ref(false)
const codeBlur = ref(false)
const fileErr = ref(false)
const stepError = ref(false)
const err = reactive<Record<string, boolean>>({})

// Autosave: every change keeps the draft current so the next sign-in resumes.
watch(data, () => { if (!submitted.value) ps.saveDraft({ ...data }) }, { deep: true })

const stepLabels = computed(() => [t('Legal information'), t('Business profile'), t('Market and expertise'), t('Review and submit')])

const toOpt = (arr: readonly string[]) => arr.map((v) => ({ label: v, value: v }))
const industryOptions = computed(() => [
  t('IT services and consulting'), t('Software'), t('Accounting and tax services'), t('HR services'), t('Financial services'), t('Other'),
].map((v) => ({ label: v, value: v })))
const countryOptions = computed(() => toOpt(COUNTRIES))
const provinceOptionsFor = (country: string) => toOpt(country ? Object.keys(GEO[country] || {}) : [])
const cityOptionsFor = (country: string, province: string) => toOpt((country && province ? GEO[country]?.[province] : []) || [])

// ── Step 1 ──
// Switching type changes what every legal field means (KTP ↔ NPWP), so the
// legal entries reset and the name is re-prefilled from sign-up.
function setEntity(e: EntityType) {
  if (data.entity === e) return
  const hadType = !!data.entity
  data.entity = e
  err.entity = false
  if (hadType) { data.idNumber = ''; data.idFileName = ''; data.idFileSize = 0; data.legalName = '' }
  // Tax status is a company-only field — clear it when not a company.
  if (e !== 'company') { data.taxStatus = ''; err.taxStatus = false }
  prefillLegalName()
}
/** Default the legal name from sign-up (full name for an individual, company
 *  for a company) — only into a blank, so an edited name is never overwritten. */
function prefillLegalName() {
  if (!data.entity || data.legalName) return
  data.legalName = data.entity === 'company'
    ? profile.value.company
    : profile.value.fullName || auth.user.value?.name || ''
}
// A resumed draft can already have a type but no name (e.g. a draft from the
// earlier form) — fill it on open too.
prefillLegalName()
/** Clean what was typed and write it back to the element too — if the cleaned
 *  value equals the previous one, Vue won't re-render and the stray characters
 *  would stay visible. */
function sanitizeInput(e: Event, clean: (v: string) => string): string {
  const el = e.target as HTMLInputElement
  const v = clean(el.value)
  if (el.value !== v) el.value = v
  return v
}
function onIdNumber(e: Event) {
  data.idNumber = sanitizeInput(e, (v) => v.replace(/\D/g, '').slice(0, LEGAL_ID_DIGITS))
  err.idNumber = false
}
const idNumberError = computed(() => {
  if (!data.idNumber) return isCompany.value ? t('You must fill in company NPWP') : t('You must fill in NIK')
  return isCompany.value ? t('NPWP must be 16 digits') : t('NIK must be 16 digits')
})
function pickFile(payload: Event | FileList | null) {
  // MpUpload's @change emits the native Event (ev.target.files).
  const files = payload && 'target' in payload ? (payload.target as HTMLInputElement).files : (payload as FileList | null)
  const f = files?.[0]
  if (!f) return
  const okType = /\.(pdf|jpe?g|png)$/i.test(f.name)
  const okSize = f.size <= ID_FILE_MAX_MB * 1024 * 1024
  if (!okType || !okSize) { fileErr.value = true; return }
  fileErr.value = false
  data.idFileName = f.name
  data.idFileSize = f.size
  err.idFile = false
}
function fileIcon(name: string) {
  return /\.pdf$/i.test(name) ? 'pdf-document' : 'image-document'
}
function onLegalCountry() { data.legalProvince = ''; data.legalCity = ''; err.legalCountry = false }
function onLegalProvince() { data.legalCity = ''; err.legalProvince = false }

// ── Step 2 ──
// Mock availability: a few codes are "taken" so the not-available state is
// demonstrable; everything else is available.
const RESERVED_CODES = ['MEKARI', 'DEMO', 'ADMIN', 'TEST', 'PARTNER']
const isReserved = computed(() => data.code.length > 0 && RESERVED_CODES.includes(data.code))
const codeAvailable = computed(() => codeBlur.value && data.code.length > 0 && !isReserved.value)
const codeTaken = computed(() => codeBlur.value && isReserved.value)
function onCode(e: Event) {
  data.code = sanitizeInput(e, (v) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, CODE_MAX_USER_CHARS))
  err.code = false
}
function onCountry() { data.province = ''; data.city = ''; err.country = false }
function onProvince() { data.city = ''; err.province = false }
const legalLocation = computed(() => [data.legalCity, data.legalProvince, data.legalCountry].filter(Boolean).join(', '))
/** Prefill step 2 from what we already know, only into blanks. */
function prefillStep2() {
  if (!data.brand && isCompany.value) data.brand = profile.value.company
  if (!data.code) data.code = suggestCode(data.brand || data.legalName)
}

// ── Step 3 ──
function toggle(list: string[], v: string) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}

// Product is a single choice (radio) — selecting one replaces the previous.
function setProduct(v: string) {
  data.product = v
  err.product = false
}

// ── Step 4 — review ──
const reviewSections = computed(() => buildPartnerRegReview(data, t))

// ── Validation + navigation ──
function validateStep(n: number): boolean {
  if (n === 1) {
    err.entity = !data.entity
    if (err.entity) return false
    err.legalName = !data.legalName.trim()
    err.idNumber = data.idNumber.length !== LEGAL_ID_DIGITS
    err.taxStatus = isCompany.value && !data.taxStatus
    err.idFile = !data.idFileName
    err.legalCountry = !data.legalCountry
    err.legalProvince = !data.legalProvince
    err.legalCity = !data.legalCity
    err.legalAddress = !data.legalAddress.trim()
    return !(err.legalName || err.idNumber || err.taxStatus || err.idFile || err.legalCountry || err.legalProvince || err.legalCity || err.legalAddress)
  }
  if (n === 2) {
    err.brand = isCompany.value && !data.brand.trim()
    err.code = !data.code.trim() || isReserved.value
    if (isReserved.value) codeBlur.value = true
    err.country = !data.sameLocation && !data.country
    err.province = !data.sameLocation && !data.province
    err.city = !data.sameLocation && !data.city
    err.industry = !data.industry
    return !(err.brand || err.code || err.country || err.province || err.city || err.industry)
  }
  if (n === 3) {
    err.product = !data.product
    err.specs = data.specs.length === 0
    err.targets = data.targets.length === 0
    err.segments = data.segments.length === 0
    err.deal = !data.deal
    return !(err.product || err.specs || err.targets || err.segments || err.deal)
  }
  err.agreed = !data.agreed
  return !err.agreed
}

function scrollTop() { try { document.querySelector('.preg')?.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* noop */ } }

function goStep(n: number) {
  if (n > data.step) return
  data.step = n
  stepError.value = false
  if (n === 2) prefillStep2()
  scrollTop()
}
function onNext() {
  if (!validateStep(data.step)) { stepError.value = true; return }
  stepError.value = false
  if (data.step < 4) {
    data.step += 1
    if (data.step === 2) prefillStep2()
    scrollTop()
  }
}
function onBack() { if (data.step > 1) { data.step -= 1; stepError.value = false; scrollTop() } }

function onSaveDraft() {
  // Keep the user on the form — just persist and confirm with a toast.
  ps.saveDraft({ ...data })
  successToast(t('Draft saved'))
}

function onSubmit() {
  // Validate every step so a jump to the review can't skip earlier requirements.
  for (let n = 1; n <= 4; n++) {
    if (!validateStep(n)) {
      stepError.value = true
      // Jump only when the problem is on an earlier step; on the review step
      // stay put so the inline agreement error stays in view.
      if (n !== data.step) { data.step = n; scrollTop() }
      return
    }
  }
  stepError.value = false
  ps.submit({ ...data })
  submitted.value = true
  scrollTop()
}

function continueHome() { router.push('/') }

useHead({ title: () => `Mekari Partner | ${t('Partner registration')}` })
</script>

<style scoped>
.preg { position: fixed; inset: 0; display: flex; flex-direction: column; overflow-y: auto; background: var(--mp-background-neutral-subtle, #f8f9f9); color: var(--mp-text-default, #080d0e); }
.preg__main { flex: 1; padding: 8px 24px 48px; }
.preg__grid { max-width: 1120px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 48px; align-items: flex-start; }
.preg__nav { flex: 1 1 260px; max-width: 340px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 16px; }
.preg__overline { font-size: var(--mp-font-sizes-sm, 12px); font-weight: 600; letter-spacing: 0.04em; color: var(--mp-colors-emerald-800, #186f4a); }
.preg__title { margin: 0; font-size: 32px; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; color: var(--mp-text-default, #080d0e); }
.preg__lead { margin: 0; font-size: var(--mp-font-sizes-md, 14px); line-height: 1.6; color: var(--mp-text-secondary, #3a4749); }
.preg__steps { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.preg__step { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px; border: 0; border-radius: var(--mp-radii-lg, 12px); background: transparent; font: inherit; font-size: var(--mp-font-sizes-md, 14px); text-align: left; color: var(--mp-text-secondary, #3a4749); cursor: pointer; }
.preg__step.is-current { background: var(--mp-background-neutral-subtle-hovered, #eef0f1); color: var(--mp-text-default, #080d0e); font-weight: 600; }
.preg__step.is-done { color: var(--mp-text-default, #080d0e); }
.preg__step:disabled { cursor: default; }
.preg__dot { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; border-radius: 999px; border: 1px solid var(--mp-border-default, #e3e7e9); font-size: 12px; font-weight: 600; }
.preg__step.is-current .preg__dot { background: var(--mp-colors-emerald-800, #186f4a); border-color: transparent; color: var(--mp-text-inverse, #ffffff); }
.preg__step.is-done .preg__dot { background: var(--mp-colors-emerald-100, #e4f3ec); border-color: transparent; color: var(--mp-colors-emerald-800, #186f4a); }
.preg__card { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 24px; padding: 32px; background: var(--mp-background-stage, #ffffff); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 12px); }
.preg__head { display: flex; flex-direction: column; gap: 4px; }
.preg__step-title { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
.preg__form { display: flex; flex-direction: column; gap: 20px; max-width: 558px; }
/* Selects + upload are half the 558px form (rule/form-select-half), stacked on their own row. */
.preg__half { width: 100%; max-width: 267px; }
@media (max-width: 560px) { .preg__half { max-width: 100%; } }
.preg__subhead { margin-top: 4px; font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: 600; color: var(--mp-text-default, #080d0e); }
.preg__same-loc { margin: -8px 0 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.preg__types { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; }
.preg__type { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 12px); cursor: pointer; }
.preg__type.is-on { border-color: var(--mp-colors-emerald-800, #186f4a); background: var(--mp-colors-emerald-100, #e4f3ec); }
.preg__type-text { display: flex; flex-direction: column; gap: 2px; }
.preg__type-title { font-size: var(--mp-font-sizes-md, 14px); font-weight: 600; }
.preg__type-desc { font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary, #3a4749); }
.preg__account { display: flex; flex-direction: column; margin-top: 12px; padding: 16px; background: var(--mp-background-stage, #ffffff); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 12px); }
.preg__account-title { font-size: var(--mp-font-sizes-md, 14px); font-weight: 600; }
.preg__account-hint { margin: 2px 0 4px; font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary, #3a4749); }
.preg__review { display: flex; flex-direction: column; gap: 24px; }
/* Review labels are longer than detail-page ones ("Industries you want to sell
   to") — widen the horizontal ContentList label (min 184px per
   rule/content-list-horizontal; wider is within the rule) so none wraps. */
.preg__review-row :deep(> span:first-child) { flex-basis: 240px; min-width: 240px; }
/* Step 3 — full stage width; a clear divider between each question, bleeding to
   the card edges (cancels the card's 32px side padding). */
.preg__market { display: flex; flex-direction: column; margin: 0 -32px; }
.preg__seg { padding: 24px 32px; border-top: 1px solid var(--mp-border-default, #e3e7e9); }
.preg__seg:first-child { padding-top: 0; border-top: 0; }
.preg__seg:last-child { padding-bottom: 0; }
.preg__review-sec { display: flex; flex-direction: column; padding-bottom: 16px; border-bottom: 1px solid var(--mp-border-default, #e3e7e9); }
.preg__review-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.preg__review-title { font-size: var(--mp-font-sizes-md, 14px); font-weight: 600; }
.preg__divider { height: 1px; background: var(--mp-border-default, #e3e7e9); }
.preg__code-ok { display: inline-flex; align-items: center; justify-content: center; color: var(--mp-colors-emerald-800, #186f4a); }
.preg__list-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.preg__count { font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary, #3a4749); }
/* Compact multi-column list keeps step 3 from looking like a stack of lines. */
.preg__checklist { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 2px 24px; }
.preg__checkrow { display: flex; align-items: center; gap: 8px; padding: 7px 0; }
.preg__radio-label { font-size: var(--mp-font-sizes-md, 14px); cursor: pointer; }
/* Tax status — the two options side by side (PKP / Non-PKP). */
.preg__radiorow { display: flex; flex-wrap: wrap; gap: 12px 32px; padding: 4px 0; }
.preg__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.preg__actions-right { display: flex; flex-wrap: wrap; gap: 12px; }
.preg__step-error { margin: 0; font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-danger, #d1352c); text-align: right; }
.preg__done { max-width: 520px; margin: 48px auto; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: 40px; background: var(--mp-background-stage, #fff); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 12px); }
.preg__done-icon { color: var(--mp-colors-emerald-800, #186f4a); }
.preg__done-title { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
.preg__done-text { margin: 0; font-size: var(--mp-font-sizes-md, 14px); line-height: 1.6; color: var(--mp-text-secondary, #3a4749); }
</style>
