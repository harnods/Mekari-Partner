<script setup lang="ts">
/**
 * N-01 Partner Data Change — change requests submitted by partner admins.
 * Approving applies the requested values to the partner; Approved / Rejected /
 * Cancelled are final and locked.
 *
 * The prototype's 4-column board is rendered as the standard index
 * (rule/table-use-erptablepage) with page-level status tabs below the title bar
 * (docs/patterns/tabs.md §1 — BoPage `tabs`, In review carries its count). Rows
 * open the change-request side panel (BoChangeRequestDrawer); `?cr=CR-xxxx`
 * deep-links into it (the partner detail banner uses this). Newest first
 * (transactional log, rule/table-default-newest-first).
 */
import { ref, computed, onMounted, watch } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import BoChangeRequestDrawer from '~/components/backoffice/partners/BoChangeRequestDrawer.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import { bo, tr, partnerName, BO_CR_STATUSES, BO_CR_CAPTION } from '~/data/backoffice'
import { crRow, crMatches, type CrRow } from '~/components/backoffice/partners/partnersView'
import { formatDate } from '~/utils/date'
import { successToast } from '~/utils/toasts'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

// ── Scenario FAB ──
const previewMode = ref<'data' | 'empty'>('data')
const all = computed<CrRow[]>(() => (previewMode.value === 'empty' ? [] : bo.crs.map(crRow)))

// ── Status tabs (page-level) ──
const tab = ref<string>('In review')
const tabs = computed(() => [
  ...BO_CR_STATUSES.map((s) => ({ key: s, label: t(s), count: s === 'In review' ? (all.value.filter((r) => r.status === s).length || null) : null })),
  { key: 'all', label: t('All'), count: null },
])
const tabCaption = computed(() => (tab.value === 'all' ? t('Every change request, newest first.') : t(BO_CR_CAPTION[tab.value as keyof typeof BO_CR_CAPTION])))

// ── Columns ──
const columns: TableColumn[] = [
  { key: 'date', label: t('Submitted date'), kind: 'date', sortType: 'date' },
  { key: 'id', label: t('Request number'), kind: 'number', sortable: true, sortType: 'text' },
  { key: 'partner', label: t('Partner'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'fieldNames', label: t('Changed fields'), kind: 'address' },
  { key: 'by', label: t('Submitted by'), kind: 'name', sortType: 'text' },
  { key: 'status', label: t('Status'), kind: 'status', sortType: 'text' },
  { key: 'decided', label: t('Decided date'), kind: 'date', sortType: 'date' },
]

// ── Quick filter: Partner (searchable) ──
const partnerFilter = ref('')
const partnerOptions = computed(() => [...new Set(bo.crs.map((c) => c.pid))]
  .map((pid) => { const p = bo.partners.find((x) => x.id === pid); return { label: p ? partnerName(p) : pid, value: pid } })
  .sort((a, b) => a.label.localeCompare(b.label)))

const {
  search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, toggleSort, setSort,
} = useTableState<CrRow>(all, {
  perPage: 25,
  defaultSort: { key: 'date', dir: 'desc' },
  filterFn: (r, s) => crMatches(r, s, tab.value, partnerFilter.value),
})
watch([tab, partnerFilter], () => setPage(1))
const hasActiveFilter = computed(() => !!search.value || !!partnerFilter.value)
function clearFilters() { search.value = ''; partnerFilter.value = '' }

const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

// ── Drawer (?cr= deep link) ──
const selected = ref<string>(typeof route.query.cr === 'string' ? route.query.cr : '')
onMounted(() => {
  const c = selected.value ? bo.crs.find((x) => x.id === selected.value) : undefined
  if (c) tab.value = c.status
  else selected.value = ''
})
function openCr(id: string) { selected.value = id }
function closeCr() { selected.value = '' }
watch(selected, (v) => router.replace({ query: { ...route.query, cr: v || undefined } }))

// ── Export ──
const exportOpen = ref(false)
const exportColumns = computed(() => [
  ...columns.map((c) => ({ key: c.key, label: c.label, ...(c.key === 'id' ? { required: true } : {}) })),
  { key: 'email', label: t('Submitter email') },
  { key: 'legal', label: t('Legal name') },
])
function onExport() { exportOpen.value = false; successToast(tr('{n} change requests exported', { n: total.value })) }
</script>

<template>
  <BoPage v-model:tab="tab" :title="t('Partner Data Change')" :tabs="tabs">
    <div class="bpdc" data-devchange="bo-pdc-list">
      <p class="bpdc-caption">{{ tabCaption }}</p>
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
        filter-empty-label="change requests"
        @page-change="setPage"
        @per-page-change="setPerPage"
        @sort="toggleSort"
        @sort-change="setSort"
        @clear-filters="clearFilters"
      >
        <template #filters>
          <div class="filter-left">
            <ErpFilterSelect id="bpdc-partner" v-model="partnerFilter" :placeholder="t('Partner')" :options="partnerOptions" width="200px" />
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

        <template #cell-date="{ value }">{{ formatDate(value as string) }}</template>
        <template #cell-id="{ row }">
          <span class="cell-link cell-text" @click.stop="openCr((row as CrRow).id)">{{ (row as CrRow).id }}</span>
        </template>
        <template #cell-partner="{ row }">
          <div class="bpdc-stack">
            <span class="cell-text">{{ (row as CrRow).partner }}</span>
            <span class="bpdc-sub cell-text">{{ (row as CrRow).pid }} · {{ (row as CrRow).legal }}</span>
          </div>
        </template>
        <template #cell-fieldNames="{ row }">
          <div class="bpdc-stack">
            <span class="bpdc-clamp">{{ (row as CrRow).fieldNames }}</span>
            <span class="bpdc-sub">{{ (row as CrRow).fields === 1 ? t('1 field') : tr('{n} fields', { n: (row as CrRow).fields }) }}</span>
          </div>
        </template>
        <template #cell-by="{ row }">
          <div class="bpdc-stack">
            <span class="cell-text">{{ (row as CrRow).by }}</span>
            <span class="bpdc-sub cell-text">{{ (row as CrRow).email }}</span>
          </div>
        </template>
        <template #cell-status="{ value }"><ErpStatusBadge :status="value as string" :label="t(value as string)" /></template>
        <template #cell-decided="{ value }">{{ value ? formatDate(value as string) : '—' }}</template>

        <template #actions="{ row }">
          <MpPopover :id="`bpdc-actions-${(row as CrRow).id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
            <MpPopoverTrigger>
              <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
            </MpPopoverTrigger>
            <MpPopoverContent :class="css({ minWidth: '160px', width: 'max-content', whiteSpace: 'nowrap' })">
              <MpPopoverList>
                <MpPopoverListItem @click="openCr((row as CrRow).id)">{{ t('View details') }}</MpPopoverListItem>
                <MpPopoverListItem @click="router.push(`/backoffice/partners/${(row as CrRow).pid}`)">{{ t('View partner') }}</MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
        </template>

        <template #empty>
          <div class="empty-full">
            <img src="/illustrations/empty-folder.png" alt="" class="empty-illustration" width="288" height="240">
            <p class="empty-full-title">{{ t('No change requests') }}</p>
            <p class="empty-full-desc">{{ t('Change requests submitted by partner admins will appear here.') }}</p>
            <MpButton variant="secondary" is-rounded @click="router.push('/backoffice/partners')">{{ t('View partners') }}</MpButton>
          </div>
        </template>
      </ErpTablePage>
    </div>

    <BoChangeRequestDrawer :cr-id="selected" @close="closeCr" />
    <ExportModal :open="exportOpen" :title="t('Export change requests')" entity-label="change requests" :columns="exportColumns" :total="total" @close="exportOpen = false" @export="onExport" />
    <ScenarioFab v-model="previewMode" />
  </BoPage>
</template>

<style scoped>
.bpdc { display: flex; flex-direction: column; gap: var(--mp-spacing-3); min-height: 0; }
.bpdc-caption { margin: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpdc-stack { display: flex; flex-direction: column; min-width: 0; }
.bpdc-sub { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpdc-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cell-text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; max-width: 100%; }

.filter-left { display: flex; align-items: center; gap: var(--mp-spacing-4); }
.filter-right { display: flex; align-items: center; gap: var(--mp-spacing-3); }
.filter-btn-group { display: flex; align-items: center; }
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
