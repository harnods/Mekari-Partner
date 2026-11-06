<template>
  <ErpDrawer :is-open="isOpen" :title="t('Registration details')" width="480px" @close="emit('close')">
    <template #body>
      <p class="pregprev__note">
        {{ t('Submitted') }} {{ submittedLabel }} · {{ t('Read-only while under validation') }}
      </p>
      <div v-for="sec in sections" :key="sec.title" class="pregprev__sec">
        <div class="pregprev__sec-title">{{ sec.title }}</div>
        <ContentList
          v-for="row in sec.rows"
          :key="row.label"
          horizontal
          :label="row.label"
          :value="row.value || '—'"
        />
      </div>
    </template>
    <template #footer>
      <MpButton variant="secondary" is-rounded type="button" @click="emit('close')">{{ t('Close') }}</MpButton>
    </template>
  </ErpDrawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MpButton } from '@mekari/pixel3'
import ErpDrawer from '~/components/patterns/ErpDrawer.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import { buildPartnerRegReview } from '~/data/partnerRegReview'

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useLocale()
const partner = usePartnerStatus()

// Read-only summary of the submitted registration (same sections as the wizard's
// Step 4 review — see buildPartnerRegReview).
const sections = computed(() => buildPartnerRegReview(partner.draft.value, t))

const submittedLabel = computed(() => {
  const iso = partner.submittedAt.value
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
})
</script>

<style scoped>
.pregprev__note {
  font-size: var(--mp-font-sizes-sm, 12px);
  color: var(--mp-text-secondary, #3a4749);
  padding-bottom: var(--mp-spacing-3, 12px);
  margin-bottom: var(--mp-spacing-2, 8px);
  border-bottom: 1px solid var(--mp-border-default, #e3e7e9);
}
.pregprev__sec { margin-bottom: var(--mp-spacing-5, 20px); }
.pregprev__sec-title {
  font-size: var(--mp-font-sizes-md, 14px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  color: var(--mp-text-default, #080d0e);
  padding: var(--mp-spacing-2, 8px) 0;
}
</style>
