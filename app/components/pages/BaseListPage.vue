<script setup lang="ts">
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BASE LIST PAGE — canonical starter template for an ERP index/list page.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Copy this file to app/components/pages/<YourPage>Page.vue and register it in
 *  app/pages/[...slug].vue › `pageRegistry` (keyed by the page label, e.g.
 *  'Sales orders'). The navy header + left sidebar + page title bar are provided
 *  by the app shell — a page component only renders the CONTENT below.
 *
 *  Structure (the standard every list page follows):
 *    • #stats   — summary cards row (KPIs, optional Airene suggestion banner)
 *    • #filters — Status dropdown (ErpFilterSelect) + All filters + icon tools + search
 *    • table    — ErpTablePage + useTableState (search / sort / pagination / bulk)
 *    • #actions — per-row kebab (MpPopover menu)
 *    • #empty   — empty state
 *
 *  Rules baked in (do not "fix" these — see docs/design/RULES.md + erp-table-page skill):
 *    • Columns use `kind` (date/number/name/status/amount/tags) — never pixel widths.
 *    • Tables always render via ErpTablePage; state via useTableState.
 *    • Status → ErpStatusBadge, tags → ErpTagList, dropdowns → ErpFilterSelect,
 *      search is the rounded .filter-search pill, primary button is green/is-rounded.
 *    • All user-facing copy goes through t() (English key → Bahasa Indonesia via
 *      app/data/translations.ts). Add any new keys there.
 *    • Swap SAMPLE_ROWS / columns / card copy for your real data + domain.
 */
import {
  MpIcon, MpButton, MpButtonGroup, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpTagList from '~/components/patterns/ErpTagList.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import { formatIDR } from '~/utils/currency'

const { t } = useLocale()

// ── 1. Columns — each semantic column sets `kind` (never a pixel width) ───────
const columns: TableColumn[] = [
  { key: 'date',         label: t('Date'),        kind: 'date',   sortType: 'date'   },
  { key: 'number',       label: t('Number'),      kind: 'number', sortable: true, sortType: 'text' },
  { key: 'customerName', label: t('Customer'),    kind: 'name',   sortable: true, sortType: 'text' },
  { key: 'dueDate',      label: t('Due date'),    kind: 'date',   sortType: 'date'   },
  { key: 'status',       label: t('Status'),      kind: 'status', sortType: 'text'   },
  { key: 'balance',      label: t('Balance due'), kind: 'amount', align: 'right', sortable: true, sortType: 'number' },
  { key: 'total',        label: t('Total'),       kind: 'amount', align: 'right', sortable: true, sortType: 'number' },
  { key: 'tags',         label: t('Tags'),        kind: 'tags' },
]

// ── 2. Rows — replace this sample with your real reactive data source ─────────
type Row = {
  id: number
  date: string
  number: string
  customerName: string
  dueDate: string
  status: 'open' | 'paid' | 'overdue'
  balance: number
  total: number
  tags: string[]
}

const CUSTOMERS = [
  'Pochi Coffee Roasters', 'One Eighty Coffee', 'Filosofi Kopi Melawai', 'Cafe Halaman Jogja',
  'Resto Bumbu Desa', 'Toko Mesin Kopi Bandung', 'Retail Mart Segar', 'Kopi Nako Bintaro',
  'Santika Premiere Hotel', 'Warung Kopi Modern', 'Distributor Sentra Boga', 'GoWork Office Tower',
  'Excelso Grand Indonesia', 'Coffee Cult Bali',
]

const sampleRows: Row[] = Array.from({ length: 14 }, (_, i) => {
  const total = (i % 5) * 20_000_000 + 7_100_000
  const status: Row['status'] = i % 5 === 1 ? 'paid' : i === 0 ? 'overdue' : 'open'
  return {
    id: 40150 - i,
    date: `2026-08-${String(19 - i).padStart(2, '0')}`,
    number: `Invoice #${40150 - i}`,
    customerName: CUSTOMERS[i % CUSTOMERS.length]!,
    dueDate: `2026-09-${String(18 - i).padStart(2, '0')}`,
    status,
    balance: status === 'paid' ? 0 : total,
    total,
    tags: total >= 100_000_000 ? ['VIP'] : i % 4 === 0 ? ['B2B'] : [],
  }
})
const rows = computed<Row[]>(() => sampleRows.map((r) => ({ ...r })))

// ── 3. Table state — search / sort / pagination (the shared composable) ───────
const {
  search, statusFilter, currentPage, paginated, total, perPage,
  setPage, setPerPage, sortKey, sortDir, toggleSort, setSort,
} = useTableState(rows, {
  filterFn: (row: Row, s, status) =>
    (row.number.toLowerCase().includes(s) || row.customerName.toLowerCase().includes(s)) &&
    (!status || row.status === status),
})

// Status options for the ErpFilterSelect dropdown.
const statusOptions = [
  { label: t('Open'),    value: 'open' },
  { label: t('Paid'),    value: 'paid' },
  { label: t('Overdue'), value: 'overdue' },
]

function clearFilters() {
  search.value = ''
  statusFilter.value = ''
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
</script>

<template>
  <ErpTablePage
    :columns="columns"
    :rows="(paginated as Record<string, unknown>[])"
    :total="total"
    :current-page="currentPage"
    :per-page="perPage"
    :sort-key="sortKey"
    :sort-dir="sortDir"
    has-checkbox
    bulk-label="record"
    :search="search"
    filter-empty-label="record"
    :has-active-filter="!!statusFilter"
    :has-active-search="!!search"
    :context-label="(row) => `${(row as Row).number}`"
    @page-change="setPage"
    @per-page-change="setPerPage"
    @sort="toggleSort"
    @sort-change="setSort"
    @clear-filters="clearFilters"
    @clear-all="clearFilters"
  >
    <!-- ── Bulk actions — single secondary-sm "Actions" dropdown ── -->
    <template #bulk-actions>
      <MpPopover id="base-bulk" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-start">
        <MpPopoverTrigger>
          <MpButton size="sm" variant="secondary" right-icon="chevrons-down" is-rounded>{{ t('Actions') }}</MpButton>
        </MpPopoverTrigger>
        <MpPopoverContent class="erp-dropdown-menu">
          <MpPopoverList>
            <MpPopoverListItem>{{ t('Print PDF') }}</MpPopoverListItem>
            <MpPopoverListItem>{{ t('Export') }}</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </template>

    <!-- ── Summary cards row ── -->
    <template #stats>
      <div class="stats-section">
        <div class="stat-card stat-card--bordered">
          <div class="stat-title">{{ t('Overdue') }}</div>
          <div class="stat-period">{{ t('As of today') }}</div>
          <div class="stat-amount stat-amount--danger">Rp10.000.000,00</div>
          <a class="stat-link">{{ t('1 record') }}</a>
          <div class="stat-ai-banner">
            <MpIcon name="airene-brand" size="sm" class="stat-ai-icon" />
            <span>{{ t('One customer is 2 days overdue. Send a reminder?') }}</span>
          </div>
        </div>
        <div class="stat-card stat-card--bordered">
          <div class="stat-title">{{ t('Unpaid') }}</div>
          <div class="stat-period">{{ t('As of today') }}</div>
          <div class="stat-amount">Rp20.000.000,00</div>
          <a class="stat-link">{{ t('3 records') }}</a>
        </div>
        <div class="stat-card stat-card--bordered">
          <div class="stat-title">{{ t('Payment received') }}</div>
          <div class="stat-period">{{ t('Last 30 days') }}</div>
          <div class="stat-amount">Rp12.000.000,00</div>
          <a class="stat-link">{{ t('1 record') }}</a>
        </div>
        <div class="stat-card">
          <div class="stat-title">{{ t('Total records') }}</div>
          <div class="stat-period">{{ t('Last 30 days') }}</div>
          <div class="stat-amount">Rp15.200.000,00</div>
          <a class="stat-link">{{ t('View report') }}</a>
        </div>
      </div>
    </template>

    <!-- ── Filter bar ── -->
    <template #filters>
      <div class="filter-left">
        <ErpFilterSelect id="base-status" v-model="statusFilter" :placeholder="t('Status')" :options="statusOptions" />
        <MpButton variant="secondary" left-icon="filter" is-rounded class="filter-all-btn">{{ t('All filters') }}</MpButton>
      </div>
      <div class="filter-right">
        <MpButtonGroup class="filter-btn-group">
          <MpTooltip :label="t('Ask Airene')" placement="bottom">
            <MpButton class="filter-airene-btn" variant="ghost" left-icon="airene-brand" :aria-label="t('Ask Airene')" is-rounded />
          </MpTooltip>
          <MpTooltip :label="t('Export')" placement="bottom">
            <MpButton variant="ghost" left-icon="download" :aria-label="t('Export')" is-rounded />
          </MpTooltip>
        </MpButtonGroup>
        <div class="filter-search">
          <MpIcon name="search" size="sm" />
          <input v-model="search" class="filter-search-input" type="text" :placeholder="t('Search...')" />
          <MpButton v-if="search" variant="secondary" class="search-clear-btn" type="button" left-icon="close" :aria-label="t('Clear search')" is-rounded @click="search = ''" />
        </div>
      </div>
    </template>

    <!-- ── Cell renderers ── -->
    <template #cell-date="{ value }">{{ formatDate(value as string) }}</template>
    <template #cell-number="{ value }">
      <a class="cell-number-link">{{ value }}</a>
    </template>
    <template #cell-customerName="{ value }">{{ value }}</template>
    <template #cell-dueDate="{ value }">{{ formatDate(value as string) }}</template>
    <template #cell-status="{ value }"><ErpStatusBadge :status="value as string" /></template>
    <template #cell-balance="{ value }">{{ formatIDR(value as number) }}</template>
    <template #cell-total="{ value }">{{ formatIDR(value as number) }}</template>
    <template #cell-tags="{ value }"><ErpTagList :tags="(value as string[])" /></template>

    <!-- ── Row kebab (sticky #actions) ── -->
    <template #actions>
      <MpPopover id="base-row-actions" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
        <MpPopoverTrigger>
          <MpButton class="row-kebab" variant="ghost" left-icon="more-horizontal" :aria-label="t('Actions')" is-rounded />
        </MpPopoverTrigger>
        <MpPopoverContent class="erp-dropdown-menu">
          <MpPopoverList>
            <MpPopoverListItem>{{ t('View') }}</MpPopoverListItem>
            <MpPopoverListItem>{{ t('Edit') }}</MpPopoverListItem>
            <MpPopoverListItem>{{ t('Delete') }}</MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>
    </template>

    <!-- ── Empty state ── -->
    <template #empty>
      <div class="empty-full">
        <div class="empty-full-title">{{ t('No records yet') }}</div>
        <div class="empty-full-desc">{{ t('Create your first record to see it listed here.') }}</div>
        <MpButton variant="primary" left-icon="add" is-rounded>{{ t('Record') }}</MpButton>
      </div>
    </template>
  </ErpTablePage>
</template>

<style scoped>
/* ── Summary cards ─────────────────────────────────────────────────────────── */
.stats-section { display: flex; gap: var(--mp-spacing-6); align-items: flex-start; }
.stat-card { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--mp-spacing-1); padding-right: var(--mp-spacing-6); align-self: stretch; }
.stat-card--bordered { border-right: 1px solid var(--mp-border-default, #e3e7e9); }
.stat-title { font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-regular); color: var(--mp-text-default); line-height: var(--mp-line-heights-md); white-space: nowrap; }
.stat-period { font-size: var(--mp-font-sizes-sm); color: var(--mp-text-secondary); line-height: var(--mp-line-heights-sm, 16px); white-space: nowrap; }
.stat-amount { font-size: var(--mp-font-sizes-xl, 20px); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); line-height: var(--mp-line-heights-2xl, 32px); white-space: nowrap; }
.stat-amount--danger { color: var(--mp-text-danger); }
.stat-link { display: inline-flex; font-size: var(--mp-font-sizes-md); color: var(--mp-text-link); line-height: var(--mp-line-heights-md); text-decoration: none; cursor: pointer; }
.stat-ai-banner { display: flex; gap: var(--mp-spacing-3); align-items: flex-start; background: var(--mp-airene-banner-bg); border-radius: var(--mp-radii-md); padding: var(--mp-spacing-1\.5) var(--mp-spacing-3); }
.stat-ai-icon { flex-shrink: 0; margin-top: var(--mp-spacing-0\.5); color: var(--mp-airene-default); }
.stat-ai-banner span { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm, 16px); color: var(--mp-airene-banner-text); flex: 1; min-width: 0; }

/* ── Filter bar ────────────────────────────────────────────────────────────── */
.filter-left { display: flex; align-items: center; gap: var(--mp-spacing-4); }
.filter-right { display: flex; align-items: center; gap: var(--mp-spacing-3); }
.filter-all-btn { padding: var(--mp-spacing-2) var(--mp-spacing-4) var(--mp-spacing-2) var(--mp-spacing-3); font-weight: var(--mp-font-weights-semi-bold); }
.filter-btn-group { display: flex; align-items: center; }
.filter-airene-btn :deep(svg) { color: var(--mp-airene-default, #6938ef); }

/* ── Cells ─────────────────────────────────────────────────────────────────── */
.cell-number-link { color: var(--mp-text-link); text-decoration: none; cursor: pointer; }

/* ── Empty state ───────────────────────────────────────────────────────────── */
.empty-full { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--mp-spacing-2); padding: var(--mp-spacing-9) var(--mp-spacing-4); }
.empty-full-title { font-size: var(--mp-font-sizes-lg, 1rem); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.empty-full-desc { font-size: var(--mp-font-sizes-md); color: var(--mp-text-secondary); margin-bottom: var(--mp-spacing-2); }
</style>
