<script setup lang="ts">
import { computed } from 'vue'
import { MpToastManager } from '@mekari/pixel3'
// DevChangesOverlay disabled — coachmarks were distracting during dev.
// import DevChangesOverlay from '~/components/patterns/DevChangesOverlay.vue'

// Backoffice (Mekari Partner internal portal) owns its own sidebar. Partner Home
// (/) and the other catch-all routes are full-bleed: no left sidebar.
const route = useRoute()
const isBackoffice = computed(() => route.path.startsWith('/backoffice'))
// Dev 12-col grid overlay (toggle with Shift+G, or window.__mpGrid.show()).
const { visible: gridVisible } = useGridOverlay()
</script>

<template>
  <div class="app-shell">
    <PartnerHeader />
    <div class="main-container">
      <BackofficeSidebar v-if="isBackoffice" />
      <div class="content-area">
        <slot />
        <GridOverlay v-if="gridVisible" />
      </div>
    </div>
    <MpToastManager />
    <!-- <DevChangesOverlay /> -->
  </div>
</template>

<style>
/*
 * ── Pixel Token v2.4 — Enterprise theme ─────────────────────────────────────
 *
 * Pixel's PostCSS plugin generates utility classes but does NOT inject semantic
 * CSS custom property definitions globally. We define them here so all custom
 * components (ErpHeader, ErpSidebar, ErpTablePage, etc.) can reference them.
 *
 * Values are the ENTERPRISE theme values from Token v2.4.
 * Source: https://docs.mekari.design/docs/design-token-v2-4.html
 */

:root {
  /* ── Short-alias layer — re-based onto Pixel's --mp-colors-* ───────────────
   * Each short --mp-* alias references Pixel's generated --mp-colors-* token
   * (the full v2.4 Enterprise set Pixel injects on <body>), with the Enterprise
   * hex kept as SSR/no-JS fallback. Because every ERP component reads these
   * short aliases, the Mekari Partner layer
   * (app/assets/css/tokens/mekari-partner.css) can recolor the whole app by
   * overriding --mp-colors-* once — ERP chrome AND Pixel components together. */
  --mp-background-brand: var(--mp-colors-background-brand, #f0fbf7);
  --mp-background-brand-bold: var(--mp-colors-background-brand-bold, #029861);
  --mp-background-brand-bold-hovered: var(--mp-colors-background-brand-bold-hovered, #0f6d4d);
  --mp-background-brand-bold-selected: var(--mp-colors-background-brand-bold-selected, #0f6d4d);
  --mp-background-brand-selected: var(--mp-colors-background-brand-selected, #d6f4e9);
  --mp-background-danger: var(--mp-colors-background-danger, #fceeed);
  --mp-background-disabled: var(--mp-colors-background-disabled, #f8f9f9);
  --mp-background-highlight: var(--mp-colors-background-highlight, #f3f1fc);
  --mp-background-information: var(--mp-colors-background-information, #eef0fc);
  --mp-background-information-bold: var(--mp-colors-background-information-bold, #4b61dc);
  --mp-background-inverse: var(--mp-colors-background-inverse, #1d2125);
  --mp-background-nav-stack-hovered: var(--mp-colors-background-nav-stack-hovered, #d6f4e9);
  --mp-background-neutral: var(--mp-colors-background-neutral, #ffffff);
  --mp-background-neutral-bold: var(--mp-colors-background-neutral-bold, #243032);
  --mp-background-neutral-hovered: var(--mp-colors-background-neutral-hovered, #f8f9f9);
  --mp-background-neutral-pressed: var(--mp-colors-background-neutral-pressed, #ebf0f1);
  --mp-background-neutral-selected: var(--mp-colors-background-neutral-selected, #f8f9f9);
  --mp-background-neutral-subtle: var(--mp-colors-background-neutral-subtle, #f8f9f9);
  --mp-background-neutral-subtle-hovered: var(--mp-colors-background-neutral-subtle-hovered, #ebf0f1);
  --mp-background-neutral-subtle-selected: var(--mp-colors-background-neutral-subtle-selected, #ebf0f1);
  --mp-background-stage: var(--mp-colors-background-stage, #ffffff);
  --mp-background-success: var(--mp-colors-background-success, #f2f9f6);
  --mp-background-success-bold: var(--mp-colors-background-success-bold, #1c8459);
  --mp-background-surface: var(--mp-colors-background-surface, #f8f9f9);
  --mp-background-surface-bold: var(--mp-colors-background-surface-bold, #142d26);
  --mp-background-warning: var(--mp-colors-background-warning, #fdf6dd);
  --mp-background-warning-bold: var(--mp-colors-background-warning-bold, #f5cd47);
  --mp-border-bold: var(--mp-colors-border-bold, #8c9596);
  --mp-border-brand: var(--mp-colors-border-brand, #0f6d4d);
  --mp-border-danger: var(--mp-colors-border-danger, #e2483d);
  --mp-border-default: var(--mp-colors-border-default, #e3e7e9);
  --mp-border-default-subtle: var(--mp-colors-border-default-subtle, #ebf0f1);
  --mp-border-focused: var(--mp-colors-border-focused, #41c6a0);
  --mp-border-form: var(--mp-colors-border-form, #1d1f2429);
  --mp-border-information: var(--mp-colors-border-information, #6577e2);
  --mp-border-selected: var(--mp-colors-border-selected, #029861);
  --mp-border-success: var(--mp-colors-border-success, #029861);
  --mp-border-warning: var(--mp-colors-border-warning, #f5cd47);
  --mp-icon-brand: var(--mp-colors-icon-brand, #029861);
  --mp-icon-danger: var(--mp-colors-icon-danger, #c33e35);
  --mp-icon-default: var(--mp-colors-icon-default, #536062);
  --mp-icon-disabled: var(--mp-colors-icon-disabled, #8c9596);
  --mp-icon-information: var(--mp-colors-icon-information, #6577e2);
  --mp-icon-subtle: var(--mp-colors-icon-subtle, #e3e7e9);
  --mp-icon-success: var(--mp-colors-icon-success, #1fb088);
  --mp-icon-warning: var(--mp-colors-icon-warning, #e46910);
  --mp-text-danger: var(--mp-colors-text-danger, #a8352d);
  --mp-text-default: var(--mp-colors-text-default, #080d0e);
  --mp-text-disabled: var(--mp-colors-text-disabled, #8c9596);
  --mp-text-information: var(--mp-colors-text-information, #4b61dc);
  --mp-text-inverse: var(--mp-colors-text-inverse, #ffffff);
  --mp-text-inverse-static: var(--mp-colors-text-inverse-static, #ffffff);
  --mp-text-link: var(--mp-colors-text-link, #165082);
  --mp-text-placeholder: var(--mp-colors-text-placeholder, #6e7a7c);
  --mp-text-secondary: var(--mp-colors-text-secondary, #3a4749);
  --mp-text-secondary-pressed: var(--mp-colors-text-secondary-pressed, #243032);
  --mp-text-selected: var(--mp-colors-text-selected, #0f6d4d);
  --mp-text-success: var(--mp-colors-text-success, #0f6d4d);
  --mp-text-warning: var(--mp-colors-text-warning, #a14a0b);
  /* no --mp-colors-* counterpart — kept literal */
  --mp-text-subtle: #6e7a7c;

  /* Typography */
  --mp-fonts-body: "Inter", -apple-system, BlinkMacSystemFont, Helvetica, Arial,
    sans-serif;

  /* Radius */
  --mp-radii-md: 0.375rem;

  /* Shadow (Enterprise uses #1D1F2429 as shadow color) */
  --mp-shadows-sm: 0px 10px 15px -3px #1d1f2429, 0px 4px 6px -2px #1d1f2429;
  --mp-shadows-md: 0 8px 24px rgba(0, 0, 0, 0.10);
  --mp-shadows-lg: 0 4px 16px rgba(0, 0, 0, 0.12);

  /* ── Airene (Mekari AI) brand tokens — extends 2.4 Enterprise palette ── */
  --mp-airene-default: #651fff;
  --mp-airene-bold: #5a41d6;
  --mp-airene-hovered: #7c3aed;
  --mp-airene-pressed: #6d28d9;
  --mp-airene-subtle: #ede9fe;
  --mp-airene-banner-bg: #f6f3ff;
  --mp-airene-banner-text: #5221a5;
  --mp-airene-badge-bg: #f3f1fc;
  --mp-airene-badge-border: #8270db;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--mp-fonts-body);
  -webkit-font-smoothing: antialiased;
  background: var(--mp-background-surface-bold);
  color: var(--mp-text-default);
}

#__nuxt {
  height: 100%;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  border-left: 2px solid var(--mp-background-surface-bold);
  border-right: 2px solid var(--mp-background-surface-bold);
  border-bottom: 2px solid var(--mp-background-surface-bold);
  border-radius: 12px;
}

/* With the product rail shown, a dark-green backing sits behind the module-nav so
   its rounded top-left corner reads continuous with the dark rail beside it. Only
   ever visible through the rounded-corner cutouts (children tile the rest). */
.main-container--rail {
  background: var(--mp-background-surface-bold);
}
/* Report full-screen — frame the white stage with an even 2px base-colour
   border on all four sides, keeping the 12px rounded corners. */
.main-container--fullscreen {
  border: 2px solid var(--mp-background-surface-bold);
  border-radius: 12px;
}
.main-container--rail .sidebar {
  border-top-left-radius: 12px;
}

.content-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  /* anchor for the absolutely-positioned GridOverlay */
  position: relative;
}
</style>
