<template>
  <!-- J-01 Internal portal dashboard. Counts are live from app/data/backoffice.ts. -->
  <BoPage :title="t('Home')">

    <div class="bo-grid" data-devchange="bo-home-full-bleed">
      <!-- Registrations pipeline -->
      <section class="bo-card bo-card--full">
        <header class="bo-card__head">
          <h2 class="bo-card__title">{{ t('Registrations') }}</h2>
          <NuxtLink class="bo-link" to="/backoffice/registrations">{{ t('View registrations') }}</NuxtLink>
        </header>
        <div class="bo-stages">
          <NuxtLink v-for="s in BO_STAGES" :key="s" class="bo-stage" to="/backoffice/registrations">
            <ErpStatusBadge :status="s" :label="t(s)" />
            <span class="bo-stat">{{ c.ticketsByStage[s] }}</span>
            <span class="bo-caption">{{ t(BO_STAGE_CAPTION[s]) }}</span>
          </NuxtLink>
        </div>
        <ul class="bo-attn">
          <li v-for="a in attention" :key="a.label" class="bo-attn__item">
            <span class="bo-attn__count" :class="{ 'bo-attn__count--zero': !a.n }">{{ a.n }}</span>
            <span>{{ a.label }}</span>
          </li>
        </ul>
      </section>

      <!-- Partners · Data change · Documents · Roster — one box, 2×2, no gaps -->
      <div class="bo-quad" data-devchange="bo-home-quad">
        <!-- Partners by status -->
        <section class="bo-card bo-quad__cell">
          <header class="bo-card__head">
            <h2 class="bo-card__title">{{ t('Partners') }}</h2>
            <NuxtLink class="bo-link" to="/backoffice/partners">{{ t('View partners') }}</NuxtLink>
          </header>
          <div class="bo-kpis">
            <div v-for="s in partnerStatuses" :key="s" class="bo-kpi" data-devchange="bo-home-partner-kpi">
              <span class="bo-stat">{{ c.partnersByStatus[s] }}</span>
              <span class="bo-caption">{{ t(s) }}</span>
            </div>
          </div>
        </section>

        <!-- Partner data change -->
        <section class="bo-card bo-quad__cell">
          <header class="bo-card__head">
            <h2 class="bo-card__title">{{ t('Partner Data Change') }}</h2>
            <NuxtLink class="bo-link" to="/backoffice/partner-data-change">{{ t('View requests') }}</NuxtLink>
          </header>
          <div class="bo-kpis">
            <div class="bo-kpi">
              <span class="bo-stat">{{ c.crInReview }}</span>
              <span class="bo-caption">{{ t('Requests in review') }}</span>
            </div>
          </div>
        </section>

        <!-- Document repository -->
        <section class="bo-card bo-quad__cell">
          <header class="bo-card__head">
            <h2 class="bo-card__title">{{ t('Document Repository') }}</h2>
            <NuxtLink class="bo-link" to="/backoffice/documents">{{ t('View documents') }}</NuxtLink>
          </header>
          <div class="bo-kpis">
            <div class="bo-kpi">
              <span class="bo-stat">{{ c.docsPending }}</span>
              <span class="bo-caption">{{ t('Pending documents') }}</span>
            </div>
            <div class="bo-kpi">
              <span class="bo-stat">{{ c.docsExpiringSoon }}</span>
              <span class="bo-caption">{{ t('Ending in 30 days') }}</span>
            </div>
            <div class="bo-kpi">
              <span class="bo-stat">{{ c.docsExpired }}</span>
              <span class="bo-caption">{{ t('Expired documents') }}</span>
            </div>
          </div>
        </section>

        <!-- Roster + configurations -->
        <section class="bo-card bo-quad__cell">
          <header class="bo-card__head">
            <h2 class="bo-card__title">{{ t('Roster and configurations') }}</h2>
          </header>
          <div class="bo-kpis">
            <NuxtLink class="bo-kpi bo-kpi--link" to="/backoffice/account-owners">
              <span class="bo-stat">{{ c.accountOwners }}</span>
              <span class="bo-caption">{{ t('Partner Account Owners') }}</span>
            </NuxtLink>
            <NuxtLink class="bo-kpi bo-kpi--link" to="/backoffice/trainers">
              <span class="bo-stat">{{ c.trainers }}</span>
              <span class="bo-caption">{{ t('Trainers') }}</span>
            </NuxtLink>
            <NuxtLink class="bo-kpi bo-kpi--link" to="/backoffice/configurations/master-agreements">
              <span class="bo-stat">{{ c.activeMas }}</span>
              <span class="bo-caption">{{ t('Active master agreements') }}</span>
            </NuxtLink>
          </div>
        </section>
      </div>

      <!-- Latest announcement -->
      <section class="bo-card bo-card--full">
        <header class="bo-card__head">
          <h2 class="bo-card__title">{{ t('Latest announcement') }}</h2>
          <NuxtLink class="bo-link" to="/backoffice/announcements">{{ t('View announcements') }}</NuxtLink>
        </header>
        <div v-if="c.latestAnnouncement" class="bo-ann">
          <span class="bo-ann__title">{{ c.latestAnnouncement.title }}</span>
          <span class="bo-ann__desc">{{ c.latestAnnouncement.desc }}</span>
          <span class="bo-caption">{{ t('Posted') }} {{ formatDateTimeLong(c.latestAnnouncement.postedAt) }}</span>
        </div>
        <div v-else class="bo-empty">
          <img src="/illustrations/empty-folder.png" alt="" class="bo-empty__art" />
          <span class="bo-ann__title">{{ t('No announcements yet') }}</span>
          <span class="bo-caption">{{ t('Announcements you post appear in every partner app.') }}</span>
          <MpButton variant="secondary" is-rounded @click="router.push('/backoffice/announcements')">{{ t('Go to Announcements') }}</MpButton>
        </div>
      </section>
    </div>
  </BoPage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MpButton } from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import { dashboardCounts, BO_STAGES, BO_STAGE_CAPTION, type BoPartnerStatus } from '~/data/backoffice'
import { formatDateTimeLong } from '~/utils/date'

const { t } = useLocale()
const router = useRouter()

const c = computed(() => dashboardCounts())
const partnerStatuses: BoPartnerStatus[] = ['Unregistered', 'Registered', 'Active', 'Inactive']
const attention = computed(() => [
  { n: c.value.needsOwner, label: t('Registration Request tickets without an Account Owner') },
  { n: c.value.invalidChecks, label: t('Data Validation tickets with an Invalid check') },
  { n: c.value.readyToComplete, label: t('Agreement Drafting tickets ready to complete') },
])

useHead({ title: () => `Mekari Partner | ${t('Internal portal')}` })
</script>

<style scoped>
/* Full-bleed 12-col grid (rule/grid-12-col): fluid columns fill the whole stage
   (no 1440 cap on Home), 12px gutter; count steps 12 → 10 → 8 → 6 → 4. */
.bo-grid {
  --bo-cols: 12;
  display: grid;
  grid-template-columns: repeat(var(--bo-cols), minmax(0, 1fr));
  column-gap: var(--mp-spacing-6, 24px);
  row-gap: var(--mp-spacing-8, 32px);
}
.bo-card--full { grid-column: 1 / -1; }
@media (max-width: 1199.98px) { .bo-grid { --bo-cols: 10; } }
@media (max-width: 991.98px) { .bo-grid { --bo-cols: 8; } }
@media (max-width: 767.98px) { .bo-grid { --bo-cols: 6; } }
@media (max-width: 575.98px) { .bo-grid { --bo-cols: 4; } }

/* Partners / Partner Data Change / Document Repository / Roster: one bordered
   box split 2×2 with hairline dividers, no gaps (rule/surface-border-no-shadow). */
.bo-quad {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  overflow: hidden;
}
.bo-quad__cell { padding: var(--mp-spacing-5, 20px); }
.bo-quad__cell:nth-child(odd) { border-right: 1px solid var(--mp-border-default, #e3e7e9); }
.bo-quad__cell:nth-child(n+3) { border-top: 1px solid var(--mp-border-default, #e3e7e9); }
@media (max-width: 767.98px) {
  .bo-quad { grid-template-columns: minmax(0, 1fr); }
  .bo-quad__cell:nth-child(odd) { border-right: 0; }
  .bo-quad__cell:nth-child(n+2) { border-top: 1px solid var(--mp-border-default, #e3e7e9); }
}

/* Sections sit straight on the stage — no card box inside the stage. */
.bo-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-4);
}
.bo-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); }
.bo-card__title { margin: 0; font-size: var(--mp-font-sizes-lg); line-height: var(--mp-line-heights-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.bo-link { font-size: var(--mp-font-sizes-md); color: var(--mp-text-link); text-decoration: none; white-space: nowrap; }
.bo-link:hover { text-decoration: underline; text-underline-offset: 2px; }

.bo-stat { font-size: var(--mp-font-sizes-xl); line-height: var(--mp-line-heights-xl); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.bo-caption { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }

/* Stage tiles */
.bo-stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--mp-spacing-3); }
.bo-stage {
  display: flex; flex-direction: column; align-items: flex-start; gap: var(--mp-spacing-2);
  padding: var(--mp-spacing-4);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-md, 6px);
  text-decoration: none;
  transition: background-color 100ms;
}
.bo-stage:hover, .bo-kpi--link:hover { background: var(--mp-background-neutral-hovered, #f8f9f9); }

.bo-attn { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--mp-spacing-2); }
.bo-attn__item { display: flex; align-items: center; gap: var(--mp-spacing-3); font-size: var(--mp-font-sizes-md); color: var(--mp-text-default); }
.bo-attn__count { min-width: var(--mp-sizes-6, 24px); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-warning); text-align: right; }
.bo-attn__count--zero { color: var(--mp-text-secondary); }

.bo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: var(--mp-spacing-3); }
.bo-kpi { display: flex; flex-direction: column; align-items: flex-start; gap: var(--mp-spacing-1); text-decoration: none; border-radius: var(--mp-radii-md, 6px); }
.bo-kpi--link { padding: var(--mp-spacing-2); margin: calc(-1 * var(--mp-spacing-2)); }

.bo-ann { display: flex; flex-direction: column; gap: var(--mp-spacing-1); }
.bo-ann__title { font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.bo-ann__desc { font-size: var(--mp-font-sizes-md); color: var(--mp-text-default); }

/* Empty state — rule/empty-state-structure */
.bo-empty { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2); padding: var(--mp-spacing-6) 0; text-align: center; }
.bo-empty__art { width: 120px; height: auto; }
</style>
