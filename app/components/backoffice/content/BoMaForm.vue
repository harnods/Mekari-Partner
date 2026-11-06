<script setup lang="ts">
/**
 * BoMaForm — I-07 Master agreement editor (create + edit) with the I-09 status panel.
 * Form page per docs/patterns/Form.md (6-col max 558px, stacked, footer
 * MpButtonGroup.erp-action-footer — ghost Cancel + primary Save / "Save changes").
 *
 *  • Type PRIMARY / OTHERS (radio, fixed once saved). PRIMARY → products × partner
 *    roles matrix (MpCheckbox per product, nested role checkboxes — roles come from
 *    Configurations › Partner Roles, products from Configurations › Products).
 *  • One PDF via the shared ErpDropzone (rule/import-modal-dropzone).
 *  • Status (saved only): allowed transitions from maAllowedStatuses() — DRAFT →
 *    ACTIVE, ACTIVE → DRAFT (only while unused), ACTIVE → DEPRECATED via the L-02
 *    modal (needs a replacement). DEPRECATED is final and the page is read-only.
 *  • Errors inline, buttons never disabled; success → toast; unknown id → BoNotFound.
 */
import { ref, computed } from 'vue'
import {
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea, MpRadio, MpCheckbox,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpDropzone from '~/components/patterns/ErpDropzone.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import BoNotFound from './BoNotFound.vue'
import BoMaDeprecateModal from './BoMaDeprecateModal.vue'
import { successToast } from '~/utils/toasts'
import {
  bo, getMa, maUsed, maAllowedStatuses, maDraftErrors, saveMa, setMaStatus, duplicateMa, isPdf, tr,
  type BoMaDraft, type MaType, type MaStatus,
} from '~/data/backoffice'

const props = defineProps<{ id: string | null }>()
const { t } = useLocale()
const router = useRouter()

const saved = computed(() => (props.id ? getMa(props.id) : undefined))
const notFound = computed(() => !!props.id && !saved.value)
const isEdit = computed(() => !!saved.value)
const readOnly = computed(() => saved.value?.status === 'DEPRECATED')
const used = computed(() => maUsed(saved.value))

function draftOf(): BoMaDraft {
  const m = saved.value
  return m
    ? { id: m.id, name: m.name, desc: m.desc, type: m.type, products: JSON.parse(JSON.stringify(m.products)), pdf: m.pdf }
    : { id: null, name: '', desc: '', type: 'PRIMARY', products: {}, pdf: '' }
}
const d = ref<BoMaDraft>(draftOf())
const tried = ref(false)
const fileErr = ref('')
const errors = computed(() => maDraftErrors(d.value))
const err = (k: 'name' | 'products' | 'pdf') => (k === 'pdf' && fileErr.value) ? fileErr.value : (tried.value ? errors.value[k] ?? '' : '')

const types = computed<{ value: MaType; label: string; desc: string }[]>(() => [
  { value: 'PRIMARY', label: 'PRIMARY', desc: t('Offered in the Partnership Agreement section. Lists its products and, per product, partner roles.') },
  { value: 'OTHERS', label: 'OTHERS', desc: t('Offered in the Other agreements section. No products or partner roles.') },
])
function pickType(v: MaType) { if (!isEdit.value) d.value.type = v }

const products = computed(() => bo.masters.products.map((p) => p.name))
const roles = computed(() => bo.masters.roles.map((r) => r.name))
function toggleProduct(p: string) {
  const pr = { ...d.value.products }
  if (pr[p]) delete pr[p]
  else pr[p] = []
  d.value.products = pr
}
function toggleRole(p: string, r: string) {
  const cur = d.value.products[p] ?? []
  d.value.products = { ...d.value.products, [p]: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] }
}

const files = computed(() => (d.value.pdf ? [{ name: d.value.pdf }] : []))
function onFiles(list: FileList) {
  const f = list[0]; if (!f) return
  if (isPdf(f)) { d.value.pdf = f.name; fileErr.value = '' } else fileErr.value = t('The file must be a PDF.')
}

const toList = () => router.push('/backoffice/configurations/master-agreements')
function save() {
  if (readOnly.value) return
  const res = saveMa(d.value)
  if (!res.ok) { tried.value = true; return }
  successToast(res.msg)
  toList()
}

// ── Status (I-09) ──
const statusHelp: Record<MaStatus, string> = {
  DRAFT: 'DRAFT cannot be used in agreement drafting yet.',
  ACTIVE: 'ACTIVE can be selected in agreement drafting. It returns to DRAFT only while no document uses it.',
  DEPRECATED: 'DEPRECATED is final. It cannot return to ACTIVE or DRAFT.',
}
const allowed = computed(() => (saved.value ? maAllowedStatuses(saved.value) : []))
const statusNote = computed(() => {
  if (!saved.value) return t('A new master agreement starts in DRAFT.')
  if (saved.value.status === 'DEPRECATED') return t('Non-expired documents on this master agreement were moved to its replacement through a re-agreement batch.')
  if (saved.value.status === 'ACTIVE') return (used.value ? t('A document uses this master agreement, so it cannot return to DRAFT.') + ' ' : '') + t('Deprecating requires an ACTIVE replacement of the same type and creates a re-agreement batch.')
  return ''
})
const statusErr = ref('')
function setStatus(s: MaStatus) {
  if (!saved.value) return
  const res = setMaStatus(saved.value.id, s)
  if (res.ok) { statusErr.value = ''; successToast(res.msg) } else statusErr.value = res.msg
}
const depOpen = ref(false)
function onDeprecated(msg: string) { successToast(msg) }

function duplicate() {
  if (!saved.value) return
  const res = duplicateMa(saved.value.id)
  if (res.ok && res.id) { successToast(res.msg); router.push(`/backoffice/configurations/master-agreements/${res.id}`) }
}

const pageTitle = computed(() => (notFound.value ? t('Master agreement') : saved.value ? saved.value.name : t('New master agreement')))
useHead({ title: () => `Mekari Partner | ${pageTitle.value}` })
</script>

<template>
  <BoPage :title="pageTitle" :breadcrumb="{ label: t('Master Agreements'), to: '/backoffice/configurations/master-agreements' }">
    <template v-if="saved" #title-extra>
      <ErpStatusBadge :status="saved.status" size="md" badge-for="additionalInformation" />
    </template>
    <template v-if="saved" #actions>
      <MpButton class="btn-enterprise btn-enterprise--secondary" variant="secondary" is-rounded @click="duplicate">{{ t('Duplicate') }}</MpButton>
    </template>

    <BoNotFound
      v-if="notFound"
      :title="t('Master agreement not found')"
      :desc="t('Go back to the list to see current master agreements.')"
      :back-label="t('Back to master agreements')"
      back-to="/backoffice/configurations/master-agreements"
    />
    <template v-else>
      <!-- I-09 status -->
      <section class="bma-status" data-devchange="bo-cfg-ma-status">
        <div class="bma-status-head">
          <div class="bma-status-text">
            <span class="bc-label">{{ t('Status') }}</span>
            <span class="bc-caption">{{ t(statusHelp[saved?.status ?? 'DRAFT']) }}</span>
          </div>
          <ErpStatusBadge v-if="!saved" status="DRAFT" />
        </div>
        <p v-if="statusNote" class="bc-caption bma-note">{{ statusNote }}</p>
        <p v-if="saved?.status === 'DEPRECATED'" class="bc-caption bma-note">
          <span class="cell-link" @click="router.push('/backoffice/documents')">{{ t('View documents in Document Repository') }}</span>
        </p>
        <div v-if="allowed.length" class="bma-status-actions">
          <MpButton v-if="allowed.includes('ACTIVE')" class="btn-enterprise btn-enterprise--secondary" variant="secondary" is-rounded @click="setStatus('ACTIVE')">{{ t('Set to ACTIVE') }}</MpButton>
          <MpButton v-if="allowed.includes('DRAFT')" class="btn-enterprise btn-enterprise--secondary" variant="secondary" is-rounded @click="setStatus('DRAFT')">{{ t('Return to DRAFT') }}</MpButton>
          <MpButton v-if="allowed.includes('DEPRECATED')" variant="danger" is-rounded @click="depOpen = true">{{ t('Deprecate') }}</MpButton>
        </div>
        <span v-if="statusErr" class="bc-err">{{ statusErr }}</span>
      </section>

      <!-- Read-only (DEPRECATED) -->
      <div v-if="readOnly && saved" class="bf-form">
        <div>
          <ContentList horizontal :label="t('Name')" :value="saved.name" />
          <ContentList horizontal :label="t('Description')" :value="saved.desc || '—'" />
          <ContentList horizontal :label="t('Type')" :value="saved.type" />
          <ContentList v-if="saved.type === 'PRIMARY'" horizontal :label="t('Products')">
            <span class="bma-ro-products">
              <span v-for="(rs, p) in saved.products" :key="p">{{ p }}: {{ rs.join(', ') || '—' }}</span>
            </span>
          </ContentList>
          <ContentList horizontal :label="t('Master agreement PDF')" :value="saved.pdf || '—'" />
        </div>
      </div>

      <!-- Editor -->
      <div v-else class="bf-form" data-devchange="bo-cfg-ma-editor">
        <MpFormControl id="bo-ma-name" :is-invalid="!!err('name')">
          <div class="bc-lbl-row"><MpFormLabel>{{ t('Name') }}</MpFormLabel><span class="bc-counter">{{ d.name.length }}/100</span></div>
          <MpInput id="bo-ma-name-input" v-model="d.name" maxlength="100" />
          <MpFormErrorMessage>{{ err('name') }}</MpFormErrorMessage>
        </MpFormControl>
        <MpFormControl id="bo-ma-desc">
          <div class="bc-lbl-row"><MpFormLabel>{{ t('Description (optional)') }}</MpFormLabel><span class="bc-counter">{{ d.desc.length }}/250</span></div>
          <MpTextarea id="bo-ma-desc-input" v-model="d.desc" maxlength="250" is-full-width />
        </MpFormControl>

        <div class="bc-field">
          <span class="bc-label">{{ t('Type') }}</span>
          <ul class="bc-checklist">
            <li v-for="ty in types" :key="ty.value">
              <MpRadio :id="`bo-ma-type-${ty.value}`" name="bo-ma-type" :value="ty.value" :is-checked="d.type === ty.value" :is-disabled="isEdit && d.type !== ty.value" @change="pickType(ty.value)">
                <span class="bc-check-text">
                  <span class="bc-check-title">{{ ty.label }}</span>
                  <span class="bc-check-desc">{{ ty.desc }}</span>
                </span>
              </MpRadio>
            </li>
          </ul>
          <span v-if="isEdit" class="bc-caption">{{ t('Type is fixed once the master agreement is saved.') }}</span>
        </div>

        <div v-if="d.type === 'PRIMARY'" class="bc-field">
          <span class="bc-label">{{ t('Products') }}</span>
          <span class="bc-caption bma-caption-top">{{ t('Tick each included product, then the partner roles this master agreement covers for it.') }}</span>
          <ul class="bma-matrix" :class="{ 'bma-matrix--invalid': !!err('products') }">
            <li v-for="p in products" :key="p" class="bma-product">
              <MpCheckbox :id="`bo-ma-prod-${p}`" :is-checked="!!d.products[p]" @change="toggleProduct(p)">{{ p }}</MpCheckbox>
              <div v-if="d.products[p]" class="bma-roles">
                <span class="bma-roles-label">{{ t('Partner roles') }}</span>
                <ul class="bc-checklist">
                  <li v-for="r in roles" :key="r">
                    <MpCheckbox :id="`bo-ma-role-${p}-${r}`" :is-checked="(d.products[p] ?? []).includes(r)" @change="toggleRole(p, r)">{{ r }}</MpCheckbox>
                  </li>
                </ul>
                <span v-if="!roles.length" class="bc-caption">{{ t('Add partner roles in Configurations first.') }}</span>
              </div>
            </li>
          </ul>
          <span v-if="err('products')" class="bc-err">{{ err('products') }}</span>
        </div>

        <div class="bc-field">
          <span class="bc-label">{{ t('Master agreement PDF') }}</span>
          <ErpDropzone
            id="bo-ma-pdf" accept=".pdf,application/pdf" formats="PDF" :is-multiple="false"
            :files="files" :is-invalid="!!err('pdf')" @change="onFiles" @remove="d.pdf = ''"
          />
          <span v-if="err('pdf')" class="bc-err">{{ err('pdf') }}</span>
        </div>
      </div>

      <div class="bf-footer">
        <MpButtonGroup class="erp-action-footer">
          <template v-if="readOnly">
            <MpButton variant="ghost" is-rounded @click="toList">{{ t('Back to master agreements') }}</MpButton>
          </template>
          <template v-else>
            <MpButton variant="ghost" is-rounded @click="toList">{{ t('Cancel') }}</MpButton>
            <MpButton variant="primary" is-rounded @click="save">{{ isEdit ? t('Save changes') : t('Save') }}</MpButton>
          </template>
        </MpButtonGroup>
      </div>
    </template>

    <BoMaDeprecateModal v-if="saved" :is-open="depOpen" :ma-id="saved.id" @close="depOpen = false" @done="onDeprecated" />
  </BoPage>
</template>

<style scoped src="./bo-content.css"></style>
<style scoped>
.bma-status {
  display: flex; flex-direction: column; gap: var(--mp-spacing-2);
  max-width: 558px; width: 100%; box-sizing: border-box;
  padding: var(--mp-spacing-4);
  border: 1px solid var(--mp-colors-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 8px);
}
.bma-status-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--mp-spacing-3); }
.bma-status-text { display: flex; flex-direction: column; }
.bma-status-text .bc-caption { margin-top: 0; }
.bma-note { margin: 0; }
.bma-status-actions { display: flex; flex-wrap: wrap; gap: var(--mp-spacing-2); margin-top: var(--mp-spacing-1); }
.bma-caption-top { margin-top: 0; margin-bottom: var(--mp-spacing-2); }
.bma-matrix {
  list-style: none; margin: 0; padding: 0;
  border: 1px solid var(--mp-colors-border-default, #e3e7e9);
  border-radius: var(--mp-radii-md, 6px);
}
.bma-matrix--invalid { border-color: var(--mp-colors-border-danger, #e1544a); }
.bma-product { padding: var(--mp-spacing-3) var(--mp-spacing-4); }
.bma-product + .bma-product { border-top: 1px solid var(--mp-colors-border-default, #e3e7e9); }
.bma-roles { display: flex; flex-direction: column; gap: var(--mp-spacing-2); padding: var(--mp-spacing-3) 0 0 var(--mp-spacing-8, 32px); }
.bma-roles-label { font-size: var(--mp-font-sizes-sm); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-secondary); }
.bma-ro-products { display: flex; flex-direction: column; }
</style>
