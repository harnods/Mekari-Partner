<script setup lang="ts">
/**
 * RegRejectModal — J-09 Rejection reason. Opened from the ticket drawer's
 * Reject button or by dropping a card on the Rejected column (moveTicket →
 * needs: 'reject'). The reason is required: the danger button stays clickable
 * and an empty reason shows an inline error (rule/btn-no-disabled-validation,
 * rule/form-errors-inline). Confirm → rejectTicket(); the page raises the
 * success toast with the store's message.
 * MpModal md, close × / Cancel only (rule/modal-drawer-close-explicit-only),
 * top-aligned like ConfirmModal (rule/modal-alert-top-align).
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpTextarea,
} from '@mekari/pixel3'
import { getTicket, rejectTicket, tr } from '~/data/backoffice'

const props = defineProps<{ isOpen: boolean; ticketId: string | null }>()
const emit = defineEmits<{ close: []; rejected: [msg: string] }>()
const { t } = useLocale()

// Keep the last ticket while the modal animates closed — the page clears
// `ticketId` on close, and dropping the content mid-transition left the overlay behind.
const keptId = ref<string | null>(null)
watch(() => props.ticketId, (v) => { if (v) keptId.value = v }, { immediate: true })
const ticket = computed(() => (keptId.value ? getTicket(keptId.value) : undefined))
const reason = ref('')
const error = ref('')
watch(() => props.isOpen, (open) => { if (open) { reason.value = ''; error.value = '' } })
watch(reason, (v) => { if (v.trim()) error.value = '' })

function confirm() {
  if (!ticket.value) return
  if (!reason.value.trim()) { error.value = t('Enter a reason.'); return }
  const res = rejectTicket(ticket.value.id, reason.value)
  if (!res.ok) { error.value = res.msg; return }
  emit('rejected', res.msg)
}
</script>

<template>
  <MpModal
    id="bo-reg-reject-modal"
    :is-open="isOpen"
    size="md"
    :is-centered="false"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent v-if="ticket" data-devchange="bo-reg-reject">
      <MpModalHeader>
        {{ tr('Reject {brand}?', { brand: ticket.brand }) }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="rrm-body">
          <p class="rrm-lead">{{ tr('This registration moves to Rejected and can no longer be edited. We will email the reason to {email}, and partner code {code} becomes available again.', { email: ticket.email, code: ticket.code }) }}</p>
          <MpFormControl id="rrm-reason" :is-invalid="!!error" is-required>
            <MpFormLabel>{{ t('Rejection reason') }}</MpFormLabel>
            <MpTextarea id="rrm-reason-input" v-model="reason" :rows="4" is-full-width :is-invalid="!!error" />
            <span v-if="!error" class="rrm-caption">{{ t('Explain which data is invalid and what the registrant needs to fix.') }}</span>
            <MpFormErrorMessage>{{ error }}</MpFormErrorMessage>
          </MpFormControl>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Cancel') }}</MpButton>
          <MpButton variant="danger" is-rounded @click="confirm">{{ t('Reject and send email') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped>
.rrm-body { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.rrm-lead { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
.rrm-body :deep(textarea) { min-height: 96px; }
.rrm-caption { display: block; margin-top: var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
</style>
