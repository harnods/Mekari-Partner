<script setup lang="ts">
/**
 * BoMaListPage — I-07 Master Agreements list. ErpTablePage + useTableState,
 * alphabetical by name (rule/table-default-sort-alpha), quick filters Status + Type,
 * pill search + Export. Name → editor/status page; kebab View details / Duplicate
 * (text-only). There is no delete — a master agreement retires through DEPRECATED.
 * ScenarioFab Default / Empty state.
 */
import { ref, computed, onMounted } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpTagList from '~/components/patterns/ErpTagList.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import { useTableState } from '~/composables/useTableState'
import { successToast } from '~/utils/toasts'
import { bo, duplicateMa, maUsed, type MaStatus, type MaType } from '~/data/backoffice'

const { t } = useLocale()
const router = useRouter()

interface Row { id: string; name: string; desc: string; type: MaType; products: string[]; pdf: string; status: MaStatus; used: boolean }

const scenario = ref<'data' | 'empty'>('data')
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

const source = computed<Row[]>(() => scenario.value === 'empty' ? [] : bo.mas.map((m) => ({
  id: m.id, name: m.name, desc: m.desc, type: m.type, products: Object.keys(m.products), pdf: m.pdf, status: m.status, used: maUsed(m),
})))
const statusFilter = ref('')
const typeFilter = ref('')
const { search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, setSort } = useTableState<Row>(source, {
  perPage: 25,
  defaultSort: { key: 'name', dir: 'asc' },
  filterFn: (r, s) => (!s || `${r.name} ${r.desc} ${r.pdf}`.toLowerCase().includes(s))
    && (!statusFilter.value || r.status === statusFilter.value)
    && (!typeFilter.value || r.type === typeFilter.value),
})
const hasActiveSearch = computed(() => !!search.value.trim())
const hasActiveFilter = computed(() => !!statusFilter.value || !!typeFilter.value)
function clearFilters() { statusFilter.value = ''; typeFilter.value = '' }
function clearAll() { search.value = ''; clearFilters() }

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('Name'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'type', label: t('Type'), sortable: true, sortType: 'text' },
  { key: 'products', label: t('Products'), kind: 'tags' },
  { key: 'pdf', label: t('File'), kind: 'address', sortable: true, sortType: 'text' },
  { key: 'status', label: t('Status'), kind: 'status', sortable: true, sortType: 'text' },
])

const goNew = () => router.push('/backoffice/configurations/master-agreements/new')
const goDetail = (r: Row) => router.push(`/backoffice/configurations/master-agreements/${r.id}`)
function duplicate(r: Row) { const res = duplicateMa(r.id); if (res.ok) successToast(res.msg) }

const exportOpen = ref(false)
const exportColumns = computed(() => columns.value.map((c, i) => ({ key: c.key, label: c.label, required: i === 0 })))
function onExport() { exportOpen.value = false; successToast(t('Export ready — check your downloads')) }

useHead({ title: () => `Mekari Partner | ${t('Master Agreements')}` })
</script>

<template>
  <BoPage :title="t('Master Agreements')">
    <template #actions>
      <MpButton variant="primary" is-rounded left-icon="add" data-devchange="bo-cfg-ma-list" @click="goNew">{{ t('New master agreement') }}</MpButton>
    </template>


    <ErpTablePage
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
      :filter-empty-label="t('master agreement')"
      @page-change="setPage"
      @per-page-change="setPerPage"
      @sort-change="setSort"
      @clear-filters="clearAll"
      @clear-search="search = ''"
      @clear-all="clearAll"
    >
      <template #filters>
        <div class="filter-left">
          <ErpFilterSelect id="bo-ma-status" v-model="statusFilter" :placeholder="t('Status')" :options="['DRAFT', 'ACTIVE', 'DEPRECATED']" />
          <ErpFilterSelect id="bo-ma-type" v-model="typeFilter" :placeholder="t('Type')" :options="['PRIMARY', 'OTHERS']" />
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

      <template #cell-name="{ row }">
        <div class="cell-stack">
          <span class="cell-link cell-text" @click.stop="goDetail(row as unknown as Row)">{{ (row as unknown as Row).name }}</span>
          <span v-if="(row as unknown as Row).desc" class="cell-sub cell-text">{{ (row as unknown as Row).desc }}</span>
        </div>
      </template>
      <template #cell-products="{ row }">
        <ErpTagList v-if="(row as unknown as Row).type === 'PRIMARY' && (row as unknown as Row).products.length" :tags="(row as unknown as Row).products" />
        <span v-else class="cell-muted">{{ (row as unknown as Row).type === 'OTHERS' ? t('Not applicable') : '—' }}</span>
      </template>
      <template #cell-pdf="{ value }">
        <span class="cell-text" :class="{ 'cell-muted': !value }" :title="(value as string)">{{ value || t('No file') }}</span>
      </template>
      <template #cell-status="{ value }"><ErpStatusBadge :status="(value as string)" /></template>

      <template #actions="{ row }">
        <MpPopover :id="`bo-ma-actions-${(row as unknown as Row).id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
          </MpPopoverTrigger>
          <MpPopoverContent class="erp-dropdown-menu">
            <MpPopoverList>
              <MpPopoverListItem @click="goDetail(row as unknown as Row)">{{ t('View details') }}</MpPopoverListItem>
              <MpPopoverListItem @click="duplicate(row as unknown as Row)">{{ t('Duplicate') }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </template>

      <template #empty>
        <div class="empty-full">
          <img :src="'/illustrations/empty-folder.png'" alt="" class="empty-illustration" width="288" height="240" />
          <p class="empty-full-title">{{ t('No master agreements') }}</p>
          <p class="empty-full-desc">{{ t('Master agreements will appear here.') }}</p>
          <MpButton class="empty-full-btn" variant="secondary" is-rounded left-icon="add" @click="goNew">{{ t('New master agreement') }}</MpButton>
        </div>
      </template>
    </ErpTablePage>

    <ExportModal
      :open="exportOpen"
      :title="t('Export master agreements')"
      :entity-label="t('master agreements')"
      :columns="exportColumns"
      :total="total"
      :show-column-search="false"
      @close="exportOpen = false"
      @export="onExport"
    />

    <ScenarioFab v-model="scenario" />
  </BoPage>
</template>

<style scoped src="./bo-content.css"></style>
