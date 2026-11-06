<script setup lang="ts">
/**
 * K-03 Create partner (+ K-04 Existing users lookup). Saved as Unregistered; the
 * partner code and the other registration fields arrive later through the
 * partner's registration form link. Every user gets role admin.
 *
 * Form pattern (docs/patterns/Form.md): 6-col grid max 558px, fields stacked
 * (rule/form-field-stacking), selects half width (rule/form-select-half) as
 * MpAutocomplete (rule/select-erpfilterselect), no placeholders
 * (rule/input-no-placeholder), errors inline after the first Save
 * (rule/form-errors-inline, rule/btn-no-disabled-validation), footer ghost Cancel
 * + primary Save (rule/btn-cancel-ghost, rule/form-edit-save-changes). Success →
 * toast + partner detail (rule/toast-success-only).
 */
import { ref, reactive, computed } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip, MpBadge,
  MpFormControl, MpFormLabel, MpFormErrorMessage, MpFormHelpText, MpInput, MpAutocomplete,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import {
  bo, tr, BO_GEO, partnerCreateErrors, createPartner, allUsersDirectory,
} from '~/data/backoffice'
import {
  blankCreateDraft, blankUser, userSuggestions, pickExistingUser, clearUser, toStoreDraft,
  type CreateDraft, type NewUserRow, type UserSuggestion,
} from '~/components/backoffice/partners/partnersView'
import { successToast } from '~/utils/toasts'

const { t } = useLocale()
const router = useRouter()

const d = reactive<CreateDraft>(blankCreateDraft())
const tried = ref(false)

const opt = (vs: string[]) => vs.map((v) => ({ label: v, value: v }))
const aeOptions = computed(() => bo.aes.map((a) => ({ label: a.name, value: a.email })))
const countryOptions = computed(() => opt(Object.keys(BO_GEO)))
const provOptions = computed(() => opt(d.country ? Object.keys(BO_GEO[d.country] ?? {}) : []))
const cityOptions = computed(() => opt(d.country && d.prov ? (BO_GEO[d.country]?.[d.prov] ?? []) : []))
const professionOptions = computed(() => opt(bo.masters.professions.map((p) => p.name)))

// Cascade: changing a level clears the levels below it.
function setCountry(v: string) { if (v !== d.country) { d.country = v; d.prov = ''; d.city = '' } }
function setProv(v: string) { if (v !== d.prov) { d.prov = v; d.city = '' } }

// ── Validation (store rules; shown after the first Save) ──
const errs = computed(() => partnerCreateErrors(toStoreDraft(d)))
const fe = (k: keyof ReturnType<typeof partnerCreateErrors>['fields']) => (tried.value ? errs.value.fields[k] ?? '' : '')
/** Email errors about an existing/taken user show live — the user must act on them now. */
function emailErr(i: number, u: NewUserRow): string {
  const e = errs.value.users[i]?.email ?? ''
  if (!e) return ''
  const live = !u.existing && !!allUsersDirectory()[u.email.trim().toLowerCase()]
  return tried.value || live ? e : ''
}
const ue = (i: number, k: 'name' | 'job' | 'profession') => (tried.value ? errs.value.users[i]?.[k] ?? '' : '')

// ── Users repeater + K-04 lookup ──
const focusedKey = ref('')
let blurTimer: number | undefined
function onEmailFocus(key: string) { window.clearTimeout(blurTimer); focusedKey.value = key }
function onEmailBlur() { blurTimer = window.setTimeout(() => { focusedKey.value = '' }, 150) }
const suggestionsFor = (u: NewUserRow): UserSuggestion[] => (focusedKey.value === u.key ? userSuggestions(d, u.key) : [])
function pick(u: NewUserRow, s: UserSuggestion) { if (pickExistingUser(u, s)) focusedKey.value = '' }
function addUser() { d.users.push(blankUser()) }
function removeUser(key: string) { if (d.users.length > 1) d.users = d.users.filter((u) => u.key !== key) }

// ── Save ──
function cancel() { router.push('/backoffice/partners') }
function save() {
  tried.value = true
  if (errs.value.hasErrors) return
  const res = createPartner(toStoreDraft(d))
  if (!res.ok || !res.id) return
  successToast(res.msg)
  router.push(`/backoffice/partners/${res.id}`)
}
</script>

<template>
  <BoPage :title="t('New partner')" :breadcrumb="{ label: t('Partner Management'), to: '/backoffice/partners' }">
    <form class="bpn" novalidate data-devchange="bo-partner-create" @submit.prevent="save">
      <p class="bpn-lead">{{ t('The partner is saved as Unregistered. The partner code and the other registration fields are entered when the partner registers through its registration form link.') }}</p>

      <!-- ── Partner details ── -->
      <section class="bpn-section">
        <h2 class="bpn-h2">{{ t('Partner details') }}</h2>
        <div class="bpn-grid">
          <MpFormControl id="bpn-legal" class="span-6" is-required :is-invalid="!!fe('legal')">
            <MpFormLabel>{{ t('Legal name') }}</MpFormLabel>
            <MpInput id="bpn-legal-input" v-model="d.legal" is-full-width />
            <MpFormErrorMessage>{{ fe('legal') }}</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl id="bpn-ae" class="span-3" is-required :is-invalid="!!fe('ae')">
            <MpFormLabel>{{ t('Account Owner') }}</MpFormLabel>
            <MpAutocomplete id="bpn-ae-ac" v-model="d.ae" :data="aeOptions" label-prop="label" value-prop="value" is-searchable use-portal is-full-width :is-invalid="!!fe('ae')" />
            <MpFormErrorMessage v-if="fe('ae')">{{ fe('ae') }}</MpFormErrorMessage>
            <MpFormHelpText v-else>{{ t('Listed from Partner Account Owners.') }}</MpFormHelpText>
          </MpFormControl>

          <MpFormControl id="bpn-country" class="span-3 row-start" is-required :is-invalid="!!fe('country')">
            <MpFormLabel>{{ t('Country') }}</MpFormLabel>
            <MpAutocomplete id="bpn-country-ac" :model-value="d.country" :data="countryOptions" label-prop="label" value-prop="value" use-portal is-full-width :is-invalid="!!fe('country')" @update:model-value="setCountry" />
            <MpFormErrorMessage>{{ fe('country') }}</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl id="bpn-prov" class="span-3 row-start" is-required :is-invalid="!!fe('prov')">
            <MpFormLabel>{{ t('Province') }}</MpFormLabel>
            <MpAutocomplete :key="`prov-${d.country}`" id="bpn-prov-ac" :model-value="d.prov" :data="provOptions" label-prop="label" value-prop="value" is-searchable use-portal is-full-width :is-disabled="!d.country" :is-invalid="!!fe('prov')" @update:model-value="setProv" />
            <MpFormErrorMessage v-if="fe('prov')">{{ fe('prov') }}</MpFormErrorMessage>
            <MpFormHelpText v-else-if="!d.country">{{ t('Select a country first.') }}</MpFormHelpText>
          </MpFormControl>

          <MpFormControl id="bpn-city" class="span-3 row-start" is-required :is-invalid="!!fe('city')">
            <MpFormLabel>{{ t('City') }}</MpFormLabel>
            <MpAutocomplete :key="`city-${d.prov}`" id="bpn-city-ac" v-model="d.city" :data="cityOptions" label-prop="label" value-prop="value" is-searchable use-portal is-full-width :is-disabled="!d.prov" :is-invalid="!!fe('city')" />
            <MpFormErrorMessage v-if="fe('city')">{{ fe('city') }}</MpFormErrorMessage>
            <MpFormHelpText v-else-if="!d.prov">{{ t('Select a province first.') }}</MpFormHelpText>
          </MpFormControl>

          <MpFormControl id="bpn-web" class="span-6" :is-invalid="!!fe('web')">
            <MpFormLabel>{{ t('Website URL (optional)') }}</MpFormLabel>
            <MpInput id="bpn-web-input" v-model="d.web" type="url" is-full-width />
            <MpFormErrorMessage v-if="fe('web')">{{ fe('web') }}</MpFormErrorMessage>
            <MpFormHelpText v-else>{{ t('Starts with https://') }}</MpFormHelpText>
          </MpFormControl>

          <MpFormControl id="bpn-li" class="span-6" :is-invalid="!!fe('li')">
            <MpFormLabel>{{ t('LinkedIn URL (optional)') }}</MpFormLabel>
            <MpInput id="bpn-li-input" v-model="d.li" type="url" is-full-width />
            <MpFormErrorMessage>{{ fe('li') }}</MpFormErrorMessage>
          </MpFormControl>
        </div>
      </section>

      <!-- ── Users ── -->
      <section class="bpn-section">
        <div>
          <h2 class="bpn-h2">{{ t('Users') }}</h2>
          <p class="bpn-caption">{{ t('At least one user. Each user gets role admin. New users are informed by email and log in directly with email OTP or Google, without signing up.') }}</p>
        </div>

        <div v-for="(u, i) in d.users" :key="u.key" class="bpn-user" data-devchange="bo-partner-create">
          <div class="bpn-user-head">
            <div class="bpn-user-title">
              <h3 class="bpn-h3">{{ tr('User {n}', { n: i + 1 }) }}</h3>
              <MpBadge for="additionalInformation" type="announcement">{{ t('Admin') }}</MpBadge>
              <MpBadge v-if="u.existing" for="additionalInformation" type="information">{{ t('Existing user') }}</MpBadge>
            </div>
            <div class="bpn-user-actions">
              <MpButton v-if="u.existing" variant="ghost" is-rounded @click="clearUser(u)">{{ t('Change user') }}</MpButton>
              <MpTooltip v-if="d.users.length > 1" :id="`bpn-rm-${u.key}`" :label="t('Remove user')" placement="top" use-portal>
                <MpButton variant="ghost" left-icon="minus-circular" :aria-label="t('Remove user')" is-rounded @click="removeUser(u.key)" />
              </MpTooltip>
            </div>
          </div>

          <div class="bpn-grid">
            <MpFormControl :id="`bpn-email-${u.key}`" class="span-6" is-required :is-invalid="!!emailErr(i, u)">
              <MpFormLabel>{{ t('User email') }}</MpFormLabel>
              <MpInput :id="`bpn-email-input-${u.key}`" v-model="u.email" type="email" autocomplete="off" is-full-width :is-disabled="u.existing" @focus="onEmailFocus(u.key)" @blur="onEmailBlur" />
              <!-- K-04 Existing users — directory matches while typing -->
              <div v-if="suggestionsFor(u).length" class="bpn-suggest" role="listbox" :aria-label="t('Existing users')">
                <span class="bpn-suggest-head">{{ t('Existing users') }}</span>
                <div
                  v-for="s in suggestionsFor(u)" :key="s.email" role="option" :aria-disabled="!!s.partner" tabindex="-1"
                  class="bpn-suggest-item" :class="{ 'bpn-suggest-item--taken': !!s.partner }"
                  @mousedown.prevent @click="pick(u, s)"
                >
                  <span class="bpn-suggest-main">
                    <span class="bpn-suggest-email">{{ s.email }}</span>
                    <span class="bpn-suggest-meta">{{ s.name }} · {{ s.job }}</span>
                  </span>
                  <span v-if="s.partner" class="bpn-suggest-meta">{{ tr('Member of {partner}', { partner: s.partner }) }}</span>
                </div>
              </div>
              <MpFormErrorMessage v-if="emailErr(i, u)">{{ emailErr(i, u) }}</MpFormErrorMessage>
              <MpFormHelpText v-else>{{ u.existing ? t('Existing user. Details are filled in from the user database.') : t('Type an email. Existing users are offered below.') }}</MpFormHelpText>
            </MpFormControl>

            <MpFormControl :id="`bpn-name-${u.key}`" class="span-6" is-required :is-invalid="!!ue(i, 'name')">
              <MpFormLabel>{{ t('User name') }}</MpFormLabel>
              <MpInput :id="`bpn-name-input-${u.key}`" v-model="u.name" is-full-width :is-disabled="u.existing" />
              <MpFormErrorMessage>{{ ue(i, 'name') }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl :id="`bpn-job-${u.key}`" class="span-6" is-required :is-invalid="!!ue(i, 'job')">
              <MpFormLabel>{{ t('Job title') }}</MpFormLabel>
              <MpInput :id="`bpn-job-input-${u.key}`" v-model="u.job" is-full-width :is-disabled="u.existing" />
              <MpFormErrorMessage>{{ ue(i, 'job') }}</MpFormErrorMessage>
            </MpFormControl>

            <MpFormControl :id="`bpn-phone-${u.key}`" class="span-6">
              <MpFormLabel>{{ t('Phone (optional)') }}</MpFormLabel>
              <MpInput :id="`bpn-phone-input-${u.key}`" v-model="u.phone" type="tel" is-full-width :is-disabled="u.existing" />
            </MpFormControl>

            <MpFormControl :id="`bpn-prof-${u.key}`" class="span-3" is-required :is-invalid="!!ue(i, 'profession')">
              <MpFormLabel>{{ t('Profession') }}</MpFormLabel>
              <MpAutocomplete :id="`bpn-prof-ac-${u.key}`" v-model="u.profession" :data="professionOptions" label-prop="label" value-prop="value" use-portal is-full-width :is-disabled="u.existing" :is-invalid="!!ue(i, 'profession')" />
              <MpFormErrorMessage>{{ ue(i, 'profession') }}</MpFormErrorMessage>
            </MpFormControl>
          </div>
        </div>

        <div>
          <MpButton variant="secondary" left-icon="add" is-rounded @click="addUser">{{ t('Add user') }}</MpButton>
        </div>
      </section>

      <p v-if="tried && errs.hasErrors" class="bpn-form-err" role="alert">
        <MpIcon name="info" size="sm" color="icon.danger" />
        {{ t('Fix the highlighted fields, then save again.') }}
      </p>

      <MpButtonGroup class="erp-action-footer">
        <MpButton variant="ghost" is-rounded @click="cancel">{{ t('Cancel') }}</MpButton>
        <MpButton variant="primary" is-rounded type="submit">{{ t('Save') }}</MpButton>
      </MpButtonGroup>
    </form>
  </BoPage>
</template>

<style scoped>
.bpn { display: flex; flex-direction: column; gap: var(--mp-spacing-8); max-width: 558px; }
.bpn-lead { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
.bpn-section { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.bpn-h2 { margin: 0; font-size: var(--mp-font-sizes-xl); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-xl); color: var(--mp-text-default); }
.bpn-h3 { margin: 0; font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); }
.bpn-caption { margin: var(--mp-spacing-1) 0 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }

/* 6-col form grid (rule/form-field-stacking); selects span 3 on their own row (rule/form-select-half) */
.bpn-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); column-gap: var(--mp-spacing-6); row-gap: var(--mp-spacing-5); }
.span-6 { grid-column: span 6; }
.span-3 { grid-column: 1 / span 3; }

.bpn-user { display: flex; flex-direction: column; gap: var(--mp-spacing-4); padding: var(--mp-spacing-4); border: 1px solid var(--mp-colors-border-default, #e3e7e9); border-radius: var(--mp-radii-lg); }
.bpn-user-head { display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); min-height: var(--mp-sizes-9); }
.bpn-user-title { display: flex; align-items: center; gap: var(--mp-spacing-2); }
.bpn-user-actions { display: flex; align-items: center; gap: var(--mp-spacing-2); }

/* K-04 Existing users list — flat 1px surface (rule/surface-border-no-shadow) */
.bpn-suggest { margin-top: var(--mp-spacing-1); display: flex; flex-direction: column; border: 1px solid var(--mp-colors-border-default, #e3e7e9); border-radius: var(--mp-radii-md); background: var(--mp-background-neutral); overflow: hidden; }
.bpn-suggest-head { padding: var(--mp-spacing-2) var(--mp-spacing-3) var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpn-suggest-item { display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); padding: var(--mp-spacing-2) var(--mp-spacing-3); cursor: pointer; }
.bpn-suggest-item:hover { background: var(--mp-background-neutral-hovered); }
.bpn-suggest-item--taken { cursor: default; }
.bpn-suggest-item--taken:hover { background: transparent; }
.bpn-suggest-item--taken .bpn-suggest-email { color: var(--mp-text-secondary); }
.bpn-suggest-main { display: flex; flex-direction: column; min-width: 0; }
.bpn-suggest-email { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-default); }
.bpn-suggest-meta { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); white-space: nowrap; }

.bpn-form-err { margin: 0; display: flex; align-items: center; gap: var(--mp-spacing-2); font-size: var(--mp-font-sizes-md); color: var(--mp-text-danger); }
</style>
