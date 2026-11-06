<script setup lang="ts">
/**
 * BoAgreementModal — J-06 / J-07 / K-07 / L-05 "Agreement document" modal.
 * Add, edit, edit-remarks-only and duplicate an agreement row on a registration
 * ticket or a partner. Driven entirely by app/data/backoffice.ts:
 *
 *   <BoAgreementModal :is-open="open" :draft="draft" @close="open = false" @saved="onSaved" />
 *
 * Build the draft with blankAgDraft(owner, section) (add), draftFromRow(owner, row)
 * (edit), draftFromRow(owner, row, true) (remarks only — COMPLETED / EXPIRED partner
 * rows) or duplicateDraft(owner, row). The modal works on a local copy and
 * commits via saveAgreement() only on save. `saved` carries the translated
 * success message (the parent raises the toast — rule/btn-save-toast).
 *
 * Rules: MpModal md, close × only (rule/modal-drawer-close-explicit-only), ghost
 * Cancel + primary, never disabled (rule/btn-no-disabled-validation), errors
 * inline (rule/form-errors-inline), MpAutocomplete selects (rule/select-erpfilterselect),
 * MpDatePicker (rule/date-picker-variants), ErpDropzone for the PDF (rule/import-modal-dropzone),
 * no placeholders (rule/input-no-placeholder).
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea,
  MpAutocomplete, MpDatePicker, MpRadio,
} from '@mekari/pixel3'
import ErpDropzone from '~/components/patterns/ErpDropzone.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import {
  type BoAgDraft, type AgMethod, agreementDraftErrors, draftStatusPreview, saveAgreement, maOptionsFor,
  docOptionsFor, rowsOf, agName, isPdf, isoToDmy, dmyToIso, BO_DOCS,
} from '~/data/backoffice'
import { formatDateLong } from '~/utils/date'

const props = defineProps<{ isOpen: boolean; draft: BoAgDraft | null }>()
const emit = defineEmits<{ close: []; saved: [msg: string] }>()
const { t } = useLocale()

const d = ref<BoAgDraft | null>(null)
const tried = ref(false)
const fileErr = ref('')
const methodErr = ref('')
watch(() => [props.isOpen, props.draft] as const, ([open, draft]) => {
  if (open && draft) { d.value = JSON.parse(JSON.stringify(draft)); tried.value = false; fileErr.value = ''; methodErr.value = '' }
}, { immediate: true })

const locked = computed(() => !!d.value?.remarksOnly)
const isEsign = computed(() => d.value?.method === 'esign')
const isManual = computed(() => d.value?.method === 'manual')
const choosing = computed(() => !!d.value && !d.value.editId)

const title = computed(() => {
  const a = d.value; if (!a) return ''
  if (a.remarksOnly) return t('Edit remarks')
  if (a.editId) return t('Edit document')
  if (a.replaces) return t('Duplicate document')
  return a.section === 'pa' ? t('New Partnership Agreement') : t('New other agreement')
})
const lead = computed(() => {
  const a = d.value; if (!a) return ''
  if (a.remarksOnly) return t('COMPLETED and EXPIRED documents allow only remarks to be edited.')
  if (a.editId) return isEsign.value ? t('Editing this row does not change the linked Mekari Sign document.') : ''
  if (a.replaces) return t('Prefilled from the source document. Every field can be edited.')
  return ''
})
const replacedRow = computed(() => (d.value?.replaces ? rowsOf(d.value.owner).find((r) => r.id === d.value!.replaces) : undefined))

const methods = computed<{ value: AgMethod; label: string; desc: string }[]>(() => [
  { value: 'esign', label: t('By E-Sign'), desc: t('Link a document that already exists in Mekari Sign. Status follows the Mekari Sign webhook.') },
  { value: 'manual', label: t('Manual'), desc: t('Upload the signed agreement as a PDF. Status becomes COMPLETED on upload.') },
])
const maOptions = computed(() => (d.value ? maOptionsFor(d.value.section) : []))
const docOptions = computed(() => (d.value ? docOptionsFor(d.value.editId, d.value.doc) : []))
const docName = computed(() => BO_DOCS.find((x) => x.id === d.value?.doc)?.name ?? '')
const maCaption = computed(() => (d.value?.section === 'pa' ? t('Only ACTIVE PRIMARY master agreements are listed.') : t('Only ACTIVE OTHERS master agreements are listed.')))

const validation = computed(() => (d.value ? agreementDraftErrors(d.value) : { errors: {}, live: {} }))
function err(k: 'ma' | 'doc' | 'name' | 'start' | 'end'): string {
  if (locked.value) return ''
  const v = validation.value
  return (tried.value || (v.live as Record<string, true>)[k]) ? (v.errors as Record<string, string>)[k] ?? '' : ''
}
const fileError = computed(() => fileErr.value || (tried.value && !locked.value ? validation.value.errors.file ?? '' : ''))
const preview = computed(() => (d.value ? draftStatusPreview(d.value) : { status: '', note: '' }))

// MpDatePicker works on DD/MM/YYYY; the store keeps ISO.
const startDmy = computed({ get: () => isoToDmy(d.value?.start ?? ''), set: (v: string) => { if (d.value) d.value.start = dmyToIso(v || '') } })
const endDmy = computed({ get: () => isoToDmy(d.value?.end ?? ''), set: (v: string) => { if (d.value) d.value.end = dmyToIso(v || '') } })

const files = computed(() => (d.value?.file ? [{ name: d.value.file }] : []))
function onFiles(list: FileList) {
  const f = list[0]; if (!f || !d.value) return
  if (isPdf(f)) { d.value.file = f.name; fileErr.value = '' } else { d.value.file = ''; fileErr.value = t('The file must be a PDF.') }
}
function onRemoveFile() { if (d.value) d.value.file = '' }

function pickMethod(m: AgMethod) { if (d.value) { d.value.method = m; methodErr.value = '' } }

function save() {
  const a = d.value; if (!a) return
  if (!a.method) { methodErr.value = t('Choose a method.'); return }
  if (fileErr.value) { tried.value = true; return }
  const res = saveAgreement(a)
  if (!res.ok) { tried.value = true; return }
  emit('saved', res.msg)
  emit('close')
}
const saveLabel = computed(() => (locked.value ? t('Save remarks') : d.value?.editId ? t('Save changes') : t('Save')))
</script>

<template>
  <MpModal
    id="bo-agreement-modal"
    :is-open="isOpen"
    size="md"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent v-if="d" data-devchange="bo-agreement-modal">
      <MpModalHeader>
        {{ title }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="bam-body">
          <p v-if="lead" class="bam-lead">{{ lead }}</p>

          <div v-if="d.replaces" class="bam-replaced">
            <ContentList :label="t('Replaced agreement')" :value="replacedRow ? `${agName(replacedRow)} · ${formatDateLong(replacedRow.start)} – ${formatDateLong(replacedRow.end)}` : '—'" />
            <span class="bam-caption">{{ t('Read-only. Set by the re-agreement batch or by Duplicate.') }}</span>
          </div>

          <!-- Method (add / duplicate only) -->
          <div v-if="choosing" class="bam-field">
            <span class="bam-label">{{ t('Method') }}</span>
            <div class="bam-methods">
              <div v-for="m in methods" :key="m.value" class="bam-method">
                <label class="bam-radio">
                  <MpRadio :id="`bam-method-${m.value}`" name="bam-method" :value="m.value" :is-checked="d.method === m.value" @change="pickMethod(m.value)" />
                  <span>{{ m.label }}</span>
                </label>
                <p class="bam-method-caption">{{ m.desc }}</p>
              </div>
            </div>
            <span v-if="methodErr" class="bam-err">{{ methodErr }}</span>
          </div>

          <template v-if="d.method">
            <MpFormControl id="bam-ma" :is-invalid="!!err('ma')" class="bam-half">
              <MpFormLabel>{{ t('Master agreement') }}</MpFormLabel>
              <MpAutocomplete
                id="bam-ma-ac" v-model="d.ma" :data="maOptions" label-prop="label" value-prop="value"
                use-portal is-full-width :is-disabled="locked" :is-invalid="!!err('ma')"
              />
              <span class="bam-caption">{{ maCaption }}</span>
              <MpFormErrorMessage>{{ err('ma') }}</MpFormErrorMessage>
            </MpFormControl>

            <template v-if="isEsign">
              <MpFormControl id="bam-doc" :is-invalid="!!err('doc')">
                <MpFormLabel>{{ t('Mekari Sign document') }}</MpFormLabel>
                <MpAutocomplete
                  id="bam-doc-ac" v-model="d.doc" :data="docOptions" label-prop="label" value-prop="value"
                  is-searchable use-portal is-full-width :is-disabled="locked" :is-invalid="!!err('doc')"
                />
                <span class="bam-caption">{{ t('Documents are prepared and sent for signing in Mekari Sign. A document can be linked to one row only.') }}</span>
                <MpFormErrorMessage>{{ err('doc') }}</MpFormErrorMessage>
              </MpFormControl>
              <ContentList :label="t('Name')" :value="docName || '—'" />
            </template>

            <MpFormControl v-if="isManual" id="bam-name" :is-invalid="!!err('name')">
              <MpFormLabel>{{ t('Name') }}</MpFormLabel>
              <MpInput id="bam-name-input" v-model="d.name" :is-disabled="locked" />
              <MpFormErrorMessage>{{ err('name') }}</MpFormErrorMessage>
            </MpFormControl>

            <div class="bam-dates">
              <MpFormControl id="bam-start" :is-invalid="!!err('start')">
                <MpFormLabel>{{ t('Start date') }}</MpFormLabel>
                <MpDatePicker id="bam-start-dp" v-model="startDmy" format="DD/MM/YYYY" value-type="format" use-portal :is-disabled="locked" />
                <MpFormErrorMessage>{{ err('start') }}</MpFormErrorMessage>
              </MpFormControl>
              <MpFormControl id="bam-end" :is-invalid="!!err('end')">
                <MpFormLabel>{{ t('End date') }}</MpFormLabel>
                <MpDatePicker id="bam-end-dp" v-model="endDmy" format="DD/MM/YYYY" value-type="format" use-portal :is-disabled="locked" />
                <MpFormErrorMessage>{{ err('end') }}</MpFormErrorMessage>
              </MpFormControl>
            </div>

            <div v-if="isManual && !locked" class="bam-field">
              <span class="bam-label">{{ t('Signed agreement') }}</span>
              <ErpDropzone
                id="bam-dropzone" accept=".pdf,application/pdf" formats="PDF" :is-multiple="false"
                :files="files" :is-invalid="!!fileError" @change="onFiles" @remove="onRemoveFile"
              />
              <span class="bam-caption">{{ t('The document becomes COMPLETED when the PDF is uploaded.') }}</span>
              <span v-if="fileError" class="bam-err">{{ fileError }}</span>
            </div>
            <ContentList v-else-if="isManual" :label="t('File')" :value="d.file || '—'" />

            <MpFormControl id="bam-remarks">
              <MpFormLabel>{{ t('Remarks (optional)') }}</MpFormLabel>
              <MpTextarea id="bam-remarks-input" v-model="d.remarks" is-full-width />
            </MpFormControl>

            <div v-if="preview.status" class="bam-status">
              <ErpStatusBadge :status="preview.status" />
              <span class="bam-caption">{{ preview.note }}</span>
            </div>
          </template>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Cancel') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="save">{{ saveLabel }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped>
.bam-body { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.bam-lead { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
.bam-field { display: flex; flex-direction: column; gap: var(--mp-spacing-2); }
.bam-label { font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-md); color: var(--mp-text-default); }
.bam-caption { display: block; margin-top: var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bam-err { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-danger); }
.bam-half { max-width: 100%; }
.bam-replaced {
  display: flex; flex-direction: column;
  padding: 0 var(--mp-spacing-3) var(--mp-spacing-2);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-md, 6px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
}
.bam-replaced .bam-caption { margin-top: 0; }
.bam-methods { display: flex; flex-direction: column; gap: var(--mp-spacing-3); }
/* MpRadio brings its own 12px control-to-label gap (rule/checkbox-gap-12) */
.bam-radio { display: flex; align-items: center; gap: 0; cursor: pointer; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-default); }
.bam-method-caption { margin: 0; padding-left: var(--mp-spacing-8, 32px); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bam-dates { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--mp-spacing-4); }
.bam-status {
  display: flex; align-items: center; gap: var(--mp-spacing-2); flex-wrap: wrap;
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
  border-radius: var(--mp-radii-md, 6px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
}
.bam-status .bam-caption { margin-top: 0; }
</style>
