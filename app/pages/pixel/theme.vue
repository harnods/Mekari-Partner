<script setup lang="ts">
import DemoHeader from '~/components/patterns/DemoHeader.vue'
import DemoSection from '~/components/patterns/DemoSection.vue'
import BaseListPage from '~/components/pages/BaseListPage.vue'
useHead({ title: 'Theme — Mekari Partner · Pixel 3 Enterprise' })

// Mekari Partner palette (overrides Pixel 2.4 Enterprise — see
// app/assets/css/tokens/mekari-partner.css).
const palette = [
  { role: 'Brand / primary', hex: '#4EA67D', varName: '--mp-colors-emerald-700', fg: '#fff' },
  { role: 'Chrome / header', hex: '#0B257E', varName: '--mp-colors-emerald-1000', fg: '#fff' },
  { role: 'Secondary text / border', hex: '#6D6E6E', varName: '--mp-colors-text-secondary', fg: '#fff' },
  { role: 'Info background', hex: '#99B4DF', varName: '--mp-colors-background-information', fg: '#0b257e' },
  { role: 'Light blue (blue-50)', hex: '#E8EFFD', varName: '--mp-colors-indigo-100', fg: '#0b257e' },
  { role: 'Surface', hex: '#FAFAFA', varName: '--mp-colors-background-surface', fg: '#080d0e' },
]
</script>

<template>
  <div data-devchange="partner-theme-overview">
    <DemoHeader
      title="Theme — Mekari Partner"
      tag="Design tokens"
      lead="Base = Pixel 3 Token v2.4 Enterprise (injected by Pixel at runtime). The Mekari Partner layer sits on top and overrides a few colors: brand green, navy chrome, neutral gray, and the info/blue family. The base template below is the canonical starting point for a new list page — copy app/components/pages/BaseListPage.vue and register it in [...slug].vue."
    />

    <!-- ── Base page template — the structural shell (anatomy) ── -->
    <DemoSection
      title="Base page template (shell)"
      desc="The page anatomy: header → container → left sidebar → content (page title + stage). A self-contained scaffold at app/pages/base-page.vue — copy it, or just drop your content into the stage. In the real app this shell comes from layouts/default.vue + [...slug].vue; a page only fills the stage."
    >
      <div class="themeframe">
        <div class="themeframe__bar">
          <span class="themeframe__dots"><b /><b /><b /></span>
          <span class="themeframe__url">app/pages/base-page.vue</span>
          <a class="themeframe__open" href="/base-page" target="_blank" rel="noopener">Open shell ↗</a>
        </div>
        <div class="themeframe__plain">
          <span class="themeframe__anatomy">header · container · sidebar · content → page title + stage</span>
        </div>
      </div>
    </DemoSection>

    <!-- ── Base template — the reusable list-page starter, rendered live ── -->
    <DemoSection
      title="Base template (list page)"
      desc="The standard list-page content — summary cards, filter bar, and ErpTablePage — built from tokens + sanctioned patterns. This is BaseListPage.vue rendered inline (content only); open it inside the real app chrome (navy header + sidebar) at /base-template."
    >
      <div class="themeframe">
        <div class="themeframe__bar">
          <span class="themeframe__dots"><b /><b /><b /></span>
          <span class="themeframe__url">app/components/pages/BaseListPage.vue</span>
          <a class="themeframe__open" href="/base-template" target="_blank" rel="noopener">Open full page ↗</a>
        </div>
        <div class="themeframe__body">
          <BaseListPage />
        </div>
      </div>
    </DemoSection>

    <!-- ── Palette swatches ── -->
    <DemoSection
      title="Palette"
      desc="The few colors the Mekari Partner layer overrides on top of Pixel 2.4 Enterprise."
    >
      <div class="themeswatches">
        <div v-for="c in palette" :key="c.varName" class="themeswatch">
          <div class="themeswatch__chip" :style="{ background: c.hex, color: c.fg }">{{ c.hex }}</div>
          <div class="themeswatch__role">{{ c.role }}</div>
          <code class="themeswatch__var">{{ c.varName }}</code>
        </div>
      </div>
    </DemoSection>
  </div>
</template>

<style scoped>
/* framed showcase of the base-template content */
.themeframe {
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-md, 8px);
  overflow: hidden;
  background: var(--mp-background-stage, #fff);
}
.themeframe__bar {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-3, 12px);
  height: 38px; /* pixel-police-allow: 38px control height on the Pixel theme demo page, no token */
  padding: 0 var(--mp-spacing-3, 12px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  border-bottom: 1px solid var(--mp-border-default, #e3e7e9);
}
.themeframe__dots { display: inline-flex; gap: 6px; }
.themeframe__dots b { width: 10px; height: 10px; border-radius: 50%; background: var(--mp-border-bold, #8c9596); opacity: 0.45; }
.themeframe__url { flex: 1; font-size: var(--mp-font-sizes-xs, 12px); color: var(--mp-text-secondary); }
.themeframe__open { font-size: var(--mp-font-sizes-xs, 12px); color: var(--mp-text-link); text-decoration: none; }
/* The base template rendered inline (content only; chrome comes from the shell). */
.themeframe__body { padding: var(--mp-spacing-5, 20px); background: var(--mp-background-surface, #f8f9f9); }
.themeframe__plain { padding: var(--mp-spacing-6, 24px); background: var(--mp-background-surface, #f8f9f9); text-align: center; }
.themeframe__anatomy { font-size: var(--mp-font-sizes-sm, 14px); color: var(--mp-text-secondary); font-family: ui-monospace, monospace; }

/* swatches */
.themeswatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--mp-spacing-3, 12px); }
.themeswatch { border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-md, 8px); overflow: hidden; }
.themeswatch__chip { height: 64px; display: grid; place-items: center; font-size: 13px; font-weight: 600; font-family: ui-monospace, monospace; }
.themeswatch__role { padding: 8px 10px 2px; font-size: var(--mp-font-sizes-sm, 14px); color: var(--mp-text-default); font-weight: 600; }
.themeswatch__var { display: block; padding: 0 10px 10px; font-size: 11px; color: var(--mp-text-secondary); }
</style>
