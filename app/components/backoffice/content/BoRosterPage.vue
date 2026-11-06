<script setup lang="ts">
/**
 * BoRosterPage — I-10 Partner Account Owners / I-11 Trainers (Roster Management).
 * ErpTablePage + useTableState index (rule/table-use-erptablepage), alphabetical by
 * name (rule/table-default-sort-alpha), Product quick filter (ErpFilterSelect), pill
 * search + Export (rule/filter-bar-search-export → ExportModal), kebab Edit / Delete
 * (text-only, rule/popover-no-icons), Delete behind ConfirmModal; a delete the store
 * blocks (person still assigned) shows its reason in an inline banner — never a toast
 * (rule/form-errors-inline). ScenarioFab Default / Empty state (rule/index-scenario-fab).
 */
import { ref, computed, onMounted } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip, MpBanner, MpBannerIcon, MpBannerDescription, MpBannerCloseButton,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ErpFilterSelect from '~/components/patterns/ErpFilterSelect.vue'
import ErpTagList from '~/components/patterns/ErpTagList.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import BoRosterModal from './BoRosterModal.vue'
import { useTableState } from '~/composables/useTableState'
import { successToast } from '~/utils/toasts'
import { bo, rosterList, deleteRosterPerson, tr, type RosterKind } from '~/data/backoffice'

const props = defineProps<{ kind: RosterKind }>()
const { t } = useLocale()

const isOwners = computed(() => props.kind === 'owners')
const title = computed(() => (isOwners.value ? t('Partner Account Owners') : t('Trainers')))
const nounNew = computed(() => (isOwners.value ? t('New Account Owner') : t('New trainer')))
const nounLower = computed(() => (isOwners.value ? t('Account Owner') : t('trainer')))
const plural = computed(() => (isOwners.value ? t('Account Owners') : t('trainers')))

interface Row { id: string; idx: number; name: string; email: string; products: string[]; assigned: number }

const scenario = ref<'data' | 'empty'>('data')
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

function assignedCount(email: string): number {
  if (isOwners.value) return bo.tickets.filter((x) => x.ae === email).length + bo.partners.filter((x) => x.ae === email).length
  return bo.partners.filter((x) => x.tech === email).length
}
const source = computed<Row[]>(() => scenario.value === 'empty'
  ? []
  : rosterList(props.kind).map((p, idx) => ({ id: p.email, idx, name: p.name, email: p.email, products: p.products, assigned: assignedCount(p.email) })))

const productFilter = ref('')
const productOptions = computed(() => bo.masters.products.map((p) => p.name))
const { search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, setSort } = useTableState<Row>(source, {
  perPage: 25,
  defaultSort: { key: 'name', dir: 'asc' },
  filterFn: (r, s) => (!s || `${r.name} ${r.email}`.toLowerCase().includes(s)) && (!productFilter.value || r.products.includes(productFilter.value)),
})
const hasActiveSearch = computed(() => !!search.value.trim())
const hasActiveFilter = computed(() => !!productFilter.value)
function clearAll() { search.value = ''; productFilter.value = '' }

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('Name'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'email', label: t('Email'), sortable: true, sortType: 'text' },
  { key: 'products', label: t('Products'), kind: 'tags' },
  { key: 'assigned', label: isOwners.value ? t('Assignments') : t('Partners'), align: 'right', sortable: true, sortType: 'number' },
])

// ── Add / edit ──
const modalOpen = ref(false)
const editIdx = ref(-1)
function openAdd() { editIdx.value = -1; modalOpen.value = true }
function openEdit(r: Row) { editIdx.value = r.idx; modalOpen.value = true }

// ── Delete (blocked while assigned → inline banner) ──
const delOpen = ref(false)
const delRow = ref<Row | null>(null)
const blockedMsg = ref('')
function askDelete(r: Row) { delRow.value = r; blockedMsg.value = ''; delOpen.value = true }
function confirmDelete() {
  if (!delRow.value) return
  const res = deleteRosterPerson(props.kind, delRow.value.idx)
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
  <BoPage :title="title">
    <template #actions>
      <MpButton variant="primary" is-rounded left-icon="add" data-devchange="bo-roster-list" @click="openAdd">{{ nounNew }}</MpButton>
    </template>


    <MpBanner v-if="blockedMsg" id="bo-roster-blocked" variant="danger">
      <MpBannerIcon id="bo-roster-blocked-icon" />
      <MpBannerDescription>{{ blockedMsg }} {{ t('Reassign them on the partner or registration first.') }}</MpBannerDescription>
      <MpBannerCloseButton id="bo-roster-blocked-close" @click="blockedMsg = ''" />
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
      :filter-empty-label="isOwners ? t('Account Owner') : t('trainer')"
      @page-change="setPage"
      @per-page-change="setPerPage"
      @sort-change="setSort"
      @clear-filters="clearAll"
      @clear-search="search = ''"
      @clear-all="clearAll"
    >
      <template #filters>
        <div class="filter-left">
          <ErpFilterSelect id="bo-roster-product" v-model="productFilter" :placeholder="t('Product')" :options="productOptions" />
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
      <template #cell-products="{ value }">
        <ErpTagList :tags="(value as string[])" />
      </template>

      <template #actions="{ row }">
        <MpPopover :id="`bo-roster-actions-${(row as unknown as Row).idx}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
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
          <p class="empty-full-title">{{ isOwners ? t('No Account Owners') : t('No trainers') }}</p>
          <p class="empty-full-desc">{{ isOwners ? t('Account Owners will appear here.') : t('Trainers will appear here.') }}</p>
          <MpButton class="empty-full-btn" variant="secondary" is-rounded left-icon="add" @click="openAdd">{{ nounNew }}</MpButton>
        </div>
      </template>
    </ErpTablePage>

    <BoRosterModal :is-open="modalOpen" :kind="kind" :idx="editIdx" @close="modalOpen = false" @saved="successToast" />

    <ConfirmModal
      v-model:is-open="delOpen"
      :title="tr('Delete {object}?', { object: nounLower })"
      :description="`${delRow?.name ?? ''} · ${delRow?.email ?? ''}. ${tr('Deleted {object} cannot be restored.', { object: nounLower })}`"
      :confirm-label="tr('Delete {object}', { object: nounLower })"
      @confirm="confirmDelete"
    />

    <ExportModal
      :open="exportOpen"
      :title="isOwners ? t('Export Account Owners') : t('Export trainers')"
      :entity-label="plural"
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
