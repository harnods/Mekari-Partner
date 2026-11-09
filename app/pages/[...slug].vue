<script setup lang="ts">
/**
 * Catch-all page shell — the per-page title bar + stage for the remaining
 * catch-all routes (Partner Home at `/` and the dev reference `/base-template`).
 * The ERP / CRM / HR / Cowork modules were removed; any other path redirects to
 * Home. Partner flows (sign-in, registration, backoffice, /pixel) have their own
 * file-based pages under app/pages/.
 *
 * Layout + CSS are kept identical to the original ERP shell: `.page-layout` ›
 * `.page-col` › `.page-title-bar` (hidden on Home) › `.stage` (`stage--home` on
 * Home). See docs/patterns/page-title-bar.md and rule/stage-padding-24.
 */
import { defineAsyncComponent, defineComponent, type Component, h, ref, computed, onMounted, onUnmounted } from 'vue'
import { MpButton, MpSpinner } from '@mekari/pixel3'
import { useUnsavedChangesModalState } from '~/composables/useUnsavedChangesGuard'
import UnsavedChangesModal from '~/components/patterns/UnsavedChangesModal.vue'

// Shown while a page chunk is being fetched. 200ms delay = no flash for cached chunks.
const PageLoader = defineComponent({ render: () => h('div', { class: 'stage-loading' }, [h(MpSpinner, { size: 'lg' })]) })
function asyncPage(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({ loader, loadingComponent: PageLoader, delay: 200 })
}

const { pageTitle, currentPageKey } = useNavigation()
const { t } = useLocale()
const router = useRouter()

const unsavedChangesModal = useUnsavedChangesModalState()

/** Pages rendered in the stage, keyed by currentPageKey (first path segment). */
const pageRegistry: Record<string, Component> = {
  // Dev reference list page — see app/components/pages/BaseListPage.vue; also
  // showcased on /pixel/theme.
  'Base template': asyncPage(() => import('~/components/pages/BaseListPage.vue')),
  'Home':          asyncPage(() => import('~/components/pages/HomePage.vue')),
}

/** Pages whose H1 differs from the slug-derived key. */
const PAGE_TITLE_OVERRIDES: Record<string, string> = {
  'Base template': 'Base template',
}
const resolvedPageTitle = computed(() => PAGE_TITLE_OVERRIDES[currentPageKey.value] ?? pageTitle.value)

useHead({
  title: () => `Mekari Partner | ${displayLabel(resolvedPageTitle.value)}`,
})

const currentComponent = computed<Component | null>(() => pageRegistry[currentPageKey.value] ?? null)

// Removed modules (old ERP / CRM / HR / Cowork URLs) and unknown paths → Home.
onMounted(() => { if (!currentComponent.value) router.replace('/') })

// Title-bar Actions toggle (mobile) — same behaviour as the original shell.
const titleActionsOpen = ref(false)
function onTitleActionsDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement)?.closest?.('.page-actions')) titleActionsOpen.value = false
}
onMounted(() => document.addEventListener('click', onTitleActionsDocClick))
onUnmounted(() => document.removeEventListener('click', onTitleActionsDocClick))
</script>

<template>
  <div class="page-layout">
    <div class="page-col">
      <div v-if="currentPageKey !== 'Home'" class="page-title-bar">
        <h1 class="page-title-text">{{ t(resolvedPageTitle) }}</h1>
        <div class="page-actions">
          <MpButton class="page-actions-toggle" variant="primary" is-rounded right-icon="chevrons-down" @click.stop="titleActionsOpen = !titleActionsOpen">{{ t('Actions') }}</MpButton>
          <div class="page-actions-inner" :class="{ 'page-actions-inner--open': titleActionsOpen }" @click="titleActionsOpen = false" />
        </div>
      </div>

      <div class="stage" :class="{ 'stage--home': currentPageKey === 'Home' }">
        <component :is="currentComponent" v-if="currentComponent" />
      </div>
    </div>
  </div>
  <UnsavedChangesModal
    :is-open="unsavedChangesModal.isOpen.value"
    :has-save-draft="unsavedChangesModal.hasSaveDraft.value"
    @leave="unsavedChangesModal.chooseLeave"
    @draft="unsavedChangesModal.chooseDraft"
    @cancel="unsavedChangesModal.chooseCancel"
  />
</template>

<style scoped>
/* ── Page layout (flex row) ───────────────────────────────────────────────── */

.page-layout {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
}

.page-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ── Title bar ────────────────────────────────────────────────────────────── */

.page-title-bar {
  height: var(--mp-sizes-18, 72px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--mp-spacing-6);
  flex-shrink: 0;
}

.usr-help-btn {
  min-width: 0 !important; width: 40px !important; height: 40px !important;
  padding: 0 !important; border-radius: var(--mp-radii-full, 999px) !important; justify-content: center;
}
.page-title-actions {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-3);
}

/* Title-bar actions wrapper — desktop is transparent (actions lay out inline);
   mobile collapses ≥2 actions into a single "Actions" dropdown. */
.page-actions { display: flex; align-items: center; position: relative; }
.page-actions-toggle { display: none; }
.page-actions-inner { display: contents; }

@media (max-width: 600px) {
  /* Only collapse when there are ≥2 action controls (single button stays inline). */
  .page-actions:has(.page-title-actions > :nth-child(2)) > .page-actions-toggle { display: inline-flex; }
  .page-actions:has(.page-title-actions > :nth-child(2)) > .page-actions-inner {
    display: none;
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
    min-width: 220px; flex-direction: column; align-items: stretch; gap: var(--mp-spacing-2);
    background: var(--mp-background-neutral, #fff); border: 1px solid var(--mp-border-default, #e3e7e9);
    border-radius: var(--mp-radii-md, 8px); padding: var(--mp-spacing-2);
    box-shadow: var(--mp-shadows-md, 0 8px 24px rgba(0,0,0,0.12));
  }
  .page-actions:has(.page-title-actions > :nth-child(2)) > .page-actions-inner.page-actions-inner--open { display: flex; }
  /* Inside the dropdown, actions stack full width. */
  .page-actions-inner--open .page-title-actions { display: flex; flex-direction: column; align-items: stretch; gap: var(--mp-spacing-2); }
  .page-actions-inner--open .page-title-actions > * { width: 100%; }
  .page-actions-inner--open .btn-enterprise { width: 100%; justify-content: center; }
  .page-actions-inner--open .import-wrap { width: 100%; }
}

/* Import is a secondary action — hide it on mobile to keep the title bar clean. */
@media (max-width: 600px) {
  .page-import-btn { display: none; }
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

.page-title-text {
  margin: 0;
  font-size: var(--mp-font-sizes-2xl);
  font-weight: var(--mp-font-weights-semi-bold);
  line-height: var(--mp-line-heights-2xl, 32px);
  letter-spacing: var(--mp-letter-spacings-tight, -0.2px);
  color: var(--mp-text-default);
}

/* ── Breadcrumb + scope, for pages with no sidebar entry of their own ───── */
.page-title-lead {
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-0\.5);
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
  align-items: baseline;
  gap: var(--mp-spacing-3);
  min-width: 0;
}
/* The masa is context, not a second title — it sits a step down in weight. */
.page-title-meta {
  font-size: var(--mp-font-sizes-md);
  color: var(--mp-text-secondary);
  white-space: nowrap;
}

/* ── Import dropdown ────────────────────────────────────────────────────── */

.import-wrap {
  position: relative;
}

.visually-hidden-input {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.import-chevron {
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

/* Split pill (e.g. "New account ▾") — still ONE button, with a hairline between
   the label and the caret so the menu affordance reads as its own half. */
.btn-enterprise--split {
  gap: var(--mp-spacing-2);
  padding-right: var(--mp-spacing-2);
}
.btn-enterprise__split-divider {
  width: var(--mp-sizes-px, 1px);
  align-self: stretch;
  margin: calc(var(--mp-spacing-1) * -1) 0;
  background: currentColor;
  opacity: 0.3;
  flex-shrink: 0;
}
.import-chevron--open {
  transform: rotate(180deg);
}

.btn-enterprise--active {
  background: var(--mp-background-neutral-hovered, #eef0f3);
}

.import-dropdown {
  position: absolute;
  top: calc(100% + var(--mp-spacing-1));
  right: 0;
  width: 220px;
  background: var(--mp-background-neutral, #ffffff);
  border: 1px solid var(--mp-border-bold, #8c9596);
  border-radius: var(--mp-radii-md);
  box-shadow: var(--mp-shadows-sm);
  padding: var(--mp-spacing-2) 0;
  z-index: 300;
  overflow: hidden;
}

.import-group {
  display: flex;
  flex-direction: column;
}

.import-group--bordered {
  border-bottom: 1px solid var(--mp-border-default, #e3e7e9);
  padding-bottom: var(--mp-spacing-2);
  margin-bottom: 0;
}

.import-item {
  display: flex !important;
  align-items: center;
  gap: var(--mp-spacing-2);
  width: 100% !important;
  min-width: 0 !important;
  padding: var(--mp-spacing-2) var(--mp-spacing-3) !important;
  background: none !important;
  border: none !important;
  cursor: pointer;
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-default);
  text-align: left;
}
.import-item:hover {
  background: var(--mp-background-neutral-subtle, #f8f9f9) !important;
}

.import-item--ai {
  justify-content: flex-start;
  gap: var(--mp-spacing-2);
}
/* MpIcon's size prop leaves airene-brand at its natural (oversized) dimensions. */
.import-item__ai-icon {
  width: var(--mp-sizes-3\.5, 14px) !important;
  height: var(--mp-sizes-3\.5, 14px) !important;
  flex-shrink: 0;
}

/* MpButton centres its label; menu rows read as a list only when left-aligned. */
.import-item--start {
  justify-content: flex-start;
}


/* Forward bills section */
.import-forward {
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-2);
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
}

.import-forward__labels {
  display: flex;
  flex-direction: column;
}

.import-forward__title {
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-default);
}

.import-forward__email {
  font-size: var(--mp-font-sizes-sm);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-sm, 16px);
  color: var(--mp-text-secondary);
}

.import-forward__copy {
  font-size: var(--mp-font-sizes-sm);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-sm, 16px);
  color: var(--mp-text-link);
  text-decoration: underline;
  cursor: pointer;
  text-underline-offset: 2px;
  width: fit-content;
}
.import-forward__copy:hover {
  text-decoration-thickness: 2px;
}

.import-forward__desc {
  margin: 0;
  font-size: var(--mp-font-sizes-2xs, 10px);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-2xs, 12px);
  color: var(--mp-text-secondary);
}

/* ── Stage ────────────────────────────────────────────────────────────────── */

.stage-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--mp-spacing-12, 48px);
  color: var(--mp-text-placeholder);
}

.stage {
  flex: 1;
  background: var(--mp-background-stage, #ffffff);
  border-radius: var(--mp-radii-xl) var(--mp-radii-xl) 0 0;
  overflow-x: hidden;
  overflow-y: auto;
  /* 24px gutter on all four sides (rule/stage-padding-24). Sides + bottom are
     24px padding (they scroll with content); the top gap is a fixed border
     (borders don't scroll) so content keeps a 24px gap from the stage's top edge.
     The top gap is 23px border + 1px padding (still 24px total): the 1px padding
     lands the first child JUST inside the overflow clip boundary, so a top-border
     element flush at the top (e.g. the rounded filter-bar search) isn't shaved by
     the clip. */
  padding: var(--mp-sizes-0\.25, 1px) var(--mp-spacing-6) var(--mp-spacing-6);
  border-top: calc(var(--mp-spacing-6) - 1px) solid var(--mp-background-stage);
  /* Keep focus scroll-into-view clear of the fixed top border too. */
  scroll-padding-top: var(--mp-spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-5);
}
/* HR home wants a full-bleed cream header flush to the very top — drop the 24px
   top border (the gap) and the rounded top corners so its hero reaches the edge. */
.stage.stage--flush-top {
  border-top-width: 0;
  border-radius: 0;
}
/* Partner Home: the stage IS the 12-col grid container (rule/grid-12-col) — a plain
   24px padding on all four sides (no border-gap trick; Home's first child has no top
   border to protect), keeping the rounded top corners. The mint hero gradient is the
   stage's own background so it's full-bleed edge-to-edge (behind the 24px padding),
   and the white Home cards float on top of it. */
.stage.stage--home {
  padding: var(--mp-spacing-6);
  border-top-width: 0;
  background: linear-gradient(180deg, #e1f6f0 0%, var(--mp-background-stage, #ffffff) 100%);
}
/* Report index draws an edge-to-edge card grid — no stage padding/top gap. */
.stage--flush {
  padding: 0;
  border-top-width: 0;
  gap: 0;
}

/* ── Status tabs (between title bar and stage, on the gray surface) ───────── */

.page-tabs {
  display: flex;
  gap: var(--mp-spacing-5);
  padding: 0 var(--mp-spacing-6);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  flex-shrink: 0;
}

.page-tabs-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--mp-spacing-5);
  padding: 0 var(--mp-spacing-6);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  flex-shrink: 0;
}

.cycle-count-banner {
  flex-shrink: 0;
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

/* Count badge on a tab */
.page-tab-count {
  margin-left: var(--mp-spacing-1);
}

.page-tab:not(.page-tab--active):hover {
  color: var(--mp-text-default);
}

.page-tab--active {
  color: var(--mp-text-selected);
  font-weight: var(--mp-font-weights-semi-bold);
}

.page-tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--mp-text-selected);
  border-radius: var(--mp-radii-sm, 2px) var(--mp-radii-sm, 2px) 0 0;
}

/* Placeholder shown in the stage for a tabbed page (until real screens exist) */
.tab-stage-placeholder {
  margin: auto;
  text-align: center;
}
.tab-stage-placeholder__title {
  font-size: var(--mp-font-sizes-lg);
  font-weight: var(--mp-font-weights-semi-bold);
  color: var(--mp-text-default);
}
.tab-stage-placeholder__desc {
  font-size: var(--mp-font-sizes-md);
  color: var(--mp-text-secondary);
}

/* ── Airene slot (outer wrapper) ─────────────────────────────────────────── */

.airene-slot {
  /* width is set dynamically via :style */
  flex-shrink: 0;
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  padding: var(--mp-spacing-3);
  display: flex;
  gap: var(--mp-spacing-2);
  position: relative;
  overflow: hidden;
}

/* Left edge divider — resize handle */
.airene-divider {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--mp-spacing-3);               /* wider invisible hitbox */
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Visible pill inside the hitbox */
.airene-divider::after {
  content: '';
  display: block;
  width: 2px;
  height: var(--mp-spacing-10, 40px);
  background: var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-full, 999px);
  transition: background 0.15s;
}
.airene-divider:hover::after {
  background: var(--mp-border-bold, #8c9596);
}

/* White inner card */
.airene-card {
  flex: 1;
  background: var(--mp-background-neutral, #ffffff);
  border-radius: var(--mp-radii-lg, 12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Card header ─────────────────────────────────────────────────────────── */

.airene-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
  flex-shrink: 0;
}

/* History wrapper — anchor for the dropdown. min-width:0 lets the title
   truncate so the header icons on the right never get clipped. */
.airene-history-wrapper {
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
}

.airene-new-chat {
  display: inline-flex;
  align-items: center;
  gap: var(--mp-spacing-1);
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  color: var(--mp-text-default);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--mp-spacing-1) var(--mp-spacing-1\.5);
  border-radius: var(--mp-radii-md);
  line-height: var(--mp-line-heights-md);
  min-width: 0;
  max-width: 100%;
}
.airene-new-chat:hover { background: var(--mp-background-neutral-hovered, #eef0f3); }

.airene-chat-title {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.airene-chevron {
  flex-shrink: 0;
  color: var(--mp-text-secondary);
  transition: transform 0.15s ease;
}
.airene-chevron--open {
  transform: rotate(180deg);
}

/* History dropdown */
.airene-history-dropdown {
  position: absolute;
  top: calc(100% + var(--mp-spacing-1));
  left: 0;
  width: 256px;
  background: var(--mp-background-neutral, #ffffff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 10px);
  box-shadow: var(--mp-shadows-md);
  z-index: 200;
  padding: var(--mp-spacing-1) 0;
  max-height: 360px;
  overflow-y: auto;
}

.airene-history-new-btn {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-2);
  width: 100%;
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-medium, 500);
  color: var(--mp-text-default);
  text-align: left;
  border-radius: var(--mp-radii-md);
}
.airene-history-new-btn:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }

.airene-history-sep {
  height: 1px;
  background: var(--mp-border-default, #e3e7e9);
  margin: var(--mp-spacing-1) 0;
}

.airene-history-group {
  margin: 0;
  padding: var(--mp-spacing-2) var(--mp-spacing-3) var(--mp-spacing-0\.5);
  font-size: var(--mp-font-sizes-xs, 11px);
  font-weight: var(--mp-font-weights-semi-bold);
  color: var(--mp-text-subtle);
  text-transform: uppercase;
  letter-spacing: var(--mp-letter-spacings-wide, 0.4px);
  line-height: var(--mp-line-heights-sm, 16px);
}

.airene-history-item {
  display: block;
  width: 100%;
  padding: var(--mp-spacing-1\.5) var(--mp-spacing-3);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--mp-font-sizes-sm, 13px);
  font-weight: var(--mp-font-weights-regular);
  color: var(--mp-text-default);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: var(--mp-radii-sm);
}
.airene-history-item:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }

.airene-header-icons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.airene-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mp-sizes-9, 36px);
  height: var(--mp-sizes-9, 36px);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--mp-radii-md);
  color: var(--mp-text-secondary);
  padding: var(--mp-spacing-2);
}
.airene-icon-btn:hover { background: var(--mp-background-neutral-hovered, #eef0f3); }

/* Kebab (…) menu — clear / delete chat */
.airene-kebab-wrapper { position: relative; display: inline-flex; }
.airene-kebab-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 60;
  min-width: 160px;
  padding: var(--mp-spacing-1, 4px);
  background: var(--mp-background-default, #fff);
  border: 1px solid var(--mp-border-default, #e0e2e6);
  border-radius: var(--mp-radii-lg, 12px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
}
.airene-kebab-item {
  display: block;
  width: 100%;
  padding: var(--mp-spacing-2, 8px) var(--mp-spacing-3, 12px);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: var(--mp-font-sizes-md);
  color: var(--mp-text-default);
  border-radius: var(--mp-radii-md, 8px);
}
.airene-kebab-item:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }
.airene-kebab-item--danger { color: var(--mp-text-critical, #d3382e); }

/* ── Chat body ───────────────────────────────────────────────────────────── */

.airene-chat-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: var(--mp-spacing-3);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* When messages exist: align from top, enable scroll */
.airene-chat-body--has-messages {
  justify-content: flex-start;
  overflow-y: auto;
}

/* ── Chat messages ────────────────────────────────────────────────────────── */

.chat-message {
  display: flex;
  align-items: flex-start;
  gap: var(--mp-spacing-2);
  margin-bottom: 28px;
  flex-shrink: 0;
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-avatar {
  flex-shrink: 0;
  border-radius: var(--mp-radii-full, 50%);
}
/* User avatar — matches the Cowork › Chats page (36px, to the right). */
.chat-user-av { flex-shrink: 0; width: 36px !important; height: 36px !important; }
.chat-user-av :deep(> *) { width: 36px !important; height: 36px !important; }
.chat-msg-col { display: flex; flex-direction: column; min-width: 0; max-width: 100%; }
/* Multi-agent room: agent name + avatar above its message. */
.chat-agent-head { display: inline-flex; align-items: center; gap: var(--mp-spacing-2, 8px); margin-bottom: var(--mp-spacing-1, 4px); }
.chat-agent-head__av { flex-shrink: 0; width: 36px !important; height: 36px !important; background: transparent !important; }
/* Transparent avatar (no coloured disc) — the agent artwork sits on its own. */
.chat-agent-head__av :deep(*) { background-color: transparent !important; box-shadow: none !important; }
.chat-agent-head__av :deep(> *) { width: 36px !important; height: 36px !important; }
.chat-agent-head__name { font-size: var(--mp-font-sizes-md, 14px); font-weight: var(--mp-font-weights-semi-bold, 600); }

/* @agent mention chip inside a message */
.chat-bubble__rich :deep(.agent-mention) { font-weight: var(--mp-font-weights-semi-bold, 600); color: var(--mp-text-link, #1d55d4); }

/* Linked-record chips under a message */
.chat-attach { display: flex; flex-wrap: wrap; gap: var(--mp-spacing-3, 12px); margin-top: var(--mp-spacing-2, 8px); }
.chat-attach__chip { display: inline-flex; align-items: center; gap: var(--mp-spacing-1\.5, 6px); max-width: 100%; padding: 0; border: none; background: none; cursor: pointer; font-family: inherit; text-align: left; }
.chat-attach__chip:hover .chat-attach__label { text-decoration: underline; text-underline-offset: 2px; }
.chat-attach__icon { flex-shrink: 0; color: var(--mp-icon-default, #536062); }
.chat-attach__meta { display: flex; flex-direction: column; min-width: 0; }
.chat-attach__label { font-size: var(--mp-font-sizes-md, 14px); font-weight: var(--mp-font-weights-medium, 500); color: var(--mp-text-link, #1d55d4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-attach__sub { font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-attach__go { flex-shrink: 0; color: var(--mp-text-link, #1d55d4); }

/* Suggestion chips under an agent message */
.chat-msg-suggest { display: flex; flex-wrap: wrap; gap: var(--mp-spacing-2, 8px); margin-top: var(--mp-spacing-2, 8px); }
.chat-suggest-chip { padding: var(--mp-spacing-1, 4px) var(--mp-spacing-3, 12px); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-full, 999px); background: var(--mp-background-neutral, #fff); cursor: pointer; font-family: inherit; font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-link, #1d55d4); }
.chat-suggest-chip:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); border-color: var(--mp-border-bold, #8c9596); }

.chat-bubble {
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
  border-radius: var(--mp-radii-lg, 12px);
  font-size: var(--mp-font-sizes-md);
  line-height: var(--mp-line-heights-md);
  max-width: 85%;
  word-break: break-word;
}

.chat-bubble__text {
  white-space: pre-wrap;
}

/* User bubble — subtle gray (not brand), avatar to its right. */
.chat-bubble--user {
  background: var(--mp-background-neutral-subtle, #f1f3f4);
  color: var(--mp-text-default);
  border-radius: var(--mp-radii-lg, 12px);
}

/* AI answer — no avatar, no bubble: plain text spanning the column. */
.chat-bubble--assistant {
  background: transparent;
  color: var(--mp-text-default);
  border-radius: 0;
  padding: 0;
  max-width: 100%;
}
/* …but the typing loader keeps a subtle pill so the dots have a surface. */
.chat-typing.chat-bubble--assistant {
  background: var(--mp-background-neutral-subtle, #f1f3f4);
  padding: var(--mp-spacing-2) var(--mp-spacing-3);
  border-radius: var(--mp-radii-lg, 12px);
  width: fit-content;
}

/* Rich (markdown-rendered) assistant text — v-html content needs :deep() to be
   reached by scoped styles. */
.chat-bubble__rich { white-space: normal; }
.chat-bubble__rich :deep(.chat-md-p) { margin: 0; }
.chat-bubble__rich :deep(.chat-md-p + .chat-md-p) { margin-top: var(--mp-spacing-2, 8px); }
.chat-bubble__rich :deep(.chat-md-h) { margin: var(--mp-spacing-3, 12px) 0 var(--mp-spacing-1, 4px); font-weight: var(--mp-font-weights-semi-bold, 600); }
.chat-bubble__rich :deep(.chat-md-h:first-child) { margin-top: 0; }
.chat-bubble__rich :deep(.chat-md-ul) { margin: var(--mp-spacing-1, 4px) 0; padding-inline-start: var(--mp-spacing-4, 16px); }
.chat-bubble__rich :deep(.chat-md-ul li) { margin: 2px 0; }
.chat-bubble__rich :deep(strong) { font-weight: var(--mp-font-weights-semi-bold, 600); }
.chat-bubble__rich :deep(code) { font-family: var(--mp-fonts-mono, monospace); font-size: 0.9em; background: rgba(0,0,0,0.05); padding: 0 4px; border-radius: 4px; }

/* Employee mention chip */
.chat-bubble__rich :deep(.emp-chip) {
  display: inline-flex;
  align-items: center;
  gap: var(--mp-spacing-1, 4px);
  position: relative;
  padding: 1px var(--mp-spacing-1\.5, 6px) 1px 2px;
  border-radius: var(--mp-radii-full, 999px);
  background: var(--mp-background-neutral-bold, #eceef0);
  cursor: default;
  outline: none;
  vertical-align: baseline;
  line-height: 1.4;
}
.chat-bubble__rich :deep(.emp-chip-name) { font-weight: var(--mp-font-weights-semi-bold, 600); }
.chat-bubble__rich :deep(.emp-chip-av) {
  width: 18px; height: 18px; flex-shrink: 0;
  border-radius: var(--mp-radii-full, 50%);
  background-size: cover; background-position: center;
  background-color: var(--mp-background-brand-subtle, #d8e6ff);
  display: inline-flex; align-items: center; justify-content: center;
}
.chat-bubble__rich :deep(.emp-chip-av--ini) { font-size: 9px; font-weight: 700; color: var(--mp-text-brand, #1d55d4); }

/* Hover / focus coachmark */
.chat-bubble__rich :deep(.emp-coach) {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 50;
  display: none;
  align-items: center;
  gap: var(--mp-spacing-2, 8px);
  min-width: 200px;
  padding: var(--mp-spacing-3, 12px);
  border-radius: var(--mp-radii-lg, 12px);
  background: var(--mp-background-default, #fff);
  border: 1px solid var(--mp-border-default, #e0e2e6);
  box-shadow: 0 8px 24px rgba(0,0,0,0.14);
  white-space: normal;
  cursor: default;
}
.chat-bubble__rich :deep(.emp-chip:hover .emp-coach),
.chat-bubble__rich :deep(.emp-chip:focus .emp-coach),
.chat-bubble__rich :deep(.emp-chip:focus-within .emp-coach) { display: flex; }
.chat-bubble__rich :deep(.emp-coach-av) {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: var(--mp-radii-full, 50%);
  background-size: cover; background-position: center;
  background-color: var(--mp-background-brand-subtle, #d8e6ff);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
}
.chat-bubble__rich :deep(.emp-coach-body) { display: flex; flex-direction: column; gap: 1px; }
.chat-bubble__rich :deep(.emp-coach-name) { font-weight: var(--mp-font-weights-semi-bold, 600); color: var(--mp-text-default); font-size: var(--mp-font-sizes-sm, 14px); }
.chat-bubble__rich :deep(.emp-coach-meta) { font-size: var(--mp-font-sizes-xs, 12px); color: var(--mp-text-secondary); }

/* Typing indicator dots */
.chat-typing {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-1);
  padding: var(--mp-spacing-2\.5, 10px) var(--mp-spacing-3);
  min-height: var(--mp-sizes-9, 36px);
}

.typing-dot {
  width: var(--mp-sizes-1\.5, 6px);
  height: var(--mp-sizes-1\.5, 6px);
  border-radius: var(--mp-radii-full, 50%);
  background: var(--mp-text-secondary, #3a4749);
  flex-shrink: 0;
  animation: typingBounce 1.2s infinite ease-in-out;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%            { transform: translateY(-5px); opacity: 1; }
}

.airene-greetings {
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-2);
  flex-shrink: 0;
}

.airene-gem-icon {
  flex-shrink: 0;
  line-height: 0;
}

/* Mascot wrapper — THIS is what gets the body transform, so eyes rotate with it */
.mascot-wrapper {
  position: relative;
  display: inline-block;
  width: 60px;             /* mascot artwork — fixed asset dimensions */
  height: 60px;
  will-change: transform;
  transform-origin: center bottom;  /* tilt from the base */
}

.airene-mascot-img {
  display: block;
  width: 60px;             /* mascot artwork — square asset (v3) */
  height: 60px;
  /* no transform here — wrapper handles it */
}

/* Eyes drawn on the star body */
.mascot-eye {
  position: absolute;
  width: 9px;              /* mascot eye — fixed pixel positions */
  height: 9px;
  border-radius: var(--mp-radii-full, 50%);
  background: var(--mp-background-neutral, #ffffff);
  overflow: hidden;          /* clips pupil inside the white disc */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(80,30,140,0.10);  /* subtle outline */
}

/*
 * From pixel analysis: star body center x≈27, wide area y=25–44
 * Eye centers: left=(20, 32)  right=(34, 32)  — symmetric around x=27
 * CSS left/top = center − half eye-div width (9px / 2 = 4.5)
 */
.mascot-eye--left  { left: 18px; top: 33px; }
.mascot-eye--right { left: 33px; top: 33px; }

.mascot-pupil {
  width: 5px;              /* mascot pupil — fixed pixel size */
  height: 5px;
  border-radius: var(--mp-radii-full, 50%);
  background: #1a0a2e;     /* mascot pupil — illustration colour, not a UI token */
  will-change: transform;
  flex-shrink: 0;
}

.airene-greeting-title {
  margin: 0;
  font-size: var(--mp-font-sizes-lg);
  font-weight: var(--mp-font-weights-semi-bold);
  line-height: var(--mp-line-heights-lg, 24px);
  color: var(--mp-text-default);
}

/* Agent switcher */
.airene-agent-wrap { position: relative; margin-top: var(--mp-spacing-2, 8px); }
.airene-agent-btn, .airene-agent-static { display: inline-flex; align-items: center; gap: var(--mp-spacing-1\.5, 6px); padding: var(--mp-spacing-1, 4px) var(--mp-spacing-2, 8px); border: 1px solid var(--mp-border-default, #e3e7e9); background: var(--mp-background-neutral, #fff); border-radius: var(--mp-radii-full, 999px); font-family: inherit; font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-default); }
.airene-agent-btn { cursor: pointer; }
.airene-agent-btn:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); border-color: var(--mp-border-bold, #8c9596); }
.airene-agent-av { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; background: var(--mp-background-neutral-subtle, #f8f9f9); flex: 0 0 auto; }
.airene-agent-name { font-weight: var(--mp-font-weights-medium, 500); }
.airene-agent-btn svg { color: var(--mp-text-secondary); }
.airene-agent-backdrop { position: fixed; inset: 0; z-index: 40; }
.airene-agent-menu { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 50; min-width: 240px; max-height: 320px; overflow-y: auto; background: var(--mp-background-neutral, #fff); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 10px); box-shadow: var(--mp-shadows-md); padding: var(--mp-spacing-1, 4px); text-align: left; }
.airene-agent-item { display: flex; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; padding: var(--mp-spacing-2, 8px); border: none; background: none; border-radius: var(--mp-radii-md, 6px); cursor: pointer; font-family: inherit; text-align: left; }
.airene-agent-item:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }
.airene-agent-item.is-active { background: var(--mp-background-neutral-subtle, #f0f1f3); }
.airene-agent-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.airene-agent-role { font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary); }
.airene-agent-check { color: var(--mp-icon-brand, #029861); flex: 0 0 auto; }

.airene-greeting-msg {
  margin: 0;
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-default);
}

/* Suggestion list */
.airene-suggestion-list {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.airene-suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: var(--mp-spacing-1);
  padding: var(--mp-spacing-2) 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  color: var(--mp-text-default);
  text-align: left;
  line-height: var(--mp-line-heights-md);
  width: 100%;
}
.airene-suggestion-item:hover { opacity: 0.7; }

.airene-sug-icon {
  flex-shrink: 0;
  margin-top: 0;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */

.airene-footer {
  flex-shrink: 0;
  padding: var(--mp-spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-1);
}

/* Input box: white rounded rectangle */
.airene-input-box {
  background: var(--mp-background-neutral, #ffffff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  padding: var(--mp-spacing-2);
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-3);
}

/* Context chip row */
.airene-context-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mp-spacing-1);
  padding-bottom: var(--mp-spacing-1);
}

.airene-context-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--mp-spacing-1);
  padding: 3px var(--mp-spacing-1\.5) 3px var(--mp-spacing-2);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-full, 999px);
  font-size: var(--mp-font-sizes-sm);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-sm, 16px);
  color: var(--mp-text-default);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.airene-context-chip-icon {
  flex-shrink: 0;
  color: var(--mp-text-subtle);
}

.airene-context-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--mp-sizes-3\.5, 14px);
  height: var(--mp-sizes-3\.5, 14px);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--mp-text-subtle);
  padding: 0;
  border-radius: var(--mp-radii-full, 50%);
}
.airene-context-remove:hover {
  background: var(--mp-background-neutral-hovered, #eef0f3);
  color: var(--mp-text-default);
}

.airene-input-placeholder {
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-placeholder);
}

.airene-real-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-default);
  background: transparent;
  padding: 0;
}

.airene-real-input::placeholder {
  color: var(--mp-text-placeholder);
}

/* Actions row */
.airene-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.airene-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mp-sizes-7, 28px);
  height: var(--mp-sizes-7, 28px);
  padding: var(--mp-spacing-1);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--mp-radii-sm);
  color: var(--mp-text-secondary);
}
.airene-add-btn:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }

.airene-input-right {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-2);
}

.airene-model-label {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-1);
  font-size: var(--mp-font-sizes-md);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-md);
  color: var(--mp-text-default);
  cursor: pointer;
}
.airene-model-label:hover { opacity: 0.7; }

.airene-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mp-sizes-8, 32px);
  height: var(--mp-sizes-8, 32px);
  border: none;
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  border-radius: var(--mp-radii-full, 999px);
  cursor: pointer;
  flex-shrink: 0;
}
.airene-send-btn:hover { background: var(--mp-background-neutral-hovered, #eef0f3); }

/* Disclaimer */
.airene-disclaimer {
  margin: 0;
  font-size: var(--mp-font-sizes-sm);
  font-weight: var(--mp-font-weights-regular);
  line-height: var(--mp-line-heights-sm, 16px);
  color: var(--mp-text-secondary);
}

.airene-disclaimer-link {
  color: var(--mp-text-link);
  cursor: pointer;
  text-decoration: none;
}
.airene-disclaimer-link:hover { text-decoration: underline; }

/* ── Panel slide transition ───────────────────────────────────────────────── */

.panel-enter-active, .panel-leave-active {
  transition: opacity 0.2s ease, max-width 0.2s ease;
  overflow: hidden;
}
.panel-enter-from, .panel-leave-to {
  opacity: 0;
  max-width: 0;
}
.panel-enter-to, .panel-leave-from {
  opacity: 1;
  max-width: 640px; /* generous upper bound */
}
</style>
