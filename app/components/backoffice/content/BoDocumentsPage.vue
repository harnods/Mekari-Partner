<script setup lang="ts">
/**
 * BoDocumentsPage — L-04 Document Repository: every agreement document on partners
 * and on registration tickets still in Agreement Drafting (allDocuments()). Newest
 * start date first. ErpTablePage + useTableState, quick filters Status + Method
 * (ErpFilterSelect, max 2), pill search + Export. Partner cell links to its owner
 * (partner detail / registration ticket); the document name opens the L-05 drawer;
 * Replaced agreement opens the replaced document. ScenarioFab Default / Empty state.
 * Re-agreement batches (Master Agreements › Deprecate) land here as PENDING rows.
 */
import { ref, computed, onMounted, watch } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import BoDocumentDrawer from './BoDocumentDrawer.vue'
import { useTableState } from '~/composables/useTableState'
import { successToast } from '~/utils/toasts'
import { formatDate } from '~/utils/date'
import { allDocuments, agStatus, agName, rowsOf, getMa, type BoDocEntry, type DocStatus } from '~/data/backoffice'

const { t } = useLocale()
const router = useRouter()
const route = useRoute()

interface Row {
  id: string; partner: string; partnerSub: string; ao: string; name: string; method: string; methodLabel: string
  status: DocStatus; start: string; end: string; replaced: string; replacedKey: string; ma: string; section: string
  ownerLink: string; onTicket: boolean
}

const scenario = ref<'data' | 'empty'>('data')
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

const entries = computed<BoDocEntry[]>(() => (scenario.value === 'empty' ? [] : allDocuments()))
const source = computed<Row[]>(() => entries.value.map((e) => {
  const rep = e.row.replaces ? rowsOf(e.owner).find((r) => r.id === e.row.replaces) : undefined
  return {
    id: e.key,
    partner: e.partner,
    partnerSub: e.partnerSub,
    ao: e.ao,
    name: agName(e.row),
    method: e.row.method,
    methodLabel: e.row.method === 'esign' ? t('By E-Sign') : t('Manual'),
    status: agStatus(e.row),
    start: e.row.start,
    end: e.row.end,
    replaced: rep ? agName(rep) : '',
    replacedKey: rep ? `${e.owner.kind}:${e.owner.id}:${rep.id}` : '',
    ma: getMa(e.row.ma)?.name ?? '',
    section: e.row.section === 'pa' ? t('Partnership Agreement') : t('Other agreements'),
    ownerLink: e.owner.kind === 'partner' ? `/backoffice/partners/${e.owner.id}` : `/backoffice/registrations?ticket=${e.owner.id}`,
    onTicket: e.onTicket,
  }
}))

const statusFilter = ref('')
const methodFilter = ref('')
const statusOptions = ['PENDING', 'COMPLETED', 'EXPIRED']
const methodOptions = computed(() => [{ value: 'esign', label: t('By E-Sign') }, { value: 'manual', label: t('Manual') }])
const { search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, setSort } = useTableState<Row>(source, {
  perPage: 25,
  defaultSort: { key: 'start', dir: 'desc' },
  filterFn: (r, s) => (!s || `${r.name} ${r.partner} ${r.partnerSub} ${r.ao} ${r.id}`.toLowerCase().includes(s))
    && (!statusFilter.value || r.status === statusFilter.value)
    && (!methodFilter.value || r.method === methodFilter.value),
})
const hasActiveSearch = computed(() => !!search.value.trim())
const hasActiveFilter = computed(() => !!statusFilter.value || !!methodFilter.value)
function clearFilters() { statusFilter.value = ''; methodFilter.value = '' }
function clearAll() { search.value = ''; clearFilters() }
watch([statusFilter, methodFilter], () => setPage(1))

const columns = computed<TableColumn[]>(() => [
  { key: 'partner', label: t('Partner'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'ao', label: t('Account Owner'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'name', label: t('Document name'), kind: 'address', sortable: true, sortType: 'text' },
  { key: 'methodLabel', label: t('Method'), sortable: true, sortType: 'text' },
  { key: 'status', label: t('Status'), kind: 'status', sortable: true, sortType: 'text' },
  { key: 'start', label: t('Start date'), kind: 'date', sortable: true, sortType: 'date' },
  { key: 'end', label: t('End date'), kind: 'date', sortable: true, sortType: 'date' },
  { key: 'replaced', label: t('Replaced agreement'), kind: 'address', sortable: true, sortType: 'text' },
])

// ── L-05 drawer (deep-linkable via ?doc=<key>) ──
const selKey = ref<string>(typeof route.query.doc === 'string' ? route.query.doc : '')
const selEntry = computed(() => allDocuments().find((e) => e.key === selKey.value) ?? null)
function openDoc(key: string) { selKey.value = key }
function closeDoc() { selKey.value = '' }
watch(selKey, (k) => { router.replace({ query: { ...route.query, doc: k || undefined } }) })

const exportOpen = ref(false)
const exportColumns = computed(() => columns.value.map((c, i) => ({ key: c.key, label: c.label, required: i === 0 })))
function onExport() { exportOpen.value = false; successToast(t('Export ready — check your downloads')) }

useHead({ title: () => `Mekari Partner | ${t('Document Repository')}` })
</script>

<template>
  <BoPage :title="t('Document Repository')">

    <ErpTablePage
      data-devchange="bo-docs-list"
      :columns="columns"
      :rows="(paginated as unknown as Record<string, unknown>[])"
      :total="total"
      :current-page="currentPage"
      :per-page="perPage"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      :loading="loading"
      :has-active-search="hasActiveSearch"
      :has-active-filter="hasActiveSearch || hasActiveFilter"
      :search="search"
      :filter-empty-label="t('document')"
      @page-change="setPage"
      @per-page-change="setPerPage"
      @sort-change="setSort"
      @clear-filters="clearAll"
      @clear-search="search = ''"
      @clear-all="clearAll"
    >
      <template #filters>
        <div class="filter-left">
          <ErpFilterSelect id="bo-docs-status" v-model="statusFilter" :placeholder="t('Status')" :options="statusOptions" />
          <ErpFilterSelect id="bo-docs-method" v-model="methodFilter" :placeholder="t('Method')" :options="methodOptions" />
        </div>
        <div class="filter-right">
          <MpButtonGroup class="filter-btn-group">
            <MpTooltip :label="t('Export')" placement="bottom">
              <MpButton variant="ghost" left-icon="download" :aria-label="t('Export')" is-rounded @click="exportOpen = true" />
            </MpTooltip>
          </MpButtonGroup>
          <div class="filter-search">
            <MpIcon name="search" size="sm" />
            <input v-model="search" class="filter-search-input" type="text" :placeholder="t('Search...')" />
            <MpButton v-if="search" class="search-clear-btn" variant="ghost" :aria-label="t('Clear search')" @click="search = ''">
              <MpIcon name="close" size="sm" />
            </MpButton>
          </div>
        </div>
      </template>

      <template #cell-partner="{ row }">
        <div class="cell-stack">
          <span class="cell-link cell-text" @click.stop="router.push((row as unknown as Row).ownerLink)">{{ (row as unknown as Row).partner }}</span>
          <span class="cell-sub cell-text">{{ (row as unknown as Row).partnerSub }}</span>
        </div>
      </template>
      <template #cell-name="{ row }">
        <div class="cell-stack">
          <span class="cell-link cell-text" :title="(row as unknown as Row).name" @click.stop="openDoc((row as unknown as Row).id)">{{ (row as unknown as Row).name }}</span>
          <span class="cell-sub">{{ (row as unknown as Row).section }}</span>
        </div>
      </template>
      <template #cell-status="{ value }"><ErpStatusBadge :status="(value as string)" /></template>
      <template #cell-start="{ value }">{{ value ? formatDate(value as string) : '—' }}</template>
      <template #cell-end="{ value }">{{ value ? formatDate(value as string) : '—' }}</template>
      <template #cell-replaced="{ row }">
        <span v-if="(row as unknown as Row).replacedKey" class="cell-link cell-text" :title="(row as unknown as Row).replaced" @click.stop="openDoc((row as unknown as Row).replacedKey)">{{ (row as unknown as Row).replaced }}</span>
        <span v-else class="cell-muted">—</span>
      </template>

      <template #actions="{ row }">
        <MpPopover :id="`bo-docs-actions-${(row as unknown as Row).id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
          </MpPopoverTrigger>
          <MpPopoverContent class="erp-dropdown-menu">
            <MpPopoverList>
              <MpPopoverListItem @click="openDoc((row as unknown as Row).id)">{{ t('View details') }}</MpPopoverListItem>
              <MpPopoverListItem @click="router.push((row as unknown as Row).ownerLink)">{{ (row as unknown as Row).onTicket ? t('Open registration') : t('Open partner') }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </template>

      <template #empty>
        <div class="empty-full">
          <img :src="'/illustrations/empty-folder.png'" alt="" class="empty-illustration" width="288" height="240" />
          <p class="empty-full-title">{{ t('No documents') }}</p>
          <p class="empty-full-desc">{{ t('Documents added on registrations and partners will appear here.') }}</p>
          <MpButton class="empty-full-btn" variant="secondary" is-rounded @click="router.push('/backoffice/partners')">{{ t('Go to partners') }}</MpButton>
        </div>
      </template>
    </ErpTablePage>

    <BoDocumentDrawer :entry="selEntry" @close="closeDoc" @open="openDoc" />

    <ExportModal
      :open="exportOpen"
      :title="t('Export documents')"
      :entity-label="t('documents')"
      :columns="exportColumns"
      :total="total"
      @close="exportOpen = false"
      @export="onExport"
    />

    <ScenarioFab v-model="scenario" />
  </BoPage>
</template>

<style scoped src="./bo-content.css"></style>
