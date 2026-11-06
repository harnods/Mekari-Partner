<template>
  <!--
    Grid overlay (rule/grid-12-col) — mirrors the app grid exactly:
      • 12 FLUID columns (equal fractions, responsive width); 12px gutter.
      • The whole 12-grid caps at 1440px total width.
      • The column COUNT steps 12 → 10 → 8 → 6 → 4 as the viewport narrows
        (breakpoints 1200 / 992 / 768 / 576).
      • Two layouts — press L to toggle: centered (like Home) vs left-aligned.
      • Fills the stage content box: full width with the stage's 24px side padding.
    Non-interactive guide (pointer-events: none). Toggle visibility with Shift+G.
  -->
  <div class="grid-overlay" aria-hidden="true">
    <div class="grid-overlay__container">
      <div
        class="grid-overlay__track"
        :class="`grid-overlay__track--${layout}`"
        :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }"
      >
        <span v-for="n in cols" :key="n" class="grid-overlay__col" />
      </div>
    </div>
    <span class="grid-overlay__badge">{{ cols }} cols · max 1440 · 12px gutter · {{ layout }} (L) · Shift+G</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Live viewport width → column count, matching the content grid's breakpoints.
const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
function onResize() { width.value = window.innerWidth }

// L toggles the two layouts (centered ↔ left) so both can be eyeballed.
const layout = ref<'center' | 'left'>('center')
function onKey(e: KeyboardEvent) {
  if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const t = e.target as HTMLElement | null
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
    layout.value = layout.value === 'center' ? 'left' : 'center'
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
})

const cols = computed(() => {
  const w = width.value
  if (w >= 1200) return 12
  if (w >= 992) return 10
  if (w >= 768) return 8
  if (w >= 576) return 6
  return 4
})
</script>

<style scoped>
.grid-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

/* Fills the stage content box: full width, 24px side padding (matches .stage). */
.grid-overlay__container {
  width: 100%;
  height: 100%;
  padding-left: var(--mp-spacing-6, 24px);
  padding-right: var(--mp-spacing-6, 24px);
}

/* 12 fluid columns, 12px gutter, capped at 1440 total (grid-template set inline). */
.grid-overlay__track {
  display: grid;
  gap: var(--mp-spacing-3, 12px);
  height: 100%;
  width: 100%;
  max-width: 1440px;
}
.grid-overlay__track--center { margin-left: auto; margin-right: auto; }
.grid-overlay__track--left { margin-left: 0; margin-right: auto; }

.grid-overlay__col {
  background: rgba(255, 45, 110, 0.08); /* pixel-police-allow: dev-only grid debug overlay, magenta is intentional */
  border-left: 1px solid rgba(255, 45, 110, 0.22);
  border-right: 1px solid rgba(255, 45, 110, 0.22);
}

.grid-overlay__badge {
  position: absolute;
  top: 6px;
  right: 8px;
  padding: 2px 8px; /* pixel-police-allow: dev-only grid debug badge */
  border-radius: var(--mp-radii-full, 999px);
  background: rgba(255, 45, 110, 0.9); /* pixel-police-allow: dev-only grid debug overlay */
  color: #fff; /* pixel-police-allow: dev-only grid debug overlay */
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.02em;
}
</style>
