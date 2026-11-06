<script setup lang="ts">
/**
 * BoMasterPage — I-02 Configurations master list (Professions, Specializations,
 * Responsibilities, Partner Roles, Products). One generic page driven by
 * BO_MASTER_META[mkey]. ErpTablePage + useTableState, alphabetical by name
 * (rule/table-default-sort-alpha), Usage quick filter, pill search + Export
 * (ExportModal), kebab Edit / Delete (text-only). Delete → ConfirmModal; a record in
 * use is blocked by the store and the reason shows in an inline banner
 * (rule/form-errors-inline). ScenarioFab Default / Empty state.
 */
import { ref, computed, onMounted, watch } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip, MpBanner, MpBannerIcon, MpBannerDescription, MpBannerCloseButton,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpTagList from '~/components/patterns/ErpTagList.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import BoMasterModal from './BoMasterModal.vue'
import { useTableState } from '~/composables/useTableState'
import { successToast } from '~/utils/toasts'
import { bo, BO_MASTER_META, masterUsedBy, deleteMaster, tr, type MasterKey } from '~/data/backoffice'

const props = defineProps<{ mkey: MasterKey }>()
const { t } = useLocale()

const meta = computed(() => BO_MASTER_META[props.mkey])
const singular = computed(() => t(meta.value.singular))

interface Row { id: string; idx: number; name: string; desc: string; resp: string[]; inUse: boolean }

const scenario = ref<'data' | 'empty'>('data')
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

const source = computed<Row[]>(() => scenario.value === 'empty'
  ? []
  : bo.masters[props.mkey].map((r, idx) => ({ id: `${idx}-${r.name}`, idx, name: r.name, desc: r.desc ?? '', resp: r.resp ?? [], inUse: masterUsedBy(props.mkey, r.name) })))

const usageFilter = ref('')
const usageOptions = computed(() => [{ value: 'used', label: t('In use') }, { value: 'unused', label: t('Not in use') }])
const { search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, setSort } = useTableState<Row>(source, {
  perPage: 25,
  defaultSort: { key: 'name', dir: 'asc' },
  filterFn: (r, s) => (!s || `${r.name} ${r.desc} ${r.resp.join(' ')}`.toLowerCase().includes(s))
    && (!usageFilter.value || (usageFilter.value === 'used') === r.inUse),
})
const hasActiveSearch = computed(() => !!search.value.trim())
const hasActiveFilter = computed(() => !!usageFilter.value)
function clearAll() { search.value = ''; usageFilter.value = '' }
// Switching between master lists keeps the same component instance — reset the view.
watch(() => props.mkey, () => { clearAll(); blockedMsg.value = ''; scenario.value = 'data' })

const columns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [{ key: 'name', label: t('Name'), kind: 'name', sortable: true, sortType: 'text' }]
  if (meta.value.desc) cols.push({ key: 'desc', label: t('Description'), kind: 'address', sortable: true, sortType: 'text' })
  if (meta.value.resp) cols.push({ key: 'resp', label: t('Responsibilities'), kind: 'tags' })
  cols.push({ key: 'inUse', label: t('Usage'), kind: 'status', sortable: true, sortType: 'text' })
  return cols
})

// ── Add / edit ──
const modalOpen = ref(false)
const editIdx = ref(-1)
function openAdd() { editIdx.value = -1; modalOpen.value = true }
function openEdit(r: Row) { editIdx.value = r.idx; modalOpen.value = true }

// ── Delete ──
const delOpen = ref(false)
const delRow = ref<Row | null>(null)
const blockedMsg = ref('')
function askDelete(r: Row) { delRow.value = r; blockedMsg.value = ''; delOpen.value = true }
function confirmDelete() {
  if (!delRow.value) return
  const res = deleteMaster(props.mkey, delRow.value.idx)
  if (res.ok) successToast(res.msg)
  else blockedMsg.value = res.msg
  delRow.value = null
}

// ── Export ──
const exportOpen = ref(false)
const exportColumns = computed(() => columns.value.map((c, i) => ({ key: c.key, label: c.label, required: i === 0 })))
function onExport() { exportOpen.value = false; successToast(t('Export ready — check your downloads')) }
</script>

<template>
  <BoPage :title="t(meta.title)">
    <template #actions>
      <MpButton variant="primary" is-rounded left-icon="add" data-devchange="bo-cfg-master" @click="openAdd">{{ t('New') }} {{ singular }}</MpButton>
    </template>


    <MpBanner v-if="blockedMsg" id="bo-master-blocked" variant="danger">
      <MpBannerIcon id="bo-master-blocked-icon" />
      <MpBannerDescription>{{ blockedMsg }}</MpBannerDescription>
      <MpBannerCloseButton id="bo-master-blocked-close" @click="blockedMsg = ''" />
    </MpBanner>

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
      :filter-empty-label="singular"
      @page-change="setPage"
      @per-page-change="setPerPage"
      @sort-change="setSort"
      @clear-filters="clearAll"
      @clear-search="search = ''"
      @clear-all="clearAll"
    >
      <template #filters>
        <div class="filter-left">
          <ErpFilterSelect id="bo-master-usage" v-model="usageFilter" :placeholder="t('Usage')" :options="usageOptions" />
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
        <span class="cell-link cell-text" @click.stop="openEdit(row as unknown as Row)">{{ (row as unknown as Row).name }}</span>
      </template>
      <template #cell-desc="{ value }">
        <span class="cell-text" :class="{ 'cell-muted': !value }" :title="(value as string)">{{ value || '—' }}</span>
      </template>
      <template #cell-resp="{ value }">
        <ErpTagList v-if="(value as string[]).length" :tags="(value as string[])" />
        <span v-else class="cell-muted">—</span>
      </template>
      <template #cell-inUse="{ value }">
        <ErpStatusBadge :status="value ? 'active' : 'inactive'" :label="value ? t('In use') : t('Not in use')" />
      </template>

      <template #actions="{ row }">
        <MpPopover :id="`bo-master-actions-${(row as unknown as Row).idx}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
          </MpPopoverTrigger>
          <MpPopoverContent class="erp-dropdown-menu">
            <MpPopoverList>
              <MpPopoverListItem @click="openEdit(row as unknown as Row)">{{ t('Edit') }}</MpPopoverListItem>
              <MpPopoverListItem @click="askDelete(row as unknown as Row)">{{ t('Delete') }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </template>

      <template #empty>
        <div class="empty-full">
          <img :src="'/illustrations/empty-folder.png'" alt="" class="empty-illustration" width="288" height="240" />
          <p class="empty-full-title">{{ t('No') }} {{ t(meta.title).toLowerCase() }}</p>
          <p class="empty-full-desc">{{ t(meta.title) }} {{ t('will appear here.') }}</p>
          <MpButton class="empty-full-btn" variant="secondary" is-rounded left-icon="add" @click="openAdd">{{ t('New') }} {{ singular }}</MpButton>
        </div>
      </template>
    </ErpTablePage>

    <BoMasterModal :is-open="modalOpen" :mkey="mkey" :idx="editIdx" @close="modalOpen = false" @saved="successToast" />

    <ConfirmModal
      v-model:is-open="delOpen"
      :title="tr('Delete {object}?', { object: singular })"
      :description="`${delRow?.name ?? ''}. ${tr('Deleted {object} cannot be restored.', { object: singular })}`"
      :confirm-label="tr('Delete {object}', { object: singular })"
      @confirm="confirmDelete"
    />

    <ExportModal
      :open="exportOpen"
      :title="`${t('Export')} ${t(meta.title).toLowerCase()}`"
      :entity-label="t(meta.title).toLowerCase()"
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
