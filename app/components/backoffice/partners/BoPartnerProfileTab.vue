<script setup lang="ts">
/**
 * K-09 Profile tab — the partner's profile. Editable here: Account Owner,
 * Technical PIC, Tax Status, partner industry, website URL, LinkedIn URL and the
 * can-implement toggle (updatePartnerProfile). Everything else comes from the
 * registration and is read-only (ContentList, rule/detail-contentlist); partner
 * admins request those changes through Partner Data Change.
 *
 * The draft is owned by the page (survives tab switches) and passed in. Footer:
 * ghost "Discard changes" + primary "Save changes" (rule/form-edit-save-changes),
 * always rendered and clickable (rule/form-actions-always-present) — clicking with
 * nothing changed / an invalid field explains inline (rule/form-errors-inline).
 */
import { ref, computed } from 'vue'
import {
  MpButton, MpButtonGroup, MpToggle, MpFormControl, MpFormLabel, MpFormErrorMessage, MpFormHelpText, MpInput, MpAutocomplete,
} from '@mekari/pixel3'
import ContentList from '~/components/patterns/ContentList.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import {
  bo, showVal, partnerProfileErrors, updatePartnerProfile, BO_INDUSTRIES, BO_TAX_OPTIONS,
  type BoPartner, type BoPartnerProfilePatch,
} from '~/data/backoffice'
import { profileDirty, profileDraftOf } from '~/components/backoffice/partners/partnersView'
import { successToast } from '~/utils/toasts'

const props = defineProps<{ partner: BoPartner; draft: BoPartnerProfilePatch }>()
const emit = defineEmits<{ saved: [msg: string] }>()
const { t } = useLocale()

const p = computed(() => props.partner)
const d = props.draft

const aeOptions = computed(() => bo.aes.map((a) => ({ label: a.name, value: a.email })))
const trainerOptions = computed(() => bo.trainers.map((a) => ({ label: a.name, value: a.email })))
const industryOptions = BO_INDUSTRIES.map((v) => ({ label: t(v), value: v }))
const taxOptions = BO_TAX_OPTIONS.map((v) => ({ label: v, value: v }))

const tried = ref(false)
const note = ref('')
const errs = computed(() => (tried.value ? partnerProfileErrors(d) : {}))
const dirty = computed(() => profileDirty(p.value, d))

function discard() {
  Object.assign(d, profileDraftOf(p.value))
  tried.value = false
  note.value = ''
}
function save() {
  note.value = ''
  if (!dirty.value) { note.value = t('No changes to save.'); return }
  tried.value = true
  const res = updatePartnerProfile(p.value.id, { ...d })
  if (!res.ok) { if (!res.errors) note.value = res.msg; return }
  tried.value = false
  Object.assign(d, profileDraftOf(p.value))
  successToast(res.msg)
  emit('saved', res.msg)
}

const zoho = computed(() => (p.value.acq ? `https://crm.zoho.com/crm/mekari/tab/PartnerAcquisition/${p.value.acq}` : ''))
const idType = computed(() => (p.value.idNo ? (p.value.entity === 'Company' ? 'NPWP' : 'KTP') : ''))
</script>

<template>
  <div class="bpp" data-devchange="bo-partner-profile">
    <!-- ── Account ── -->
    <section class="bpp-section">
      <h3 class="bpp-h3">{{ t('Account') }}</h3>
      <div class="bpp-form">
        <MpFormControl id="bpp-ae" class="span-3" is-required :is-invalid="!!errs.ae">
          <MpFormLabel>{{ t('Account Owner') }}</MpFormLabel>
          <MpAutocomplete id="bpp-ae-ac" v-model="d.ae" :data="aeOptions" label-prop="label" value-prop="value" is-searchable use-portal is-full-width :is-invalid="!!errs.ae" />
          <MpFormErrorMessage v-if="errs.ae">{{ errs.ae }}</MpFormErrorMessage>
          <MpFormHelpText v-else>{{ t('Listed from Partner Account Owners.') }}</MpFormHelpText>
        </MpFormControl>
        <MpFormControl id="bpp-tech" class="span-3">
          <MpFormLabel>{{ t('Technical PIC (optional)') }}</MpFormLabel>
          <ErpFilterSelect id="bpp-tech-select" v-model="d.tech" :placeholder="t('Select')" :options="trainerOptions" width="100%" />
          <MpFormHelpText>{{ t('Listed from Trainers.') }}</MpFormHelpText>
        </MpFormControl>
      </div>
      <div class="bpp-facts">
        <ContentList :label="t('Partner ID')" :value="p.id" />
        <ContentList :label="t('Partner code')" :value="p.code || t('Set when the partner registers through its link')" />
        <ContentList :label="t('Status')"><ErpStatusBadge :status="p.status" :label="t(p.status)" /></ContentList>
        <ContentList :label="t('Initial product focus')" :value="p.product || '—'" />
        <ContentList :label="t('Source')" :value="p.source || '—'" />
        <ContentList :label="t('Zoho partner acquisition')">
          <a v-if="zoho" class="bpp-link" :href="zoho" target="_blank" rel="noopener">{{ p.acq }}</a>
          <span v-else>—</span>
        </ContentList>
      </div>
    </section>

    <!-- ── Company information ── -->
    <section class="bpp-section">
      <h3 class="bpp-h3">{{ t('Company information') }}</h3>
      <div class="bpp-form">
        <MpFormControl id="bpp-industry" class="span-3">
          <MpFormLabel>{{ t('Partner industry') }}</MpFormLabel>
          <ErpFilterSelect id="bpp-industry-select" v-model="d.industry" :placeholder="t('Select')" :options="industryOptions" width="100%" />
        </MpFormControl>
        <div class="span-6 bpp-toggle">
          <MpToggle id="bpp-impl" :is-checked="d.impl" :aria-label="t('Can implement Mekari products to end users')" @update:is-checked="(v: boolean) => (d.impl = v)" />
          <span class="bpp-toggle-label">{{ t('Can implement Mekari products to end users') }}</span>
        </div>
        <MpFormControl id="bpp-web" class="span-6" :is-invalid="!!errs.web">
          <MpFormLabel>{{ t('Website URL') }}</MpFormLabel>
          <MpInput id="bpp-web-input" v-model="d.web" type="url" is-full-width />
          <MpFormErrorMessage>{{ errs.web }}</MpFormErrorMessage>
        </MpFormControl>
        <MpFormControl id="bpp-li" class="span-6" :is-invalid="!!errs.li">
          <MpFormLabel>{{ t('LinkedIn URL') }}</MpFormLabel>
          <MpInput id="bpp-li-input" v-model="d.li" type="url" is-full-width />
          <MpFormErrorMessage>{{ errs.li }}</MpFormErrorMessage>
        </MpFormControl>
      </div>
      <div class="bpp-facts">
        <ContentList :label="t('Entity type')" :value="t(p.entity)" />
        <ContentList :label="t('Brand name')" :value="p.brand || '—'" />
        <ContentList :label="t('Phone number')" :value="p.phone || '—'" />
      </div>
    </section>

    <!-- ── Market profile (read-only) ── -->
    <section class="bpp-section">
      <h3 class="bpp-h3">{{ t('Market profile') }}</h3>
      <div class="bpp-facts">
        <ContentList :label="t('Your specialization')" :value="showVal(p.specs)" />
        <ContentList :label="t('Your target industry')" :value="showVal(p.targets)" />
        <ContentList :label="t('Target market segment')" :value="showVal(p.segments)" />
        <ContentList :label="t('Existing average deal value range')" :value="p.deal ? `IDR ${p.deal}` : '—'" />
      </div>
    </section>

    <!-- ── Legal profile (read-only) ── -->
    <section class="bpp-section">
      <h3 class="bpp-h3">{{ t('Legal profile') }}</h3>
      <div class="bpp-facts">
        <ContentList :label="t('Country')" :value="p.country || '—'" />
        <ContentList :label="t('Province')" :value="p.prov || '—'" />
        <ContentList :label="t('City')" :value="p.city || '—'" />
        <ContentList :label="t('Identification type')" :value="idType || '—'" />
        <ContentList :label="t('ID number')" :value="p.idNo || '—'" />
        <ContentList :label="t('Legal name')" :value="p.legal || '—'" />
        <ContentList :label="t('Legal address')" :value="p.addr || '—'" />
      </div>
    </section>

    <!-- ── Financial information ── -->
    <section class="bpp-section">
      <h3 class="bpp-h3">{{ t('Financial information') }}</h3>
      <div class="bpp-form">
        <MpFormControl id="bpp-tax" class="span-3">
          <MpFormLabel>{{ t('Tax Status') }}</MpFormLabel>
          <ErpFilterSelect id="bpp-tax-select" v-model="d.tax" :placeholder="t('Select')" :options="taxOptions" width="100%" />
        </MpFormControl>
      </div>
      <div class="bpp-facts">
        <ContentList :label="t('Bank')" :value="p.bank || '—'" />
        <ContentList :label="t('Bank account holder name')" :value="p.holder || '—'" />
        <ContentList :label="t('Bank account number')" :value="p.acct || '—'" />
      </div>
    </section>

    <!-- ── Footer ── -->
    <div class="bpp-footer">
      <p class="bpp-caption">{{ t('Editable here: Account Owner, Technical PIC, Tax Status, partner industry, website URL, LinkedIn URL and the can-implement toggle. Other fields come from the registration; partner admins request changes through Partner Data Change.') }}</p>
      <p v-if="note" class="bpp-note" role="status">{{ note }}</p>
      <MpButtonGroup class="erp-action-footer">
        <MpButton variant="ghost" is-rounded @click="discard">{{ t('Discard changes') }}</MpButton>
        <MpButton variant="primary" is-rounded @click="save">{{ t('Save changes') }}</MpButton>
      </MpButtonGroup>
    </div>
  </div>
</template>

<style scoped>
.bpp { display: flex; flex-direction: column; gap: var(--mp-spacing-8); }
.bpp-section { display: flex; flex-direction: column; gap: var(--mp-spacing-3); }
.bpp-h3 { margin: 0; font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); }
/* 6-col form grid, max 558px (rule/form-field-stacking, rule/form-select-half) */
.bpp-form { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); column-gap: var(--mp-spacing-6); row-gap: var(--mp-spacing-5); max-width: 558px; padding-bottom: var(--mp-spacing-2); }
.span-6 { grid-column: span 6; }
.span-3 { grid-column: 1 / span 3; }
/* key/value grid (rule/detail-contentlist) */
.bpp-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); column-gap: var(--mp-spacing-6); }
.bpp-link { color: var(--mp-text-link); text-decoration: none; }
.bpp-link:hover { text-decoration: underline; text-underline-offset: 2px; }
/* toggle LEFT, label RIGHT, 12px gap (rule/form-toggle-inline) */
.bpp-toggle { display: flex; align-items: center; gap: var(--mp-spacing-3); }
.bpp-toggle-label { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-default); }
.bpp-footer { display: flex; flex-direction: column; gap: var(--mp-spacing-3); padding-top: var(--mp-spacing-5); border-top: 1px solid var(--mp-colors-border-default, #e3e7e9); }
.bpp-caption { margin: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpp-note { margin: 0; font-size: var(--mp-font-sizes-md); color: var(--mp-text-secondary); }
</style>
