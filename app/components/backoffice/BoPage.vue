<script setup lang="ts">
/**
 * BoPage — the page shell every Backoffice (internal portal) page uses.
 * Backoffice pages are Nuxt file routes under app/pages/backoffice/, so they
 * don't go through [...slug].vue — this component reproduces its chrome with
 * the SAME dimensions/CSS (docs/patterns/page-title-bar.md, rule/stage-padding-24):
 *
 *   ┌ .page-title-bar (72px, neutral-subtle) ─────────────────────────────┐
 *   │ [breadcrumb]                                                         │
 *   │ Title  [#title-extra: status badge]                        [#actions]│
 *   └──────────────────────────────────────────────────────────────────────┘
 *   [ .page-tabs (optional status tabs, outside the stage — docs/patterns/tabs.md) ]
 *   ┌ .stage (white, 24px padding) ───────────────────────────────────────┐
 *   │ default slot                                                         │
 *
 * Props
 *   title       H1 text (already translated by the caller)
 *   breadcrumb  { label, to } — small link above the H1 (detail / form pages)
 *   tabs        [{ key, label, count? }] — status tabs below the title bar (≥2 to render)
 *   tab         v-model:tab — active tab key
 *   flush       stage without padding/gap (edge-to-edge content, e.g. a kanban board)
 * Slots: #title-extra (beside the H1), #actions (title-bar right), default (stage)
 *
 * Session guard: with no internal-portal session (bo.session) the page bounces
 * to /backoffice/login — so every page that uses BoPage is login-protected.
 */
import { onMounted } from 'vue'
import { MpBadge } from '@mekari/pixel3'
import { bo } from '~/data/backoffice'

withDefaults(defineProps<{
  title: string
  breadcrumb?: { label: string; to: string } | null
  tabs?: { key: string; label: string; count?: number | null }[]
  tab?: string
  flush?: boolean
}>(), { breadcrumb: null, tabs: () => [], tab: '', flush: false })

const emit = defineEmits<{ 'update:tab': [key: string] }>()
const router = useRouter()
onMounted(() => { if (!bo.session) router.replace('/backoffice/login') })
</script>

<template>
  <div class="bo-page">
    <div class="page-title-bar">
      <div v-if="breadcrumb" class="page-title-lead">
        <button class="btn-enterprise page-breadcrumb" type="button" @click="router.push(breadcrumb.to)">{{ breadcrumb.label }}</button>
        <div class="page-title-row">
          <h1 class="page-title-text">{{ title }}</h1>
          <slot name="title-extra" />
        </div>
      </div>
      <div v-else class="page-title-row">
        <h1 class="page-title-text">{{ title }}</h1>
        <slot name="title-extra" />
      </div>
      <div v-if="$slots.actions" class="page-title-actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="tabs.length > 1" class="page-tabs" role="tablist">
      <button
        v-for="tb in tabs"
        :key="tb.key"
        class="page-tab"
        :class="{ 'page-tab--active': tab === tb.key }"
        role="tab"
        :aria-selected="tab === tb.key"
        @click="emit('update:tab', tb.key)"
      >
        {{ tb.label }}
        <MpBadge v-if="tb.count != null" class="page-tab-count" for="additionalInformation" type="warning">{{ tb.count }}</MpBadge>
      </button>
    </div>

    <div class="stage" :class="{ 'stage--flush': flush }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Column wrapper — mirrors [...slug].vue .page-layout/.page-col */
.bo-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* ── Title bar — copied from [...slug].vue (docs/patterns/page-title-bar.md) ── */
.page-title-bar {
  height: var(--mp-sizes-18, 72px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-spacing-3);
  padding: 0 var(--mp-spacing-6);
  flex-shrink: 0;
}
.page-title-actions {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-2);
  flex-shrink: 0;
}
.page-title-text {
  margin: 0;
  font-size: var(--mp-font-sizes-2xl);
  font-weight: var(--mp-font-weights-semi-bold);
  line-height: var(--mp-line-heights-2xl, 32px);
  letter-spacing: var(--mp-letter-spacings-tight, -0.2px);
  color: var(--mp-text-default);
}
.page-title-lead {
  display: flex;
  flex-direction: column;
  gap: 0; /* rule/detail-breadcrumb-no-gap */
  min-width: 0;
}
.page-breadcrumb {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--mp-font-sizes-sm);
  line-height: var(--mp-line-heights-sm);
  color: var(--mp-text-link);
}
.page-breadcrumb:hover { text-decoration: underline; text-underline-offset: 2px; }
.page-title-row {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-3);
  min-width: 0;
}
@media (max-width: 600px) {
  .page-title-bar { padding-left: var(--mp-spacing-4); padding-right: var(--mp-spacing-4); gap: var(--mp-spacing-2); }
  .page-title-text {
    font-size: var(--mp-font-sizes-xl, 20px);
    line-height: 26px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ── Status tabs — copied from [...slug].vue (docs/patterns/tabs.md) ── */
.page-tabs {
  display: flex;
  gap: var(--mp-spacing-5);
  padding: 0 var(--mp-spacing-6);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  flex-shrink: 0;
  overflow-x: auto;
}
.page-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--mp-spacing-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--mp-spacing-3) 0;
  font-size: var(--mp-font-sizes-md);
  line-height: var(--mp-line-heights-md);
  font-weight: var(--mp-font-weights-regular);
  color: var(--mp-text-secondary);
  white-space: nowrap;
  transition: color 100ms;
}
.page-tab-count { margin-left: var(--mp-spacing-1); }
.page-tab:not(.page-tab--active):hover { color: var(--mp-text-default); }
.page-tab--active { color: var(--mp-text-selected); font-weight: var(--mp-font-weights-semi-bold); }
.page-tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--mp-sizes-0\.5, 2px);
  background: var(--mp-text-selected);
  border-radius: var(--mp-radii-sm, 2px) var(--mp-radii-sm, 2px) 0 0;
}

/* ── Stage — copied from [...slug].vue (rule/stage-padding-24) ── */
.stage {
  flex: 1;
  background: var(--mp-background-stage, #ffffff);
  border-radius: var(--mp-radii-xl) var(--mp-radii-xl) 0 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--mp-sizes-0\.25, 1px) var(--mp-spacing-6) var(--mp-spacing-6);
  border-top: calc(var(--mp-spacing-6) - 1px) solid var(--mp-background-stage);
  scroll-padding-top: var(--mp-spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-5);
}
.stage--flush {
  padding: 0;
  border-top-width: 0;
  gap: 0;
}
</style>
