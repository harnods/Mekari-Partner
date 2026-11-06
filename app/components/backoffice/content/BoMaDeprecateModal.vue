<script setup lang="ts">
/**
 * BoMaDeprecateModal — L-02 Deprecate master agreement. Shows the impact (partners,
 * non-expired partner documents, Agreement Drafting tickets), a replacement picker
 * (MpAutocomplete of ACTIVE same-type master agreements — rule/select-erpfilterselect)
 * and a typed "DEPRECATE" confirmation, then runs deprecateMa() → re-agreement batch.
 * MpModal md, close × only, ghost Cancel + danger "Deprecate master agreement"
 * (rule/btn-danger-confirm), never disabled — missing input → inline errors.
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpAutocomplete,
  MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription,
} from '@mekari/pixel3'
import { getMa, impact, deprecateOptions, deprecateMa, tr } from '~/data/backoffice'

const props = defineProps<{ isOpen: boolean; maId: string }>()
const emit = defineEmits<{ close: []; done: [msg: string] }>()
const { t } = useLocale()

const ma = computed(() => getMa(props.maId))
const repl = ref('')
const typed = ref('')
const tried = ref(false)
const failMsg = ref('')
watch(() => props.isOpen, (o) => { if (o) { repl.value = ''; typed.value = ''; tried.value = false; failMsg.value = '' } })

const options = computed(() => deprecateOptions(props.maId).map((m) => ({ value: m.id, label: m.name })))
const imp = computed(() => impact(props.maId))
const stats = computed(() => [
  { n: imp.value.partners, label: t('Partners using it') },
  { n: imp.value.docs.length, label: t('Non-expired partner documents') },
  { n: imp.value.tickets, label: t('Agreement Drafting tickets') },
])
const replErr = computed(() => (tried.value && !repl.value ? (options.value.length ? t('Select the replacement master agreement.') : t('Activate a replacement of the same type first.')) : ''))
const typedErr = computed(() => (tried.value && typed.value.trim() !== 'DEPRECATE' ? t('Type DEPRECATE in capital letters to confirm.') : ''))

function confirm() {
  tried.value = true
  if (replErr.value || typedErr.value) return
  const res = deprecateMa(props.maId, repl.value)
  if (!res.ok) { failMsg.value = res.msg; return }
  emit('done', res.msg)
  emit('close')
}
</script>

<template>
  <MpModal
    id="bo-ma-deprecate-modal"
    :is-open="isOpen"
    size="md"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent v-if="ma" data-devchange="bo-cfg-ma-deprecate">
      <MpModalHeader>
        {{ tr('Deprecate {name}?', { name: ma.name }) }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="bc-body">
          <p class="bc-lead">{{ tr('Choose the ACTIVE {type} master agreement that replaces it. DEPRECATED is final.', { type: ma.type }) }}</p>

          <MpBanner v-if="!options.length" id="bo-ma-dep-none" variant="warning">
            <MpBannerIcon id="bo-ma-dep-none-icon" />
            <MpBannerTitle>{{ t('No replacement available') }}</MpBannerTitle>
            <MpBannerDescription>{{ t('Activate a master agreement of the same type first. A common path is Duplicate, upload the new PDF, then set it to ACTIVE.') }}</MpBannerDescription>
          </MpBanner>

          <MpFormControl id="bo-ma-dep-repl" :is-invalid="!!replErr">
            <MpFormLabel>{{ t('Replacement master agreement') }}</MpFormLabel>
            <div class="bmd-half">
              <MpAutocomplete id="bo-ma-dep-repl-ac" v-model="repl" :data="options" label-prop="label" value-prop="value" use-portal is-full-width :is-invalid="!!replErr" />
            </div>
            <span class="bc-caption">{{ tr('Only ACTIVE {type} master agreements are listed.', { type: ma.type }) }}</span>
            <MpFormErrorMessage>{{ replErr }}</MpFormErrorMessage>
          </MpFormControl>

          <div class="bmd-stats">
            <div v-for="s in stats" :key="s.label" class="bmd-stat">
              <span class="bmd-stat-n">{{ s.n }}</span>
              <span class="bc-caption bmd-stat-l">{{ s.label }}</span>
            </div>
          </div>
          <p class="bc-lead">{{ t('Confirm creates a re-agreement batch: one new PENDING document on the replacement for each non-expired partner document, in the same section, with Replaced agreement set to the old document. Agreement Drafting tickets cannot move to Completed until their rows use an ACTIVE master agreement.') }}</p>

          <MpFormControl id="bo-ma-dep-typed" :is-invalid="!!typedErr">
            <MpFormLabel>{{ t('Type DEPRECATE to confirm') }}</MpFormLabel>
            <MpInput id="bo-ma-dep-typed-input" v-model="typed" autocomplete="off" />
            <MpFormErrorMessage>{{ typedErr }}</MpFormErrorMessage>
          </MpFormControl>
          <span v-if="failMsg" class="bc-err">{{ failMsg }}</span>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Cancel') }}</MpButton>
          <MpButton variant="danger" is-rounded @click="confirm">{{ t('Deprecate master agreement') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped src="./bo-content.css"></style>
<style scoped>
.bmd-half { width: 100%; max-width: 267px; }
.bmd-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--mp-spacing-3); }
.bmd-stat {
  display: flex; flex-direction: column; gap: var(--mp-spacing-1);
  padding: var(--mp-spacing-3);
  border: 1px solid var(--mp-colors-border-default, #e3e7e9);
  border-radius: var(--mp-radii-md, 6px);
}
.bmd-stat-n { font-size: var(--mp-font-sizes-2xl); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-2xl, 32px); color: var(--mp-text-default); }
.bmd-stat-l { margin-top: 0; }
@media (max-width: 480px) { .bmd-stats { grid-template-columns: 1fr; } }
</style>
