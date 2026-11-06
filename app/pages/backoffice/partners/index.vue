<script setup lang="ts">
/**
 * K-01 Partner Management — every partner data entity. A completed registration
 * makes a partner Registered; a manually created partner is Unregistered.
 * Partners cannot be deleted (no Delete action anywhere).
 *
 * Index pattern (docs/patterns/index-page-format.md): ErpTablePage + useTableState
 * (rule/table-use-erptablepage), quick filters Status + Account Owner
 * (ErpFilterSelect, rule/select-erpfilterselect), All filters drawer for the rest,
 * search pill + export (rule/filter-bar-search-export → ExportModal), name as a
 * link span (rule/table-name-link-span), kebab → MpPopover, alphabetical default
 * sort (rule/table-default-sort-alpha), 3-row first-load skeleton, both empty
 * states, ScenarioFab (rule/index-scenario-fab).
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import BoRegistrationLinkModal from '~/components/backoffice/partners/BoRegistrationLinkModal.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import EmployeesFiltersDrawer, { emptyEmployeesFilters, employeesFiltersCount, type EmployeesFiltersValue, type FilterScope } from '~/components/patterns/EmployeesFiltersDrawer.vue'
import { bo, tr, setPartnerStatus, linkedRegistration, BO_INDUSTRIES, BO_PRODUCTS, BO_GEO } from '~/data/backoffice'
import { partnerRow, partnerMatches, PARTNER_STATUSES, type PartnerRow } from '~/components/backoffice/partners/partnersView'
import { formatDate } from '~/utils/date'
import { successToast } from '~/utils/toasts'

const { t } = useLocale()
const router = useRouter()

function viewDetails(id: string) { router.push(`/backoffice/partners/${id}`) }
function goNew() { router.push('/backoffice/partners/new') }

// ── Scenario FAB: Default vs Empty state ──
const previewMode = ref<'data' | 'empty'>('data')
const rows = computed<PartnerRow[]>(() => (previewMode.value === 'empty' ? [] : bo.partners.map(partnerRow)))

// ── Columns (rule/table-column-kind) ──
const columns: TableColumn[] = [
  { key: 'name', label: t('Partner'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'code', label: t('Partner code'), sortType: 'text' },
  { key: 'city', label: t('Location'), sortType: 'text' },
  { key: 'industry', label: t('Partner industry'), sortType: 'text' },
  { key: 'product', label: t('Initial product focus'), sortType: 'text' },
  { key: 'aeName', label: t('Account Owner'), kind: 'name', sortType: 'text' },
  { key: 'status', label: t('Status'), kind: 'status', sortType: 'text' },
  { key: 'created', label: t('Created date'), kind: 'date', sortType: 'date' },
]

// ── Quick filters (max 2): Status + Account Owner ──
const aeFilter = ref('')
const statusOptions = PARTNER_STATUSES.map((s) => ({ label: t(s), value: s }))
const aeOptions = computed(() => bo.aes.map((a) => ({ label: a.name, value: a.email })))

// ── All filters drawer (shared scope-builder drawer) ──
const filtersOpen = ref(false)
const applied = reactive<EmployeesFiltersValue>(emptyEmployeesFilters())
const filterScopes = computed<FilterScope[]>(() => {
  const items = (vs: string[]) => vs.map((v) => ({ id: v, name: t(v) }))
  return [
    { key: 'entity', label: t('Entity type'), items: items(['Company', 'Individual']) },
    { key: 'prov', label: t('Province'), items: items(Object.keys(BO_GEO.Indonesia ?? {})) },
    { key: 'industry', label: t('Partner industry'), items: items(BO_INDUSTRIES) },
    { key: 'product', label: t('Initial product focus'), items: items(BO_PRODUCTS) },
    { key: 'origin', label: t('Origin'), items: items(['Registration', 'Manual']) },
  ]
})
function applyDrawer(v: EmployeesFiltersValue) { applied.filters = v.filters; applied.scopes = v.scopes }
const activeFilterCount = computed(() => employeesFiltersCount(applied))

const {
  search, statusFilter, currentPage, paginated, total, perPage,
  setPage, setPerPage, sortKey, sortDir, toggleSort, setSort,
} = useTableState<PartnerRow>(rows, {
  perPage: 25,
  defaultSort: { key: 'name', dir: 'asc' },
  filterFn: (r, s, st) => partnerMatches(r, s, st, aeFilter.value, applied.filters),
})
watch([aeFilter, () => applied.filters], () => setPage(1))

const hasActiveFilter = computed(() => !!search.value || !!statusFilter.value || !!aeFilter.value || activeFilterCount.value > 0)
function clearFilters() {
  search.value = ''; statusFilter.value = ''; aeFilter.value = ''
  applied.filters = {}; applied.scopes = []
}

// ── First-load skeleton (rule/skeleton-3-rows) ──
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

// ── Row actions ──
const linkFor = ref('')
function canLink(r: PartnerRow) { return r.status === 'Unregistered' && !linkedRegistration(r.id).ticket }
function activate(r: PartnerRow) { const res = setPartnerStatus(r.id, 'Active'); if (res.ok) successToast(res.msg) }
const deactivateRow = ref<PartnerRow | null>(null)
const deactivateOpen = ref(false)
function askDeactivate(r: PartnerRow) { deactivateRow.value = r; deactivateOpen.value = true }
function confirmDeactivate() {
  if (!deactivateRow.value) return
  const res = setPartnerStatus(deactivateRow.value.id, 'Inactive')
  if (res.ok) successToast(res.msg)
  deactivateRow.value = null
}

// ── Export (rule/export-modal) ──
const exportOpen = ref(false)
const exportColumns = computed(() => [
  ...columns.map((c) => ({ key: c.key, label: c.label, ...(c.key === 'name' ? { required: true } : {}) })),
  { key: 'legal', label: t('Legal name') },
  { key: 'entity', label: t('Entity type') },
  { key: 'country', label: t('Country') },
  { key: 'prov', label: t('Province') },
  { key: 'users', label: t('Users') },
])
function onExport() { exportOpen.value = false; successToast(tr('{n} partners exported', { n: total.value })) }
</script>

<template>
  <BoPage :title="t('Partner Management')">
    <template #actions>
      <MpButton variant="primary" left-icon="add" is-rounded data-devchange="bo-partner-list" @click="goNew">{{ t('New partner') }}</MpButton>
    </template>

    <div class="bpl" data-devchange="bo-partner-list">
      <ErpTablePage
        :columns="columns"
        :rows="(paginated as Record<string, unknown>[])"
        :total="total"
        :current-page="currentPage"
        :per-page="perPage"
        :sort-key="sortKey"
        :sort-dir="sortDir"
        :loading="loading"
        :has-active-filter="hasActiveFilter"
        :search="search"
        filter-empty-label="partners"
        @page-change="setPage"
        @per-page-change="setPerPage"
        @sort="toggleSort"
        @sort-change="setSort"
        @clear-filters="clearFilters"
      >
        <template #filters>
          <div class="filter-left">
            <ErpFilterSelect id="bpl-status" v-model="statusFilter" :placeholder="t('Status')" :options="statusOptions" />
            <ErpFilterSelect id="bpl-ae" v-model="aeFilter" :placeholder="t('Account Owner')" :options="aeOptions" />
            <MpButton variant="secondary" left-icon="filter" is-rounded class="filter-all-btn" :class="{ 'filter-all-btn--active': activeFilterCount > 0 }" @click="filtersOpen = true">
              {{ t('All filters') }}{{ activeFilterCount > 0 ? ` (${activeFilterCount})` : '' }}
            </MpButton>
          </div>
          <div class="filter-right">
            <MpButtonGroup class="filter-btn-group">
              <MpTooltip :label="t('Export')" placement="bottom">
                <MpButton variant="ghost" left-icon="download" :aria-label="t('Export')" is-rounded @click="exportOpen = true" />
              </MpTooltip>
            </MpButtonGroup>
            <div class="filter-search">
              <MpIcon name="search" size="sm" />
              <input v-model="search" class="filter-search-input" type="text" :placeholder="t('Search...')"> <!-- pixel-police-allow: sanctioned filter-search pill (rule/filter-bar-search-export) -->
              <MpButton v-if="search" class="search-clear-btn" variant="ghost" type="button" :aria-label="t('Clear search')" left-icon="close" is-rounded @click="search = ''" />
            </div>
          </div>
        </template>

        <template #cell-name="{ row }">
          <div class="bpl-name">
            <span class="cell-link cell-text" @click.stop="viewDetails((row as PartnerRow).id)">{{ (row as PartnerRow).name }}</span>
            <span class="bpl-sub cell-text">{{ (row as PartnerRow).id }}{{ (row as PartnerRow).brand ? ` · ${(row as PartnerRow).legal}` : '' }}</span>
          </div>
        </template>
        <template #cell-code="{ value }"><span :class="{ 'bpl-muted': !value }">{{ value || '—' }}</span></template>
        <template #cell-city="{ row }">
          <span class="cell-text">{{ [(row as PartnerRow).city, (row as PartnerRow).prov].filter(Boolean).join(', ') || '—' }}</span>
        </template>
        <template #cell-industry="{ value }"><span class="cell-text">{{ value ? t(value as string) : '—' }}</span></template>
        <template #cell-product="{ value }">{{ value || '—' }}</template>
        <template #cell-aeName="{ value }"><span class="cell-text">{{ value || '—' }}</span></template>
        <template #cell-status="{ value }"><ErpStatusBadge :status="value as string" :label="t(value as string)" /></template>
        <template #cell-created="{ value }">{{ formatDate(value as string) }}</template>

        <template #actions="{ row }">
          <MpPopover :id="`bpl-actions-${(row as PartnerRow).id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
            <MpPopoverTrigger>
              <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
            </MpPopoverTrigger>
            <MpPopoverContent :class="css({ minWidth: '160px', width: 'max-content', whiteSpace: 'nowrap' })">
              <MpPopoverList>
                <MpPopoverListItem @click="viewDetails((row as PartnerRow).id)">{{ t('View details') }}</MpPopoverListItem>
                <MpPopoverListItem v-if="canLink(row as PartnerRow)" @click="linkFor = (row as PartnerRow).id">{{ t('Get registration form link') }}</MpPopoverListItem>
                <MpPopoverListItem v-if="(row as PartnerRow).status === 'Inactive'" @click="activate(row as PartnerRow)">{{ t('Activate') }}</MpPopoverListItem>
                <MpPopoverListItem v-if="(row as PartnerRow).status === 'Active'" @click="askDeactivate(row as PartnerRow)">{{ t('Deactivate') }}</MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
        </template>

        <template #empty>
          <div class="empty-full">
            <img src="/illustrations/empty-folder.png" alt="" class="empty-illustration" width="288" height="240">
            <p class="empty-full-title">{{ t('No partners') }}</p>
            <p class="empty-full-desc">{{ t('Partners will appear here.') }}</p>
            <MpButton variant="secondary" left-icon="add" is-rounded @click="goNew">{{ t('New partner') }}</MpButton>
          </div>
        </template>
      </ErpTablePage>
    </div>

    <EmployeesFiltersDrawer
      :is-open="filtersOpen"
      :scopes="filterScopes"
      :applied-filters="applied.filters"
      :applied-scopes="applied.scopes"
      @update:is-open="filtersOpen = $event"
      @apply="applyDrawer"
    />
    <ExportModal :open="exportOpen" :title="t('Export partners')" entity-label="partners" :columns="exportColumns" :total="total" @close="exportOpen = false" @export="onExport" />
    <BoRegistrationLinkModal v-if="linkFor" :is-open="!!linkFor" :partner-id="linkFor" @close="linkFor = ''" />
    <ConfirmModal
      v-model:is-open="deactivateOpen"
      :title="tr('Deactivate {name}?', { name: deactivateRow?.name ?? '' })"
      :description="t('The partner moves to Inactive. Its users keep their accounts, and you can activate the partner again at any time.')"
      :confirm-label="t('Deactivate')"
      :cancel-label="t('Keep active')"
      @confirm="confirmDeactivate"
    />
    <ScenarioFab v-model="previewMode" />
  </BoPage>
</template>

<style scoped>
.bpl { display: flex; flex-direction: column; min-height: 0; }
.bpl-name { display: flex; flex-direction: column; min-width: 0; }
.bpl-sub { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpl-muted { color: var(--mp-text-secondary); }
.cell-text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; max-width: 100%; }

.filter-left { display: flex; align-items: center; gap: var(--mp-spacing-4); }
.filter-right { display: flex; align-items: center; gap: var(--mp-spacing-3); }
.filter-btn-group { display: flex; align-items: center; }
.filter-all-btn {
  display: inline-flex; align-items: center; gap: var(--mp-spacing-2);
  padding: var(--mp-spacing-2) var(--mp-spacing-4) var(--mp-spacing-2) var(--mp-spacing-3);
  background: var(--mp-background-neutral); border: 1px solid var(--mp-border-bold);
  border-radius: var(--mp-radii-full, 999px);
  font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold);
  line-height: var(--mp-line-heights-md); color: var(--mp-text-secondary); cursor: pointer; white-space: nowrap;
}
.filter-all-btn:hover { background: var(--mp-background-neutral-hovered); }
.filter-all-btn--active { background: var(--mp-background-neutral-subtle); border-color: var(--mp-colors-border-bold, #8c9596); color: var(--mp-text-default); }
.search-clear-btn {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: var(--mp-sizes-5); height: var(--mp-sizes-5); padding: 0; border: none; background: none; cursor: pointer;
  color: var(--mp-icon-default, var(--mp-text-secondary)); border-radius: var(--mp-radii-full, 999px);
}
.search-clear-btn:hover { background: var(--mp-background-neutral-hovered); }

.empty-full { display: flex; flex-direction: column; align-items: center; }
.empty-illustration { width: auto; height: 240px; object-fit: contain; }
.empty-full-title { margin: 0 0 var(--mp-spacing-0\.5); font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.empty-full-desc { margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-sizes-md); color: var(--mp-text-secondary); }
</style>
