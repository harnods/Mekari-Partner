<script setup lang="ts">
/**
 * RegCompleteModal — J-11 Move to Completed. Confirms what completing does
 * (completePreview: partner created / Unregistered partner switched, admin
 * member, Zoho call). Confirm → completeTicket(); a failed re-check (e.g. a
 * document changed meanwhile) shows inline in the modal, never a toast.
 * Top-aligned confirm (rule/modal-alert-top-align), close × / Cancel only.
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup,
} from '@mekari/pixel3'
import { getTicket, completePreview, completeTicket } from '~/data/backoffice'

const props = defineProps<{ isOpen: boolean; ticketId: string | null }>()
const emit = defineEmits<{ close: []; completed: [payload: { msg: string; partnerId?: string }] }>()
const { t } = useLocale()

// Keep the last ticket while the modal animates closed — the page clears
// `ticketId` on close, and dropping the content mid-transition left the overlay behind.
const keptId = ref<string | null>(null)
watch(() => props.ticketId, (v) => { if (v) keptId.value = v }, { immediate: true })
const ticket = computed(() => (keptId.value ? getTicket(keptId.value) : undefined))
const preview = computed(() => (keptId.value ? completePreview(keptId.value) : { title: '', lines: [] }))
const error = ref('')
watch(() => props.isOpen, (open) => { if (open) error.value = '' })

function confirm() {
  if (!ticket.value) return
  const res = completeTicket(ticket.value.id)
  if (!res.ok) { error.value = res.msg; return }
  emit('completed', { msg: res.msg, partnerId: res.partnerId })
}
</script>

<template>
  <MpModal
    id="bo-reg-complete-modal"
    :is-open="isOpen"
    size="md"
    :is-centered="false"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent v-if="ticket" data-devchange="bo-reg-complete">
      <MpModalHeader>
        {{ preview.title }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="rcm-body">
          <ul class="rcm-list">
            <li v-for="ln in preview.lines" :key="ln">{{ ln }}</li>
          </ul>
          <p class="rcm-note">{{ t('Completed is final. The registration can no longer be edited after this.') }}</p>
          <p v-if="error" class="rcm-err" role="alert">{{ error }}</p>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Cancel') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="confirm">{{ t('Move to Completed') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped>
.rcm-body { display: flex; flex-direction: column; gap: var(--mp-spacing-3); }
.rcm-list { margin: 0; padding-left: var(--mp-spacing-5, 20px); display: flex; flex-direction: column; gap: var(--mp-spacing-2); list-style: disc outside; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-default); }
.rcm-list li { display: list-item; }
.rcm-note { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
.rcm-err { margin: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-danger); }
</style>
