/**
 * Home demo scenarios — which of the three Home states to render, switched from
 * the Home FAB (HomeScenarioFab.vue). Prototype affordance only; it drives the
 * Home layout for review/demo and does NOT change the real partner status.
 *
 *   'under-validation' — registered, org is being validated → show the org card.
 *   'validated'        — org approved (the DEFAULT) → no card, straight to the
 *                        announcements.
 *   'no-org'           — no partner organization yet → a CTA button that opens the
 *                        partner-registration form.
 *
 * Module-level ref so the FAB and the Home page share one value; persisted in
 * localStorage so the chosen scenario sticks across reloads.
 */
import { ref } from 'vue'

export type HomeScenario = 'under-validation' | 'validated' | 'no-org'
export const HOME_SCENARIOS: HomeScenario[] = ['under-validation', 'validated', 'no-org']

const KEY = 'mp.home.scenario'
const scenario = ref<HomeScenario>('validated') // default: validated

let hydrated = false
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const v = localStorage.getItem(KEY)
    if (v && HOME_SCENARIOS.includes(v as HomeScenario)) scenario.value = v as HomeScenario
  } catch { /* storage unavailable */ }
}

export function useHomeScenario() {
  hydrate()
  function setScenario(s: HomeScenario): void {
    scenario.value = s
    try { localStorage.setItem(KEY, s) } catch { /* ignore */ }
  }
  return { scenario, setScenario }
}
