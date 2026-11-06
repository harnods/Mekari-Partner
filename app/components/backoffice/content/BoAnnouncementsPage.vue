<script setup lang="ts">
/**
 * BoAnnouncementsPage — O-01 Announcements list. ErpTablePage + useTableState,
 * newest posted first (rule/table-default-newest-first — a log of posts), pill
 * search + Export (ExportModal), kebab Edit / Delete (text-only). Delete (O-04) →
 * ConfirmModal (rule/btn-danger-confirm). Create = `+ New announcement` in the title
 * bar → /backoffice/announcements/new. ScenarioFab Default / Empty state.
 */
import { ref, computed, onMounted } from 'vue'
import {
  MpButton, MpButtonGroup, MpIcon, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import ExportModal from '~/components/patterns/ExportModal.vue'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import { useTableState } from '~/composables/useTableState'
import { successToast } from '~/utils/toasts'
import { formatDateTime } from '~/utils/date'
import { announcementsSorted, deleteAnnouncement, tr } from '~/data/backoffice'

const { t } = useLocale()
const router = useRouter()

interface Row { id: string; title: string; desc: string; postedAt: string }

const scenario = ref<'data' | 'empty'>('data')
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 600) })

const source = computed<Row[]>(() => scenario.value === 'empty' ? [] : announcementsSorted().map((a) => ({ id: a.id, title: a.title, desc: a.desc, postedAt: a.postedAt })))
const { search, currentPage, paginated, total, perPage, setPage, setPerPage, sortKey, sortDir, setSort } = useTableState<Row>(source, {
  perPage: 25,
  defaultSort: { key: 'postedAt', dir: 'desc' },
  filterFn: (r, s) => !s || `${r.title} ${r.desc}`.toLowerCase().includes(s),
})
const hasActiveSearch = computed(() => !!search.value.trim())

const columns = computed<TableColumn[]>(() => [
  { key: 'title', label: t('Title'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'desc', label: t('Short description'), kind: 'address' },
  { key: 'postedAt', label: t('Posted at'), kind: 'datetime', sortable: true, sortType: 'date' },
])

const goNew = () => router.push('/backoffice/announcements/new')
const goEdit = (r: Row) => router.push(`/backoffice/announcements/${r.id}`)

const delOpen = ref(false)
const delRow = ref<Row | null>(null)
function askDelete(r: Row) { delRow.value = r; delOpen.value = true }
function confirmDelete() {
  if (!delRow.value) return
  successToast(deleteAnnouncement(delRow.value.id).msg)
  delRow.value = null
}

const exportOpen = ref(false)
const exportColumns = computed(() => columns.value.map((c, i) => ({ key: c.key, label: c.label, required: i === 0 })))
function onExport() { exportOpen.value = false; successToast(t('Export ready — check your downloads')) }

useHead({ title: () => `Mekari Partner | ${t('Announcements')}` })
</script>

<template>
  <BoPage :title="t('Announcements')">
    <template #actions>
      <MpButton variant="primary" is-rounded left-icon="add" data-devchange="bo-ann-list" @click="goNew">{{ t('New announcement') }}</MpButton>
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
      :has-active-filter="hasActiveSearch"
      :search="search"
      :filter-empty-label="t('announcement')"
      @page-change="setPage"
      @per-page-change="setPerPage"
      @sort-change="setSort"
      @clear-search="search = ''"
      @clear-all="search = ''"
      @clear-filters="search = ''"
    >
      <template #filters>
        <div class="filter-left" />
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

      <template #cell-title="{ row }">
        <span class="cell-link cell-text" @click.stop="goEdit(row as unknown as Row)">{{ (row as unknown as Row).title }}</span>
      </template>
      <template #cell-desc="{ value }">
        <span class="cell-text" :title="(value as string)">{{ value }}</span>
      </template>
      <template #cell-postedAt="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <MpPopover :id="`bo-ann-actions-${(row as unknown as Row).id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
          <MpPopoverTrigger>
            <MpButton variant="ghost" left-icon="menu-kebab" :aria-label="t('More actions')" is-rounded />
          </MpPopoverTrigger>
          <MpPopoverContent class="erp-dropdown-menu">
            <MpPopoverList>
              <MpPopoverListItem @click="goEdit(row as unknown as Row)">{{ t('Edit') }}</MpPopoverListItem>
              <MpPopoverListItem @click="askDelete(row as unknown as Row)">{{ t('Delete') }}</MpPopoverListItem>
            </MpPopoverList>
          </MpPopoverContent>
        </MpPopover>
      </template>

      <template #empty>
        <div class="empty-full">
          <img :src="'/illustrations/empty-folder.png'" alt="" class="empty-illustration" width="288" height="240" />
          <p class="empty-full-title">{{ t('No announcements') }}</p>
          <p class="empty-full-desc">{{ t('Announcements will appear here.') }}</p>
          <MpButton class="empty-full-btn" variant="secondary" is-rounded left-icon="add" @click="goNew">{{ t('New announcement') }}</MpButton>
        </div>
      </template>
    </ErpTablePage>

    <ConfirmModal
      v-model:is-open="delOpen"
      :title="tr('Delete {object}?', { object: t('announcement') })"
      :description="`“${delRow?.title ?? ''}” ${t('is removed for partners.')} ${tr('Deleted {object} cannot be restored.', { object: t('announcement') })}`"
      :confirm-label="tr('Delete {object}', { object: t('announcement') })"
      @confirm="confirmDelete"
    />

    <ExportModal
      :open="exportOpen"
      :title="t('Export announcements')"
      :entity-label="t('announcements')"
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
