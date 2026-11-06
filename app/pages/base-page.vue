<script setup lang="ts">
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BASE PAGE TEMPLATE — the structural shell of an ERP screen.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Anatomy (top → in):
 *    • HEADER      — the navy top bar (brand, search, user)
 *    • CONTAINER   — the row that holds the sidebar + content
 *      • SIDEBAR   — left navigation rail
 *      • CONTENT   — the working column, which is:
 *          · PAGE TITLE — the title bar (H1 + page actions)
 *          · STAGE      — the white surface where the page's content lives
 *
 *  In the real app these regions are wired for you: HEADER/CONTAINER/SIDEBAR come
 *  from `app/layouts/default.vue` (ErpHeader + .main-container + ErpSidebar), and
 *  the PAGE TITLE + STAGE come from `app/pages/[...slug].vue`. A real page only
 *  fills the STAGE (e.g. app/components/pages/BaseListPage.vue).
 *
 *  This file is a SELF-CONTAINED copy of that whole anatomy (layout: false, so no
 *  app chrome wraps it) — a single reference you can look at or lift from. Drop
 *  your content into the STAGE slot below.
 */
import { MpIcon, MpButton } from '@mekari/pixel3'
import erpLogo from '~/assets/images/mekari-erp-logo.svg?url'

definePageMeta({ layout: false })
useHead({ title: 'Base page template · Mekari ERP' })

// Left-nav sample items (swap for your module's nav).
const nav = [
  { label: 'Overview', active: true },
  { label: 'Records' },
  { label: 'Reports' },
  { label: 'Settings' },
]
</script>

<template>
  <!-- ── CONTAINER (viewport) ───────────────────────────────────────────────── -->
  <div class="bp" data-devchange="base-page-template">
    <!-- ── HEADER ──────────────────────────────────────────────────────────── -->
    <header class="bp__header">
      <span class="bp__region-tag">Header</span>
      <img :src="erpLogo" alt="Mekari ERP" class="bp__logo" />
      <div class="bp__search">
        <MpIcon name="search" size="sm" />
        <span>Search or jump to…</span>
      </div>
      <span class="bp__avatar">RC</span>
    </header>

    <!-- ── CONTAINER row: sidebar + content ────────────────────────────────── -->
    <div class="bp__body">
      <span class="bp__region-tag bp__region-tag--onlight">Container</span>

      <!-- ── SIDEBAR (left) ────────────────────────────────────────────────── -->
      <aside class="bp__sidebar">
        <span class="bp__region-tag bp__region-tag--onlight">Sidebar</span>
        <div class="bp__navlabel">SECTION</div>
        <a v-for="item in nav" :key="item.label" class="bp__navitem" :class="{ 'is-active': item.active }">{{ item.label }}</a>
      </aside>

      <!-- ── CONTENT (page title + stage) ──────────────────────────────────── -->
      <main class="bp__content">
        <!-- PAGE TITLE — the title bar: H1 + page actions -->
        <div class="bp__titlebar">
          <div>
            <span class="bp__region-tag bp__region-tag--onlight">Page title</span>
            <h1 class="bp__h1">Page title</h1>
          </div>
          <div class="bp__titleactions">
            <MpButton variant="secondary" is-rounded>Secondary</MpButton>
            <MpButton variant="primary" left-icon="add" is-rounded>Primary</MpButton>
          </div>
        </div>

        <!-- STAGE — the white surface; drop the page content here -->
        <section class="bp__stage">
          <span class="bp__region-tag bp__region-tag--onlight">Stage</span>
          <slot>
            <div class="bp__placeholder">
              <p>Stage — your page content goes here.</p>
              <p class="bp__placeholder-sub">e.g. drop in <code>&lt;BaseListPage /&gt;</code> for a standard list page.</p>
            </div>
          </slot>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.bp {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--mp-background-surface, #f8f9f9);
  color: var(--mp-text-default, #080d0e);
  font-family: var(--mp-fonts-body, Inter, sans-serif);
}

/* small region label so the anatomy is legible — delete when you copy this. */
.bp__region-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mp-text-inverse, #fff);
  opacity: 0.6;
  pointer-events: none;
}
.bp__region-tag--onlight { color: var(--mp-text-subtle, #6e7a7c); opacity: 0.7; }

/* ── HEADER ─────────────────────────────────────────────────────────────── */
.bp__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-4, 16px);
  height: var(--mp-sizes-14, 56px);
  padding: 0 var(--mp-spacing-5, 20px);
  background: var(--mp-background-surface-bold, #142d26);
  color: var(--mp-text-inverse, #fff);
}
.bp__logo { height: 24px; width: auto; display: block; }
.bp__search {
  display: flex; align-items: center; gap: var(--mp-spacing-2, 8px);
  flex: 1; max-width: 420px; margin: 0 auto;
  height: 36px; padding: 0 var(--mp-spacing-3, 12px); /* pixel-police-allow: 36px search-pill height, no token (matches erp.css) */
  background: rgba(255, 255, 255, 0.12); /* pixel-police-allow: translucent white on dark demo bar, no token */
  border-radius: var(--mp-radii-full, 999px);
  font-size: var(--mp-font-sizes-sm, 14px);
  color: rgba(255, 255, 255, 0.8); /* pixel-police-allow: muted white on dark demo bar, no token */
}
.bp__avatar {
  display: grid; place-items: center;
  width: var(--mp-sizes-8, 32px); height: var(--mp-sizes-8, 32px); border-radius: 50%;
  background: var(--mp-background-information, #99b4df);
  color: var(--mp-background-surface-bold, #0b257e);
  font-size: 12px; font-weight: 600;
}

/* ── CONTAINER row ──────────────────────────────────────────────────────── */
.bp__body { position: relative; display: flex; flex: 1; min-height: 0; }

/* ── SIDEBAR ────────────────────────────────────────────────────────────── */
.bp__sidebar {
  position: relative;
  width: 220px; /* pixel-police-allow: fixed demo sidebar width, no token */
  flex-shrink: 0;
  padding: var(--mp-spacing-5, 20px) var(--mp-spacing-3, 12px);
  background: var(--mp-background-stage, #fff);
  border-right: 1px solid var(--mp-border-default, #e3e7e9);
}
.bp__navlabel { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mp-text-secondary, #3a4749); padding: var(--mp-spacing-1, 4px) var(--mp-spacing-2, 8px); margin-bottom: var(--mp-spacing-1, 4px); }
.bp__navitem {
  display: block;
  font-size: var(--mp-font-sizes-sm, 14px);
  color: var(--mp-text-default, #080d0e);
  text-decoration: none;
  padding: var(--mp-spacing-2, 8px);
  border-radius: var(--mp-radii-md, 6px);
  cursor: pointer;
}
.bp__navitem:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }
.bp__navitem.is-active {
  background: var(--mp-background-brand, #ecf6f1);
  color: var(--mp-text-selected, #3f8a68);
  font-weight: var(--mp-font-weights-semi-bold, 600);
}

/* ── CONTENT ────────────────────────────────────────────────────────────── */
.bp__content { position: relative; display: flex; flex-direction: column; flex: 1; min-width: 0; }
.bp__titlebar {
  position: relative;
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--mp-spacing-4, 16px);
  padding: var(--mp-spacing-6, 24px) var(--mp-spacing-7, 28px) var(--mp-spacing-4, 16px);
}
.bp__h1 { font-size: var(--mp-font-sizes-2xl, 24px); font-weight: var(--mp-font-weights-bold, 700); color: var(--mp-text-default, #080d0e); }
.bp__titleactions { display: flex; gap: var(--mp-spacing-2, 8px); flex-shrink: 0; }

/* ── STAGE ──────────────────────────────────────────────────────────────── */
.bp__stage {
  position: relative;
  flex: 1;
  margin: 0 var(--mp-spacing-7, 28px) var(--mp-spacing-7, 28px);
  background: var(--mp-background-stage, #fff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  padding: var(--mp-spacing-6, 24px);
}
.bp__placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--mp-spacing-2, 8px);
  min-height: 280px;
  text-align: center;
  color: var(--mp-text-secondary, #3a4749);
}
.bp__placeholder-sub { font-size: var(--mp-font-sizes-sm, 14px); color: var(--mp-text-subtle, #6e7a7c); }
.bp__placeholder code { font-family: ui-monospace, monospace; background: var(--mp-background-neutral-subtle, #f8f9f9); padding: 2px 6px; border-radius: 4px; }
</style>
