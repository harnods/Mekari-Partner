<template>
  <!--
    Home scenario switcher — a demo FAB (bottom-right, round, black) with a
    settings icon. Opens a menu to flip the Home page between its three states
    (see useHomeScenario). Prototype affordance only; it does not change the real
    partner status.
  -->
  <div class="scenario-fab" data-devchange="home-scenario-fab">
    <MpPopover id="home-scenario-fab-menu" placement="top-end" trigger="click" use-portal v-slot="{ onClosePopover }">
      <MpPopoverTrigger>
        <button type="button" class="scenario-fab__btn" :aria-label="t('Switch Home scenario')"><!-- pixel-police-allow: bespoke demo FAB, no Pixel FAB component -->
          <MpIcon name="settings" size="md" color="icon.inverse" />
        </button>
      </MpPopoverTrigger>
      <MpPopoverContent class="scenario-menu" is-unstyled>
        <div class="scenario-menu__head">{{ t('Home scenario') }}</div>
        <nav class="scenario-menu__group">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            class="scenario-menu__row"
            :class="{ 'is-active': scenario === opt.value }"
            @click="pick(opt.value, onClosePopover)"
          >
            <span class="scenario-menu__label">
              {{ opt.label }}
              <span v-if="opt.value === 'validated'" class="scenario-menu__hint">{{ t('Default') }}</span>
            </span>
            <MpIcon v-if="scenario === opt.value" name="check" size="md" color="icon.brand" />
          </button>
        </nav>
      </MpPopoverContent>
    </MpPopover>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MpPopover, MpPopoverTrigger, MpPopoverContent, MpIcon } from '@mekari/pixel3'
import { useHomeScenario, type HomeScenario } from '~/composables/useHomeScenario'

const { t } = useLocale()
const { scenario, setScenario } = useHomeScenario()

const options = computed<{ value: HomeScenario; label: string }[]>(() => [
  { value: 'under-validation', label: t('Org under validation') },
  { value: 'validated', label: t('Org validated') },
  { value: 'no-org', label: t('No partner organization') },
])

function pick(s: HomeScenario, close: () => void): void {
  setScenario(s)
  close()
}
</script>

<style scoped>
.scenario-fab {
  position: fixed;
  right: var(--mp-spacing-6, 24px);
  bottom: var(--mp-spacing-6, 24px);
  z-index: 1500;
}

/* Round, black icon button. */
.scenario-fab__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mp-sizes-12, 48px);
  height: var(--mp-sizes-12, 48px);
  border-radius: var(--mp-radii-full, 999px);
  border: none;
  background: var(--mp-text-default, #080d0e);
  color: var(--mp-text-on-color, #fff);
  cursor: pointer;
  transition: filter 120ms ease, transform 120ms ease;
}
.scenario-fab__btn:hover { filter: brightness(1.12); }
.scenario-fab__btn:active { transform: scale(0.96); }
.scenario-fab__btn:focus-visible { outline: 2px solid var(--mp-border-bold, #8c9596); outline-offset: 2px; }

/* Menu (reuses the ERP popover-menu look). */
.scenario-menu {
  min-width: 248px;
  padding: var(--mp-spacing-2, 8px);
  background: var(--mp-background-neutral, #fff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
}
.scenario-menu__head {
  padding: var(--mp-spacing-2, 8px) var(--mp-spacing-3, 12px);
  font-size: var(--mp-font-sizes-sm, 12px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  color: var(--mp-text-secondary, #3a4749);
}
.scenario-menu__group { display: flex; flex-direction: column; }
.scenario-menu__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-spacing-3, 12px);
  width: 100%;
  padding: var(--mp-spacing-3, 12px);
  border: none;
  background: none;
  border-radius: var(--mp-radii-md, 8px);
  cursor: pointer;
  text-align: left;
  font-size: var(--mp-font-sizes-md, 14px);
  color: var(--mp-text-default, #080d0e);
}
.scenario-menu__row:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }
.scenario-menu__row.is-active { font-weight: var(--mp-font-weights-semi-bold, 600); }
.scenario-menu__label { display: inline-flex; align-items: center; gap: var(--mp-spacing-2, 8px); }
.scenario-menu__hint {
  padding: 0 var(--mp-spacing-2, 8px);
  border-radius: var(--mp-radii-full, 999px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  font-size: var(--mp-font-sizes-sm, 12px);
  font-weight: var(--mp-font-weights-regular, 400);
  color: var(--mp-text-secondary, #3a4749);
}
</style>
