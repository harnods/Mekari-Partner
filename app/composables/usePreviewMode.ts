/**
 * Preview bypass for demos / design review.
 *
 * Visiting any page with `?registered` in the URL (e.g. `/home?registered`) opens
 * the app as if the viewer were a SUBMITTED partner — signed in or not:
 *   • AuthGate skips the anonymous → /sign-in redirect AND the partner →
 *     /partner-registration gate, so Home renders directly.
 *   • Home shows its "under validation" card (with placeholder data when there's
 *     no real registration), so the full page can be previewed.
 *
 * The flag is latched in sessionStorage the instant the composable first runs,
 * read straight from `window.location.search` (NOT the Vue router) so it beats the
 * router's own route-resolution timing — otherwise the gate can redirect on the
 * first tick before `route.query` is populated. Latching also keeps preview on
 * across client-side navigation within the tab; closing the tab clears it. This is
 * a prototype affordance only — it never mutates the real partner status.
 */
import { computed } from 'vue'

const KEY = 'mp.preview.registered'

function latchFromUrl(): void {
  if (typeof window === 'undefined') return
  try {
    if (new URLSearchParams(window.location.search).has('registered')) {
      sessionStorage.setItem(KEY, '1')
    }
  } catch { /* storage / URL unavailable */ }
}

export function usePreviewMode() {
  const route = useRoute()
  // Set the latch synchronously, before any gate watcher runs.
  latchFromUrl()

  const registered = computed(() => {
    if (typeof window !== 'undefined') {
      try { if (sessionStorage.getItem(KEY) === '1') return true } catch { /* ignore */ }
    }
    // Also honour a live ?registered on the current route (client-side nav).
    return 'registered' in route.query
  })

  return { registered }
}
