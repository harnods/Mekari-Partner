<script setup lang="ts">
/**
 * Registrations — "All filters" drawer. Same ErpDrawer shell and field shapes as
 * CrmDealsFiltersDrawer (edits a local draft, commits only on Apply):
 *   • Submitted date — AdvancedDateRangePicker (This week / This month /
 *     Last month / Last 3 months + Custom date range)
 *   • Entity type, Tax status, Needs attention — ErpFilterSelect
 *   • Province, Industry, Specialization, Target industry, Customer segment,
 *     Deal size — ErpTagComparatorField (Is any of / Is none of)
 * The filter bar (Account Owner / Product / Source / search) stays independent.
 */
import { reactive, watch } from 'vue'
import { MpButton } from '@mekari/pixel3'
import ErpDrawer from '~/components/patterns/ErpDrawer.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpTagComparatorField from '~/components/patterns/ErpTagComparatorField.vue'
import AdvancedDateRangePicker from '~/components/patterns/AdvancedDateRangePicker.vue'
import {
  REG_TAG_FIELDS, REG_TAG_LABEL, REG_ATTENTION_LABEL, TAX_NONE, emptyRegDrawerFilters,
  type RegDrawerFilters, type RegTagField, type RegAttention,
} from './regLogic'

const props = defineProps<{
  isOpen: boolean
  modelValue: RegDrawerFilters
  tagOptions: Record<RegTagField, string[]>
}>()
const emit = defineEmits<{ 'update:isOpen': [v: boolean]; apply: [v: RegDrawerFilters] }>()
const { t } = useLocale()

const DATE_PRESETS = [
  { key: 'thisWeek' as const, label: 'This week' },
  { key: 'thisMonth' as const, label: 'This month' },
  { key: 'lastMonth' as const, label: 'Last month' },
  { key: 'last3Months' as const, label: 'Last 3 months' },
]
const entityOptions = [{ value: 'Company', label: t('Company') }, { value: 'Individual', label: t('Individual') }]
const taxOptions = [{ value: 'PKP', label: 'PKP' }, { value: 'Non-PKP', label: 'Non-PKP' }, { value: TAX_NONE, label: t('Not set') }]
const attentionOptions = (Object.keys(REG_ATTENTION_LABEL) as RegAttention[]).map((k) => ({ value: k, label: t(REG_ATTENTION_LABEL[k]) }))

const clone = (v: RegDrawerFilters): RegDrawerFilters => ({
  ...v, date: v.date ? [...v.date] : null,
  tags: Object.fromEntries(REG_TAG_FIELDS.map((k) => [k, { cmp: v.tags[k].cmp, values: [...v.tags[k].values] }])) as RegDrawerFilters['tags'],
})
const draft = reactive<RegDrawerFilters>(clone(props.modelValue))
watch(() => props.isOpen, (open) => { if (open) Object.assign(draft, clone(props.modelValue)) })

function close() { emit('update:isOpen', false) }
function apply() { emit('apply', clone(draft)); close() }
function resetAll() { Object.assign(draft, emptyRegDrawerFilters()) }
</script>

<template>
  <ErpDrawer :is-open="isOpen" :title="t('All filters')" @close="close">
    <template #body>
      <div class="rfd-field" data-devchange="bo-reg-all-filters">
        <span class="rfd-label">{{ t('Submitted date') }}</span>
        <AdvancedDateRangePicker
          id="reg-f-date"
          :model-value="draft.date"
          :presets="DATE_PRESETS"
          is-full-width
          hide-label
          :placeholder="t('Select submitted date')"
          @update:model-value="draft.date = $event"
        />
      </div>

      <div class="rfd-field">
        <span class="rfd-label">{{ t('Needs attention') }}</span>
        <ErpFilterSelect id="reg-f-attention" v-model="draft.attention" :placeholder="t('Select status')" :options="attentionOptions" width="100%" />
      </div>

      <div class="rfd-field">
        <span class="rfd-label">{{ t('Entity type') }}</span>
        <ErpFilterSelect id="reg-f-entity" v-model="draft.entity" :placeholder="t('Select entity type')" :options="entityOptions" width="100%" />
      </div>

      <div class="rfd-field">
        <span class="rfd-label">{{ t('Tax status') }}</span>
        <ErpFilterSelect id="reg-f-tax" v-model="draft.tax" :placeholder="t('Select tax status')" :options="taxOptions" width="100%" />
      </div>

      <div v-for="k in REG_TAG_FIELDS" :key="k" class="rfd-field">
        <span class="rfd-label">{{ t(REG_TAG_LABEL[k]) }}</span>
        <ErpTagComparatorField
          :id="`reg-f-${k}`"
          :comparator="draft.tags[k].cmp"
          :values="draft.tags[k].values"
          :options="tagOptions[k]"
          :placeholder="t('Type to search…')"
          @update:comparator="draft.tags[k].cmp = $event as 'isAnyOf' | 'isNoneOf'"
          @update:values="draft.tags[k].values = $event"
        />
      </div>
    </template>

    <template #footer>
      <MpButton variant="ghost" is-rounded type="button" @click="resetAll">{{ t('Reset filter') }}</MpButton>
      <div class="rfd-footer-right">
        <MpButton variant="ghost" is-rounded type="button" @click="close">{{ t('Cancel') }}</MpButton>
        <MpButton variant="primary" is-rounded type="button" @click="apply">{{ t('Apply') }}</MpButton>
      </div>
    </template>
  </ErpDrawer>
</template>

<style scoped>
.rfd-field { display: flex; flex-direction: column; gap: var(--mp-spacing-1); }
.rfd-label { font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.rfd-footer-right { display: flex; align-items: center; gap: var(--mp-spacing-2); }
</style>
