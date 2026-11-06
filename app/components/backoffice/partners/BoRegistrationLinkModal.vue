<script setup lang="ts">
/**
 * K-06 Registration form link — the pre-filled registration-form URL of an
 * Unregistered partner (registrationLink() in app/data/backoffice.ts).
 * MpModal md, close × / ghost Close only (rule/modal-drawer-close-explicit-only),
 * primary "Copy link" → success toast (rule/toast-success-only).
 */
import { computed } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpInput,
} from '@mekari/pixel3'
import ContentList from '~/components/patterns/ContentList.vue'
import { registrationLink, getPartner, partnerName, tr } from '~/data/backoffice'
import { successToast } from '~/utils/toasts'

const props = defineProps<{ isOpen: boolean; partnerId: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useLocale()

const link = computed(() => registrationLink(props.partnerId))
const partner = computed(() => getPartner(props.partnerId))

async function copy() {
  try { await navigator.clipboard.writeText(link.value.url) } catch { /* clipboard blocked — the link stays selectable in the field */ }
  successToast(t('Registration form link copied'))
  emit('close')
}
</script>

<template>
  <MpModal
    id="bo-reg-link-modal" :is-open="isOpen" size="md" :is-keep-alive="false"
    :is-close-on-esc="false" :is-close-on-overlay-click="false" @close="emit('close')"
  >
    <MpModalContent data-devchange="bo-partner-link-modal">
      <MpModalHeader>
        {{ t('Registration form link') }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="brl-body">
          <p class="brl-lead">
            {{ t('The form is pre-filled with this partner\'s legal name, country, province, city, website URL and LinkedIn URL; the submitter can edit them. The link becomes invalid once a registration is submitted through it. When that registration reaches Completed, this partner becomes Registered and the submitter joins it as admin.') }}
          </p>
          <MpFormControl id="brl-url">
            <MpFormLabel>{{ tr('Link for {name}', { name: partner ? partnerName(partner) : partnerId }) }}</MpFormLabel>
            <MpInput id="brl-url-input" :model-value="link.url" is-read-only is-full-width />
          </MpFormControl>
          <div class="brl-params">
            <h3 class="brl-h3">{{ t('Query parameters') }}</h3>
            <ContentList v-for="[k, v] in link.params" :key="k" :label="k" :value="v || '—'" horizontal />
          </div>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Close') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="copy">{{ t('Copy link') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped>
.brl-body { display: flex; flex-direction: column; gap: var(--mp-spacing-5); }
.brl-lead { margin: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }
.brl-params { display: flex; flex-direction: column; }
.brl-h3 { margin: 0 0 var(--mp-spacing-1); font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); }
.brl-params :deep(*) { word-break: break-all; }
</style>
