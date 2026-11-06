<script setup lang="ts">
/**
 * K-09 Partner detail — master-data detail page (docs/patterns/details-page-format.md §C):
 * breadcrumb "Partner Management" above the H1 (rule/detail-breadcrumb-no-gap),
 * status badge + Jump-to switcher (rule/detail-jump-to), title-bar Actions ▾
 * (Get registration form link / Activate / Deactivate), key facts in ContentList
 * (rule/detail-contentlist), provenance link → ActivityLogModal
 * (rule/detail-activity-log-always, rule/activity-log-trigger), in-page MpTabs
 * (docs/patterns/tabs.md §2): Profile · Agreements (K-07) · Partner users.
 *
 * Reachable states: not-found id; Unregistered (link) / with a registration in
 * progress (banner, link invalid); Registered; Active (Deactivate, confirmed);
 * Inactive (Activate); a change request in review (banner → Partner Data Change).
 */
import { ref, reactive, computed, watch } from 'vue'
import {
  MpButton, MpIcon, MpTabs, MpTabList, MpTab, MpTabPanels, MpTabPanel,
  MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import BoAgreementSection from '~/components/backoffice/BoAgreementSection.vue'
import BoPartnerProfileTab from '~/components/backoffice/partners/BoPartnerProfileTab.vue'
import BoRegistrationLinkModal from '~/components/backoffice/partners/BoRegistrationLinkModal.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ErpTablePage, { type TableColumn } from '~/components/patterns/ErpTablePage.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import DetailJumpTo from '~/components/patterns/DetailJumpTo.vue'
import DetailActionsMenu from '~/components/patterns/DetailActionsMenu.vue'
import ActivityLogModal from '~/components/patterns/ActivityLogModal.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import {
  bo, tr, getPartner, partnerName, aeName, linkedRegistration, setPartnerStatus,
  type BoPartnerProfilePatch, type BoPartnerUser,
} from '~/data/backoffice'
import { partnerActivityEntries, profileDraftOf, provenanceText, openCrOf } from '~/components/backoffice/partners/partnersView'
import { formatDateLong } from '~/utils/date'
import { successToast } from '~/utils/toasts'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const id = computed(() => String(route.params.id || ''))
const p = computed(() => getPartner(id.value))
const name = computed(() => (p.value ? partnerName(p.value) : ''))

// ── Tabs (?tab= keeps the active tab on reload / deep links) ──
const TABS = ['profile', 'agreements', 'users'] as const
const tabIndex = computed<number>({
  get() { const i = TABS.indexOf(route.query.tab as never); return i >= 0 ? i : 0 },
  set(i: number) { const v = TABS[i] ?? 'profile'; router.replace({ query: { ...route.query, tab: v === 'profile' ? undefined : v } }) },
})

// ── Profile draft (owned here so it survives tab switches; reset per partner) ──
const draft = reactive<BoPartnerProfilePatch>({ ae: '', tech: '', tax: '', industry: '', web: '', li: '', impl: false })
watch(p, (v) => { if (v) Object.assign(draft, profileDraftOf(v)) }, { immediate: true })
watch(id, () => { if (p.value) Object.assign(draft, profileDraftOf(p.value)) })

// ── Jump to (rule/detail-jump-to) ──
const jumpItems = computed(() => [...bo.partners]
  .sort((a, b) => partnerName(a).localeCompare(partnerName(b)))
  .map((x) => ({ id: x.id, primary: partnerName(x), secondary: `${x.id} · ${t(x.status)}` })))
function jump(pid: string) { router.push(`/backoffice/partners/${pid}`) }

// ── Registration link / status ──
const reg = computed(() => (p.value ? linkedRegistration(p.value.id) : { ticket: undefined, open: undefined }))
const canLink = computed(() => p.value?.status === 'Unregistered' && !reg.value.ticket)
const openCr = computed(() => (p.value ? openCrOf(p.value.id) : undefined))
const linkOpen = ref(false)
const deactivateOpen = ref(false)
function activate() { if (!p.value) return; const res = setPartnerStatus(p.value.id, 'Active'); if (res.ok) successToast(res.msg) }
function confirmDeactivate() { if (!p.value) return; const res = setPartnerStatus(p.value.id, 'Inactive'); if (res.ok) successToast(res.msg) }
const actionGroups = computed(() => [[
  { label: 'Get registration form link', onClick: () => { linkOpen.value = true }, show: canLink.value },
  { label: 'Activate', onClick: activate, show: p.value?.status === 'Inactive' },
  { label: 'Deactivate', onClick: () => { deactivateOpen.value = true }, show: p.value?.status === 'Active', destructive: true },
]])
const hasActions = computed(() => actionGroups.value[0]!.some((i) => i.show))

// ── Activity log (rule/activity-log-entries) ──
const activityOpen = ref(false)
const activity = computed(() => (p.value ? partnerActivityEntries(p.value) : []))

// ── Partner users tab (read-only; managed by partner admins) ──
type UserRow = BoPartnerUser & { [k: string]: unknown }
const userRows = computed<UserRow[]>(() => (p.value ? p.value.users.map((u) => ({ ...u })) : []))
const userColumns: TableColumn[] = [
  { key: 'name', label: t('Name'), kind: 'name', sortable: true, sortType: 'text' },
  { key: 'email', label: t('Email'), sortType: 'text' },
  { key: 'job', label: t('Job title'), sortType: 'text' },
  { key: 'phone', label: t('Phone') },
  { key: 'profession', label: t('Profession'), sortType: 'text' },
  { key: 'role', label: t('Role'), sortType: 'text' },
]
const {
  search: userSearch, currentPage: userPage, paginated: userPaged, total: userTotal, perPage: userPer,
  setPage: setUserPage, setPerPage: setUserPer, sortKey: userSortKey, sortDir: userSortDir, toggleSort: toggleUserSort, setSort: setUserSort,
} = useTableState<UserRow>(userRows, {
  defaultSort: { key: 'name', dir: 'asc' },
  filterFn: (u, s) => !s || [u.name, u.email, u.job, u.profession].join(' ').toLowerCase().includes(s),
})
</script>

<template>
  <!-- ── Not found ── -->
  <BoPage v-if="!p" :title="t('Partner not found')" :breadcrumb="{ label: t('Partner Management'), to: '/backoffice/partners' }">
    <div class="bpd-empty" data-devchange="bo-partner-detail">
      <img src="/illustrations/empty-folder.png" alt="" width="288" height="240" class="bpd-empty-img">
      <p class="bpd-empty-title">{{ t('Partner not found') }}</p>
      <p class="bpd-empty-desc">{{ tr('No partner has the ID {id}. It may have been typed incorrectly.', { id }) }}</p>
      <MpButton variant="secondary" is-rounded @click="router.push('/backoffice/partners')">{{ t('Back to Partner Management') }}</MpButton>
    </div>
  </BoPage>

  <BoPage v-else :title="name" :breadcrumb="{ label: t('Partner Management'), to: '/backoffice/partners' }">
    <template #title-extra>
      <ErpStatusBadge badge-for="additionalInformation" :status="p.status" :label="t(p.status)" />
      <DetailJumpTo id="bpd-jump" :items="jumpItems" :aria-label="t('Switch partner')" :placeholder="t('Search...')" :empty-text="t('No partners found')" @select="jump" />
    </template>
    <template v-if="hasActions" #actions>
      <DetailActionsMenu id="bpd-actions" :groups="actionGroups" placement="bottom-end" />
    </template>

    <div class="bpd" data-devchange="bo-partner-detail">
      <!-- ── Banners (conditional) ── -->
      <MpBanner v-if="reg.open" id="bpd-reg-banner" variant="info">
        <MpBannerIcon id="bpd-reg-banner-icon" />
        <MpBannerTitle>{{ tr('Registration {id} in progress', { id: reg.open.id }) }}</MpBannerTitle>
        <MpBannerDescription>
          {{ tr('Submitted through this partner\'s registration form link by {who}. Current stage: {stage}. The link is no longer valid.', { who: reg.open.submitter, stage: t(reg.open.stage) }) }}
          <NuxtLink class="bpd-link" :to="`/backoffice/registrations?ticket=${reg.open.id}`">{{ t('Open ticket') }}</NuxtLink>
        </MpBannerDescription>
      </MpBanner>
      <MpBanner v-if="openCr" id="bpd-cr-banner" variant="warning">
        <MpBannerIcon id="bpd-cr-banner-icon" />
        <MpBannerTitle>{{ tr('Change request {id} in review', { id: openCr.id }) }}</MpBannerTitle>
        <MpBannerDescription>
          {{ tr('{who} requested changes to this partner\'s data. The values here do not change until the request is approved.', { who: openCr.by }) }}
          <NuxtLink class="bpd-link" :to="`/backoffice/partner-data-change?cr=${openCr.id}`">{{ t('Review request') }}</NuxtLink>
        </MpBannerDescription>
      </MpBanner>

      <!-- ── Summary ── -->
      <section class="bpd-summary">
        <div class="bpd-grid">
          <div>
            <ContentList :label="t('Legal name')" :value="p.legal || '—'" />
            <ContentList :label="t('Partner ID')" :value="p.id" />
          </div>
          <div>
            <ContentList :label="t('Partner code')" :value="p.code || '—'" />
            <ContentList :label="t('Entity type')" :value="t(p.entity)" />
          </div>
          <div>
            <ContentList :label="t('Account Owner')" :value="p.ae ? aeName(p.ae) : '—'" />
            <ContentList :label="t('Location')" :value="[p.city, p.prov, p.country].filter(Boolean).join(', ') || '—'" />
          </div>
          <div>
            <ContentList :label="t('Users')" :value="String(p.users.length)" />
            <ContentList :label="t('Agreements')" :value="String(p.agreements.length)" />
          </div>
        </div>
        <a class="detail-updated" href="#" @click.prevent="activityOpen = true">{{ provenanceText(p, formatDateLong) }}</a>
      </section>

      <!-- ── Tabs (in-page MpTabs) ── -->
      <MpTabs id="bpd-tabs" v-model="tabIndex" is-manual variant-color="green" class="detail-tabs">
        <MpTabList>
          <MpTab id="bpd-tab-profile">{{ t('Profile') }}</MpTab>
          <MpTab id="bpd-tab-agreements">{{ t('Agreements') }} ({{ p.agreements.length }})</MpTab>
          <MpTab id="bpd-tab-users">{{ t('Partner users') }} ({{ p.users.length }})</MpTab>
        </MpTabList>
        <MpTabPanels>
          <MpTabPanel>
            <BoPartnerProfileTab :partner="p" :draft="draft" />
          </MpTabPanel>
          <MpTabPanel>
            <BoAgreementSection :owner="{ kind: 'partner', id: p.id }" />
          </MpTabPanel>
          <MpTabPanel>
            <div class="bpd-users">
              <p class="bpd-caption">{{ t('Read-only. Partner admins manage users and roles in Partner Organization in the partner app.') }}</p>
              <ErpTablePage
                :columns="userColumns"
                :rows="(userPaged as Record<string, unknown>[])"
                :total="userTotal"
                :current-page="userPage"
                :per-page="userPer"
                :sort-key="userSortKey"
                :sort-dir="userSortDir"
                :has-active-filter="!!userSearch"
                :search="userSearch"
                filter-empty-label="users"
                no-row-hover
                @page-change="setUserPage"
                @per-page-change="setUserPer"
                @sort="toggleUserSort"
                @sort-change="setUserSort"
                @clear-filters="userSearch = ''"
              >
                <template #filters>
                  <div />
                  <div class="filter-search">
                    <MpIcon name="search" size="sm" />
                    <input v-model="userSearch" class="filter-search-input" type="text" :placeholder="t('Search...')"> <!-- pixel-police-allow: sanctioned filter-search pill -->
                  </div>
                </template>
                <template #cell-email="{ value }"><span class="bpd-cell">{{ value }}</span></template>
                <template #cell-phone="{ value }">{{ value || '—' }}</template>
                <template #cell-profession="{ value }">{{ value ? t(value as string) : '—' }}</template>
                <template #cell-role="{ value }">{{ value === 'admin' ? t('Admin') : t('User') }}</template>
                <template #empty>
                  <div class="bpd-empty">
                    <img src="/illustrations/empty-folder.png" alt="" width="288" height="240" class="bpd-empty-img">
                    <p class="bpd-empty-title">{{ t('No partner users') }}</p>
                    <p class="bpd-empty-desc">{{ t('Users join when a registration through this partner\'s link is completed.') }}</p>
                  </div>
                </template>
              </ErpTablePage>
            </div>
          </MpTabPanel>
        </MpTabPanels>
      </MpTabs>
    </div>

    <ActivityLogModal :is-open="activityOpen" :subject="name" :entries="activity" @close="activityOpen = false" />
    <BoRegistrationLinkModal v-if="linkOpen" :is-open="linkOpen" :partner-id="p.id" @close="linkOpen = false" />
    <ConfirmModal
      v-model:is-open="deactivateOpen"
      :title="tr('Deactivate {name}?', { name })"
      :description="t('The partner moves to Inactive. Its users keep their accounts, and you can activate the partner again at any time.')"
      :confirm-label="t('Deactivate')"
      :cancel-label="t('Keep active')"
      @confirm="confirmDeactivate"
    />
  </BoPage>
</template>

<style scoped>
.bpd { display: flex; flex-direction: column; gap: var(--mp-spacing-8); }
.bpd-link { margin-left: var(--mp-spacing-1); color: var(--mp-text-link); text-decoration: underline; text-underline-offset: 2px; }
.bpd-summary { display: flex; flex-direction: column; }
.bpd-grid { display: grid; grid-template-columns: minmax(0, 318px) repeat(3, minmax(0, 1fr)); column-gap: var(--mp-spacing-6); }
@media (max-width: 900px) { .bpd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.detail-updated { margin-top: var(--mp-spacing-2); align-self: flex-start; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-link); text-decoration: none; cursor: pointer; }
.detail-updated:hover { text-decoration: underline; text-underline-offset: 2px; }

.detail-tabs :deep(.mp-tab--isSelected_true),
.detail-tabs :deep(.mp-tab--isSelected_true:hover) { color: var(--mp-text-selected) !important; }
.detail-tabs :deep(.mp-tab--isSelected_true .mp-tab-selected-border) { background-color: var(--mp-border-selected, var(--mp-colors-border-selected)) !important; }
.detail-tabs :deep([data-pixel-component="MpTabList"]) { margin-bottom: var(--mp-spacing-5) !important; }

.bpd-users { display: flex; flex-direction: column; gap: var(--mp-spacing-3); }
.bpd-caption { margin: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bpd-cell { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bpd-empty { display: flex; flex-direction: column; align-items: center; padding: var(--mp-spacing-6) 0; }
.bpd-empty-img { width: auto; height: 240px; object-fit: contain; }
.bpd-empty-title { margin: 0 0 var(--mp-spacing-0\.5); font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.bpd-empty-desc { margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-sizes-md); color: var(--mp-text-secondary); }
</style>
