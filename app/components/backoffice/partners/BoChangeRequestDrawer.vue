<script setup lang="ts">
/**
 * N-01 Change request detail — side panel over the Partner Data Change list
 * (shared ErpDrawer Teleport shell, rule/drawer-custom-shell; close × only,
 * rule/modal-drawer-close-explicit-only).
 *
 * Body: partner + submitter, a decision banner for final requests, then the
 * FIELD · CURRENT · REQUESTED comparison (crRowsView) in ErpTablePage
 * (rule/table-use-erptablepage) with changed rows flagged.
 * In review → footer Reject (danger → reason modal, reason required inline) +
 * Approve (primary → confirm). Approved / Rejected / Cancelled are final and
 * read-only (footer: Close only).
 */
import { ref, computed, watch } from 'vue'
import {
  MpButton, MpBadge, MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription,
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpTextarea,
} from '@mekari/pixel3'
import ErpDrawer from '~/components/patterns/ErpDrawer.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import {
  tr, getCr, getPartner, partnerName, crRowsView, crDecidedText, approveCr, rejectCr, BO_CR_CAPTION,
} from '~/data/backoffice'
import { formatDateLong } from '~/utils/date'
import { successToast } from '~/utils/toasts'

const props = defineProps<{ crId: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useLocale()

const cr = computed(() => (props.crId ? getCr(props.crId) : undefined))
const partner = computed(() => (cr.value ? getPartner(cr.value.pid) : undefined))
const isOpen = computed(() => cr.value?.status === 'In review')
const decided = computed(() => (cr.value ? crDecidedText(cr.value) : { verb: '', by: '', on: '' }))
const decidedLine = computed(() => `${decided.value.verb} ${decided.value.by} ${t('on')} ${formatDateLong(decided.value.on)}.`)

const columns: TableColumn[] = [
  { key: 'label', label: t('Field'), sortType: 'text' },
  { key: 'current', label: t('Current'), kind: 'address' },
  { key: 'requested', label: t('Requested'), kind: 'address' },
]
const rows = computed(() => (cr.value ? crRowsView(cr.value).map((r) => ({ ...r })) : []))
const changedCount = computed(() => rows.value.filter((r) => r.changed).length)

// ── Approve (confirmed) ──
const approveOpen = ref(false)
const actionErr = ref('')
function approve() {
  if (!cr.value) return
  const res = approveCr(cr.value.id)
  if (!res.ok) { actionErr.value = res.msg; return }
  successToast(res.msg)
}

// ── Reject (reason required, inline) ──
const rejectOpen = ref(false)
const reason = ref('')
const reasonErr = ref('')
function openReject() { reason.value = ''; reasonErr.value = ''; rejectOpen.value = true }
function confirmReject() {
  if (!cr.value) return
  if (!reason.value.trim()) { reasonErr.value = t('You must fill in a reason'); return }
  const res = rejectCr(cr.value.id, reason.value)
  if (!res.ok) { reasonErr.value = res.msg; return }
  rejectOpen.value = false
  successToast(res.msg)
}
watch(() => props.crId, () => { actionErr.value = ''; rejectOpen.value = false; approveOpen.value = false })
</script>

<template>
  <ErpDrawer :is-open="!!cr" :title="cr ? `${t('Change request')} ${cr.id}` : ''" width="720px" @close="emit('close')">
    <template #body>
      <div v-if="cr" class="bcr" data-devchange="bo-pdc-drawer">
        <div class="bcr-head">
          <div class="bcr-title-row">
            <h3 class="bcr-h3">{{ partner ? partnerName(partner) : cr.pid }}</h3>
            <ErpStatusBadge badge-for="additionalInformation" :status="cr.status" :label="t(cr.status)" />
          </div>
          <p class="bcr-meta">
            <NuxtLink v-if="partner" class="bcr-link" :to="`/backoffice/partners/${partner.id}`">{{ partner.id }} · {{ partner.legal }}</NuxtLink>
            <span v-else>{{ cr.pid }}</span>
          </p>
          <p class="bcr-meta">{{ tr('Submitted by {who} ({email}) on {date}', { who: cr.by, email: cr.email, date: formatDateLong(cr.date) }) }}</p>
        </div>

        <MpBanner v-if="cr.status === 'Rejected'" id="bcr-banner-rejected" variant="danger">
          <MpBannerIcon id="bcr-banner-rejected-icon" />
          <MpBannerTitle>{{ t('Rejected') }}</MpBannerTitle>
          <MpBannerDescription>{{ cr.reason }} {{ decidedLine }} {{ t('The partner admin was informed by email.') }}</MpBannerDescription>
        </MpBanner>
        <MpBanner v-else-if="cr.status === 'Approved'" id="bcr-banner-approved" variant="info">
          <MpBannerIcon id="bcr-banner-approved-icon" />
          <MpBannerTitle>{{ t('Approved') }}</MpBannerTitle>
          <MpBannerDescription>{{ decidedLine }} {{ t('The requested values were applied to the partner.') }}</MpBannerDescription>
        </MpBanner>
        <MpBanner v-else-if="cr.status === 'Cancelled'" id="bcr-banner-cancelled" variant="info">
          <MpBannerIcon id="bcr-banner-cancelled-icon" />
          <MpBannerTitle>{{ t('Cancelled') }}</MpBannerTitle>
          <MpBannerDescription>{{ decidedLine }} {{ t('The partner data did not change.') }}</MpBannerDescription>
        </MpBanner>

        <div class="bcr-table-head">
          <h3 class="bcr-h3">{{ t('Requested changes') }}</h3>
          <span class="bcr-meta">{{ tr('{n} of {total} fields changed', { n: changedCount, total: rows.length }) }} · {{ t(BO_CR_CAPTION[cr.status]) }}</span>
        </div>
        <div class="bcr-table">
          <ErpTablePage
            :columns="columns"
            :rows="(rows as Record<string, unknown>[])"
            :total="rows.length"
            :current-page="1"
            :per-page="25"
            :sticky-actions="false"
            no-row-hover
          >
            <template #cell-label="{ row }">
              <span class="bcr-field">
                <span>{{ (row as { label: string }).label }}</span>
                <MpBadge v-if="(row as { changed: boolean }).changed" for="tableStatus" type="warning">{{ t('Changed') }}</MpBadge>
              </span>
            </template>
            <template #cell-current="{ row }">
              <span :class="{ 'bcr-muted': !(row as { changed: boolean }).changed }">{{ (row as { current: string }).current }}</span>
            </template>
            <template #cell-requested="{ row }">
              <span :class="(row as { changed: boolean }).changed ? 'bcr-strong' : 'bcr-muted'">{{ (row as { requested: string }).requested }}</span>
            </template>
          </ErpTablePage>
        </div>
        <p v-if="actionErr" class="bcr-err" role="alert">{{ actionErr }}</p>
      </div>
    </template>
    <template #footer>
      <template v-if="cr && isOpen">
        <span class="bcr-foot-note">{{ t('The partner data does not change until the request is approved.') }}</span>
        <div class="bcr-foot-right">
          <MpButton variant="danger" is-rounded @click="openReject">{{ t('Reject') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="approveOpen = true">{{ t('Approve') }}</MpButton>
        </div>
      </template>
      <template v-else>
        <span />
        <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Close') }}</MpButton>
      </template>
    </template>
  </ErpDrawer>

  <ConfirmModal
    v-model:is-open="approveOpen"
    :title="tr('Approve {id}?', { id: cr?.id ?? '' })"
    :description="tr('The requested values replace the current data of {name}. Approved requests are final.', { name: partner ? partnerName(partner) : '' })"
    :confirm-label="t('Approve')"
    :cancel-label="t('Cancel')"
    :is-danger="false"
    @confirm="approve"
  />

  <MpModal
    id="bcr-reject-modal" :is-open="rejectOpen" size="md" :is-centered="false" :is-keep-alive="false"
    :is-close-on-esc="false" :is-close-on-overlay-click="false" @close="rejectOpen = false"
  >
    <MpModalContent data-devchange="bo-pdc-drawer">
      <MpModalHeader>
        {{ tr('Reject {id}?', { id: cr?.id ?? '' }) }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="bcr-reject">
          <p class="bcr-lead">{{ tr('The request moves to Rejected and is locked. The partner data does not change. The reason is emailed to the partner admin, {email}.', { email: cr?.email ?? '' }) }}</p>
          <MpFormControl id="bcr-reason" is-required :is-invalid="!!reasonErr">
            <MpFormLabel>{{ t('Reason') }}</MpFormLabel>
            <MpTextarea id="bcr-reason-input" v-model="reason" is-full-width @update:model-value="reasonErr = ''" />
            <MpFormErrorMessage>{{ reasonErr }}</MpFormErrorMessage>
          </MpFormControl>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="rejectOpen = false">{{ t('Cancel') }}</MpButton>
          <MpButton variant="danger" is-rounded @click="confirmReject">{{ t('Reject request') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped>
.bcr { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.bcr-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1); }
.bcr-title-row { display: flex; align-items: center; gap: var(--mp-spacing-3); flex-wrap: wrap; }
.bcr-h3 { margin: 0; font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); }
.bcr-meta { margin: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bcr-link { color: var(--mp-text-link); text-decoration: none; }
.bcr-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.bcr-table-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1); margin-bottom: calc(-1 * var(--mp-spacing-3)); }
/* read-only comparison: no pagination footer inside the drawer */
.bcr-table :deep(.erp-table-page > div:last-child:not(.erp-table-wrapper)) { display: none; }
.bcr-field { display: inline-flex; align-items: center; gap: var(--mp-spacing-2); flex-wrap: wrap; }
.bcr-strong { color: var(--mp-text-default); overflow-wrap: anywhere; }
.bcr-muted { color: var(--mp-text-secondary); overflow-wrap: anywhere; }
.bcr-err { margin: 0; font-size: var(--mp-font-sizes-md); color: var(--mp-text-danger); }
.bcr-foot-note { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bcr-foot-right { display: flex; align-items: center; gap: var(--mp-spacing-2); flex-shrink: 0; }
.bcr-reject { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.bcr-lead { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
</style>
