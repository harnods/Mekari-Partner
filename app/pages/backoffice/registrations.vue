<script setup lang="ts">
/**
 * Backoffice — Registrations (J-02 board, J-04 ticket, J-09 reject, J-11 complete).
 *
 *   BoPage "Registrations"
 *   ├ filter bar (CrmDealsPage board pattern): Account Owner · Product · Source |
 *   │   Export · search pill (rule/filter-bar-anatomy, rule/filter-bar-search-pill)
 *   ├ inline drop feedback banner (a blocked drop explains itself here — never a toast)
 *   ├ RegBoard — 5 stage columns, pointer drag (rule/dnd-live-sortable)
 *   │   or an empty / filtered-empty state (rule/empty-state-structure)
 *   ├ RegTicketDrawer — opened by a card or deep link ?ticket=REG-0152
 *   ├ RegRejectModal / RegCompleteModal — opened when a move `needs` them
 *   └ ScenarioFab — Default · Empty state · Loading (rule/index-scenario-fab)
 *
 * All state and rules live in app/data/backoffice.ts (moveTicket, rejectTicket,
 * completeTicket …); this page only filters, routes and opens surfaces.
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription, MpBannerCloseButton,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import RegBoard, { type RegColumn } from '~/components/backoffice/registrations/RegBoard.vue'
import RegTicketDrawer from '~/components/backoffice/registrations/RegTicketDrawer.vue'
import RegFiltersDrawer from '~/components/backoffice/registrations/RegFiltersDrawer.vue'
import RegRejectModal from '~/components/backoffice/registrations/RegRejectModal.vue'
import RegCompleteModal from '~/components/backoffice/registrations/RegCompleteModal.vue'
import { bo, getTicket, moveTicket, setTicketOrder, tr, BO_STAGES } from '~/data/backoffice'
import { successToast } from '~/utils/toasts'
import {
  AE_NONE, emptyRegFilters, filterTickets, hasActiveFilters, distinctOf, sortTickets,
  drawerFilterCount, distinctTags, REG_TAG_FIELDS, type RegDrawerFilters, type RegTagField,
} from '~/components/backoffice/registrations/regLogic'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

// ── Scenario + first-load skeleton (rule/index-scenario-fab, rule/index-first-load-skeleton) ──
const scenario = ref('data')
const firstLoad = ref(true)
onMounted(() => { window.setTimeout(() => { firstLoad.value = false }, 400) })
const loading = computed(() => firstLoad.value || scenario.value === 'loading')
const source = computed(() => (scenario.value === 'empty' ? [] : bo.tickets))

// ── Filters ─────────────────────────────────────────────────────────────────
const filters = reactive(emptyRegFilters())
const filtered = computed(() => filterTickets(source.value, filters))
const isFiltered = computed(() => hasActiveFilters(filters))
function resetFilters() { Object.assign(filters, emptyRegFilters()) }

const aeFilterOptions = computed(() => [
  { value: AE_NONE, label: t('No Account Owner') },
  ...[...bo.aes].sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({ value: a.email, label: a.name })),
])
const productOptions = computed(() => distinctOf(bo.tickets, 'product'))

// ── All filters drawer (submitted date, entity, tax, attention, profile tags) ──
const filtersOpen = ref(false)
const drawerCount = computed(() => drawerFilterCount(filters))
const tagOptions = computed(() =>
  Object.fromEntries(REG_TAG_FIELDS.map((k) => [k, distinctTags(bo.tickets, k)])) as Record<RegTagField, string[]>)
function applyDrawer(v: RegDrawerFilters) { Object.assign(filters, v) }
const sourceOptions = computed(() => distinctOf(bo.tickets, 'source'))

const columns = computed<RegColumn[]>(() =>
  BO_STAGES.map((stage) => ({ stage, tickets: sortTickets(filtered.value.filter((tk) => tk.stage === stage)) })))

// ── Drop feedback (inline, rule/form-errors-inline) ─────────────────────────
const dropErr = ref<{ key: number; title: string; msg: string } | null>(null)
let errSeq = 0
function onDrop({ id, to, order }: { id: string; to: (typeof BO_STAGES)[number]; order: string[] }) {
  const res = moveTicket(id, to)
  if (res.same) { if (order.length) setTicketOrder(order); return }
  const tk = getTicket(id)
  if (!res.ok) {
    dropErr.value = { key: ++errSeq, title: tr('{id} cannot move to {stage}', { id, stage: t(to) }), msg: res.msg }
    return
  }
  dropErr.value = null
  if (res.needs === 'reject') { rejectFor.value = id; return }
  if (res.needs === 'complete') { completeFor.value = id; return }
  if (order.length) setTicketOrder(order)
  successToast(tk ? `${tk.id} · ${res.msg}` : res.msg)
}

// ── Ticket drawer + deep link (?ticket=REG-0152) ────────────────────────────
const openId = ref<string | null>(null)
const notFoundId = ref('')
watch(() => route.query.ticket, (q) => {
  const id = typeof q === 'string' ? q : ''
  if (!id) { openId.value = null; return }
  if (getTicket(id)) { openId.value = id; notFoundId.value = '' }
  else { openId.value = null; notFoundId.value = id }
}, { immediate: true })
function openTicket(id: string) {
  dropErr.value = null
  router.replace({ query: { ...route.query, ticket: id } })
}
function closeTicket() {
  const { ticket: _drop, ...rest } = route.query
  router.replace({ query: rest })
}

// ── Reject / Complete modals ────────────────────────────────────────────────
const rejectFor = ref<string | null>(null)
const completeFor = ref<string | null>(null)
function onNeeds({ kind, id }: { kind: 'reject' | 'complete'; id: string }) {
  if (kind === 'reject') rejectFor.value = id
  else completeFor.value = id
}
function onRejected(msg: string) { rejectFor.value = null; successToast(msg) }
function onCompleted({ msg }: { msg: string }) { completeFor.value = null; successToast(msg) }

// ── Export (rule/filter-bar-search-export → ExportModal) ────────────────────
const exportOpen = ref(false)
const exportColumns = computed(() => [
  { key: 'id', label: t('Ticket number'), required: true }, { key: 'brand', label: t('Business name') },
  { key: 'stage', label: t('Stage') }, { key: 'code', label: t('Partner code') }, { key: 'entity', label: t('Entity type') },
  { key: 'product', label: t('Product') }, { key: 'source', label: t('Source') }, { key: 'ae', label: t('Account Owner') },
  { key: 'date', label: t('Submitted') }, { key: 'submitter', label: t('Submitted by') }, { key: 'email', label: t('Email') },
])
function onExport() { exportOpen.value = false; successToast(t('Export ready — check your downloads')) }

useHead({ title: () => `Mekari Partner | ${t('Registrations')}` })
</script>

<template>
  <BoPage :title="t('Registrations')">
    <!-- Filter bar -->
    <div class="reg-filterbar" data-devchange="bo-reg-filters">
      <div class="filter-left">
        <ErpFilterSelect id="reg-ae-filter" v-model="filters.ae" :placeholder="t('Account Owner')" :options="aeFilterOptions" width="200px" />
        <ErpFilterSelect id="reg-product-filter" v-model="filters.product" :placeholder="t('Product')" :options="productOptions" />
        <ErpFilterSelect id="reg-source-filter" v-model="filters.source" :placeholder="t('Source')" :options="sourceOptions" />
        <MpButton
          variant="secondary" left-icon="filter" is-rounded
          class="filter-all-btn" :class="{ 'filter-all-btn--active': drawerCount > 0 }"
          @click="filtersOpen = true"
        >{{ t('All filters') }}{{ drawerCount > 0 ? ` (${drawerCount})` : '' }}</MpButton>
      </div>
      <div class="filter-right">
        <MpButtonGroup class="filter-btn-group">
          <MpTooltip :label="t('Export')" placement="bottom">
            <MpButton variant="ghost" left-icon="download" :aria-label="t('Export')" is-rounded @click="exportOpen = true" />
          </MpTooltip>
        </MpButtonGroup>
        <div class="filter-search">
          <MpIcon name="search" size="sm" />
          <input v-model="filters.q" class="filter-search-input" type="text" :placeholder="t('Search registrations…')" />
          <MpButton v-if="filters.q" class="search-clear-btn" type="button" left-icon="close" :aria-label="t('Clear search')" @click="filters.q = ''" />
        </div>
      </div>
    </div>

    <!-- Inline feedback: a blocked drop, or a deep link to a missing ticket -->
    <MpBanner v-if="dropErr" :id="`reg-drop-err-${dropErr.key}`" :key="dropErr.key" variant="danger" class="reg-banner" data-devchange="bo-reg-drop-feedback">
      <MpBannerIcon />
      <MpBannerTitle>{{ dropErr.title }}</MpBannerTitle>
      <MpBannerDescription>{{ dropErr.msg }}</MpBannerDescription>
      <MpBannerCloseButton @click="dropErr = null" />
    </MpBanner>
    <MpBanner v-if="notFoundId" id="reg-not-found" variant="warning" class="reg-banner">
      <MpBannerIcon />
      <MpBannerDescription>{{ tr('Ticket {id} was not found. It may have been removed or the link is wrong.', { id: notFoundId }) }}</MpBannerDescription>
      <MpBannerCloseButton @click="closeTicket(); notFoundId = ''" />
    </MpBanner>

    <!-- Empty (no registrations yet) -->
    <div v-if="!loading && !source.length" class="reg-empty" data-devchange="bo-reg-empty">
      <img src="/illustrations/empty-folder.png" alt="" class="reg-empty__art" />
      <span class="reg-empty__title">{{ t('No registrations yet') }}</span>
      <span class="reg-empty__caption">{{ t('Registrations submitted from the partner app appear here.') }}</span>
      <MpButton variant="secondary" is-rounded @click="router.push('/backoffice/partners')">{{ t('View partners') }}</MpButton>
    </div>
    <!-- Filtered to nothing -->
    <div v-else-if="!loading && isFiltered && !filtered.length" class="reg-empty">
      <img src="/illustrations/empty-folder.png" alt="" class="reg-empty__art" />
      <span class="reg-empty__title">{{ t('No registrations match these filters') }}</span>
      <span class="reg-empty__caption">{{ t('Try another keyword or reset the filters.') }}</span>
      <MpButton variant="secondary" is-rounded @click="resetFilters">{{ t('Reset filters') }}</MpButton>
    </div>
    <RegBoard v-else :columns="columns" :loading="loading" @open="openTicket" @drop="onDrop" />

    <RegFiltersDrawer v-model:is-open="filtersOpen" :model-value="filters" :tag-options="tagOptions" @apply="applyDrawer" />
    <RegTicketDrawer :ticket-id="openId" @close="closeTicket" @needs="onNeeds" />
    <RegRejectModal :is-open="!!rejectFor" :ticket-id="rejectFor" @close="rejectFor = null" @rejected="onRejected" />
    <RegCompleteModal :is-open="!!completeFor" :ticket-id="completeFor" @close="completeFor = null" @completed="onCompleted" />
    <ExportModal
      :open="exportOpen"
      :title="t('Export registrations')"
      :entity-label="t('registrations')"
      :columns="exportColumns"
      :total="filtered.length"
      :show-column-search="false"
      @close="exportOpen = false"
      @export="onExport"
    />

    <ScenarioFab
      v-model="scenario"
      :scenarios="[
        { label: t('Default'), value: 'data' },
        { label: t('Empty state'), value: 'empty' },
        { label: t('Loading'), value: 'loading' },
      ]"
    />
  </BoPage>
</template>

<style scoped>
/* "All filters" button — copied from CrmDealsPage (mirrors the ERP Sales Orders index). */
.filter-all-btn {
  display: inline-flex; align-items: center; gap: var(--mp-spacing-2);
  padding: var(--mp-spacing-2) var(--mp-spacing-4) var(--mp-spacing-2) var(--mp-spacing-3);
  background: var(--mp-background-neutral, #ffffff); border: 1px solid var(--mp-border-bold, #8c9596);
  border-radius: var(--mp-radii-full, 999px);
  font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold);
  line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary);
  cursor: pointer; white-space: nowrap;
}
.filter-all-btn:hover { background: var(--mp-background-neutral-hovered, #eef0f3); }
.filter-all-btn--active { background: var(--mp-background-neutral-subtle, #f8f9f9); border-color: var(--mp-colors-border-bold, #8c9596); color: var(--mp-text-default); }
/* Filter bar — CrmDealsPage .cc-filterbar (rule/filter-bar-anatomy). The pill box
   comes from erp.css .filter-search (rule/filter-bar-search-pill). */
.reg-filterbar { display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); flex-wrap: wrap; flex-shrink: 0; }
.filter-left { display: flex; align-items: center; gap: var(--mp-spacing-4); flex-wrap: wrap; }
.filter-right { display: flex; align-items: center; gap: var(--mp-spacing-3); margin-left: auto; }
.filter-btn-group { display: flex; align-items: center; }
.filter-search-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: var(--mp-font-sizes-md); color: var(--mp-text-default); }
.filter-search-input::placeholder { color: var(--mp-text-placeholder, #97a0af); }
.search-clear-btn { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 18px; height: 18px; padding: 0; border: none; background: none; cursor: pointer; color: var(--mp-icon-subtle, #97a0af); border-radius: var(--mp-radii-full, 999px); }
.search-clear-btn:hover { background: var(--mp-background-neutral-hovered, #eef0f3); color: var(--mp-icon-default, #536062); }

.reg-banner { flex-shrink: 0; }

/* rule/empty-state-structure */
.reg-empty { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2); padding: var(--mp-spacing-10, 40px) 0; text-align: center; }
.reg-empty__art { width: 288px; height: 240px; object-fit: contain; }
.reg-empty__title { font-size: var(--mp-font-sizes-lg); line-height: var(--mp-line-heights-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.reg-empty__caption { margin-bottom: var(--mp-spacing-2); font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); }

@media (max-width: 640px) {
  .filter-right { flex: 1 1 100%; }
  .filter-right .filter-search { flex: 1; width: auto; }
}
</style>
