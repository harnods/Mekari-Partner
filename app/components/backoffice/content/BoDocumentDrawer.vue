<script setup lang="ts">
/**
 * BoDocumentDrawer — L-05 Document detail, opened from a Document Repository row.
 * Shared ErpDrawer shell (rule/drawer-custom-shell: header fill, no shadow, close ×
 * only — rule/modal-drawer-close-explicit-only), key/value via ContentList
 * (rule/detail-contentlist). Actions mirror the Agreements section rules
 * (rowActions): a row on an Agreement Drafting ticket or a PENDING partner row is
 * fully editable/deletable; COMPLETED / EXPIRED partner rows allow remarks only;
 * partner rows can be duplicated. Edit / Duplicate reuse BoAgreementModal; Delete
 * → ConfirmModal (rule/btn-danger-confirm). Remarks save inline (one primary).
 */
import { ref, computed, watch } from 'vue'
import { MpButton, MpFormControl, MpFormLabel, MpTextarea, MpBanner, MpBannerDescription, MpBannerIcon } from '@mekari/pixel3'
import ErpDrawer from '~/components/patterns/ErpDrawer.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import BoAgreementModal from '~/components/backoffice/BoAgreementModal.vue'
import { successToast } from '~/utils/toasts'
import { formatDateLong } from '~/utils/date'
import {
  type BoDocEntry, type BoAgDraft, agStatus, agName, getMa, rowsOf, docUrl, signUrl, BO_DOCS,
  draftFromRow, duplicateDraft, removeAgreement, saveAgreementRemarks, tr,
} from '~/data/backoffice'

const props = defineProps<{ entry: BoDocEntry | null }>()
const emit = defineEmits<{ close: []; open: [key: string] }>()
const { t } = useLocale()
const router = useRouter()

const row = computed(() => props.entry?.row)
const status = computed(() => (row.value ? agStatus(row.value) : 'PENDING'))
const ma = computed(() => getMa(row.value?.ma))
const replaced = computed(() => (row.value?.replaces && props.entry ? rowsOf(props.entry.owner).find((r) => r.id === row.value!.replaces) : undefined))
const signDoc = computed(() => (row.value?.method === 'esign' ? BO_DOCS.find((d) => d.id === row.value!.doc) : undefined))
const canFull = computed(() => !!props.entry && (props.entry.onTicket || status.value === 'PENDING'))
const canDuplicate = computed(() => !!props.entry && !props.entry.onTicket)
const sectionLabel = computed(() => (row.value?.section === 'pa' ? t('Partnership Agreement') : t('Other agreements')))
const ownerLink = computed(() => (props.entry?.owner.kind === 'partner' ? `/backoffice/partners/${props.entry.owner.id}` : `/backoffice/registrations?ticket=${props.entry?.owner.id ?? ''}`))

// ── Remarks (inline save) ──
const remarks = ref('')
watch(() => props.entry?.key, () => { remarks.value = row.value?.remarks ?? '' }, { immediate: true })
const dirty = computed(() => remarks.value.trim() !== (row.value?.remarks ?? ''))
const remarksNote = ref('')
function saveRemarks() {
  if (!props.entry || !row.value) return
  if (!dirty.value) { remarksNote.value = t('No changes to save. Edit the remarks first.'); return }
  remarksNote.value = ''
  successToast(saveAgreementRemarks(props.entry.owner, row.value.id, remarks.value).msg)
}
watch(remarks, () => { remarksNote.value = '' })

// ── Edit / duplicate (BoAgreementModal) ──
const agOpen = ref(false)
const agDraft = ref<BoAgDraft | null>(null)
function openEdit() { if (props.entry && row.value) { agDraft.value = draftFromRow(props.entry.owner, row.value); agOpen.value = true } }
function openDuplicate() { if (props.entry && row.value) { agDraft.value = duplicateDraft(props.entry.owner, row.value); agOpen.value = true } }
function onSaved(msg: string) { successToast(msg); remarks.value = row.value?.remarks ?? '' }

// ── Delete ──
const delOpen = ref(false)
function confirmDelete() {
  if (!props.entry || !row.value) return
  successToast(removeAgreement(props.entry.owner, row.value.id).msg)
  emit('close')
}
</script>

<template>
  <ErpDrawer :is-open="!!entry" :title="t('Document details')" width="560px" @close="emit('close')">
    <template #body>
      <div v-if="entry && row" class="bdd" data-devchange="bo-docs-drawer">
        <div class="bdd-head">
          <span class="bc-caption bdd-section">{{ sectionLabel }} · {{ entry.partnerSub }}</span>
          <h2 class="bdd-title">{{ agName(row) }}</h2>
          <ErpStatusBadge badge-for="additionalInformation" :status="status" />
        </div>

        <MpBanner v-if="entry.onTicket" id="bdd-ticket-note" variant="info">
          <MpBannerIcon id="bdd-ticket-note-icon" />
          <MpBannerDescription>{{ t('On a registration ticket in Agreement Drafting. This document stays fully editable and removable until the ticket leaves Agreement Drafting.') }}</MpBannerDescription>
        </MpBanner>

        <div>
          <ContentList horizontal :label="entry.onTicket ? t('Registration') : t('Partner')">
            <span class="cell-link" @click="router.push(ownerLink)">{{ entry.partner }}</span>
          </ContentList>
          <ContentList horizontal :label="t('Account Owner')" :value="entry.ao" />
          <ContentList horizontal :label="t('Method')" :value="row.method === 'esign' ? t('By E-Sign') : t('Manual')" />
          <ContentList horizontal :label="t('Master agreement')" :value="ma ? `${ma.name} · ${ma.status}` : '—'" />
          <ContentList horizontal :label="t('Start date')" :value="formatDateLong(row.start)" />
          <ContentList horizontal :label="t('End date')" :value="formatDateLong(row.end)" />
          <ContentList horizontal :label="t('Replaced agreement')">
            <span v-if="replaced" class="cell-link" @click="emit('open', `${entry.owner.kind}:${entry.owner.id}:${replaced.id}`)">{{ agName(replaced) }}</span>
            <span v-else>—</span>
          </ContentList>
          <template v-if="row.method === 'esign'">
            <ContentList horizontal :label="t('Mekari Sign document')">
              <span v-if="signDoc" class="bdd-sign">
                <a class="cell-link" :href="docUrl(signDoc.id)" target="_blank" rel="noopener">{{ signDoc.id }}</a>
                <ErpStatusBadge :status="signDoc.signed ? 'completed' : 'pending'" :label="signDoc.signed ? t('Fully signed') : t('Awaiting signatures')" />
              </span>
              <span v-else>{{ t('Not linked yet') }}</span>
            </ContentList>
            <ContentList v-if="signDoc" horizontal :label="t('Signing URL')">
              <a class="cell-link" :href="signUrl(signDoc.id)" target="_blank" rel="noopener">{{ signUrl(signDoc.id) }}</a>
            </ContentList>
          </template>
          <ContentList v-else horizontal :label="t('Document file')" :value="row.file || t('Not uploaded yet')" />
        </div>

        <MpFormControl id="bdd-remarks">
          <div class="bc-lbl-row"><MpFormLabel>{{ t('Remarks (optional)') }}</MpFormLabel><span class="bc-counter">{{ remarks.length }}/250</span></div>
          <MpTextarea id="bdd-remarks-input" v-model="remarks" maxlength="250" is-full-width />
          <span class="bc-caption">{{ canFull ? t('Use Edit document to change the master agreement, dates, Mekari Sign document or file.') : t('COMPLETED and EXPIRED documents allow only remarks to be edited.') }}</span>
          <span v-if="remarksNote" class="bc-err">{{ remarksNote }}</span>
        </MpFormControl>
      </div>
    </template>
    <template #footer>
      <div v-if="entry" class="bdd-footer">
        <MpButton v-if="canFull" variant="danger" is-rounded @click="delOpen = true">{{ tr('Delete {object}', { object: t('document') }) }}</MpButton>
        <span class="bdd-spacer" />
        <MpButton v-if="canDuplicate" class="btn-enterprise btn-enterprise--secondary" variant="secondary" is-rounded @click="openDuplicate">{{ t('Duplicate') }}</MpButton>
        <MpButton v-if="canFull" class="btn-enterprise btn-enterprise--secondary" variant="secondary" is-rounded @click="openEdit">{{ t('Edit document') }}</MpButton>
        <MpButton variant="primary" is-rounded @click="saveRemarks">{{ t('Save remarks') }}</MpButton>
      </div>
    </template>
  </ErpDrawer>

  <BoAgreementModal :is-open="agOpen" :draft="agDraft" @close="agOpen = false" @saved="onSaved" />

  <ConfirmModal
    v-model:is-open="delOpen"
    :title="tr('Delete {object}?', { object: t('document') })"
    :description="`${row ? agName(row) : ''}. ${tr('Deleted {object} cannot be restored.', { object: t('document') })}${row?.method === 'esign' ? ' ' + t('The linked Mekari Sign document is not changed.') : ''}`"
    :confirm-label="tr('Delete {object}', { object: t('document') })"
    @confirm="confirmDelete"
  />
</template>

<style scoped src="./bo-content.css"></style>
<style scoped>
.bdd { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.bdd-head { display: flex; flex-direction: column; align-items: flex-start; gap: var(--mp-spacing-1); }
.bdd-section { margin-top: 0; }
.bdd-title { margin: 0; font-size: var(--mp-font-sizes-xl, 20px); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-xl, 28px); color: var(--mp-text-default); overflow-wrap: anywhere; }
.bdd-sign { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--mp-spacing-2); }
.bdd-footer { display: flex; flex-wrap: wrap; align-items: center; gap: var(--mp-spacing-2); width: 100%; }
.bdd-spacer { flex: 1; }
.cell-link { overflow-wrap: anywhere; }
</style>
