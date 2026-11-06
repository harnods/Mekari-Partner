<template>
  <!--
    Access gate. Resolves the session once on mount, then:
      • loading / bouncing-to-sign-in → a centered spinner (no flash of the shell)
      • otherwise                     → the app (default slot = NuxtLayout/NuxtPage)
    Gating is route-based: the auth flow lives on its own URLs (/sign-in,
    /sign-up, /forgot-password, /reset-password, and /sign-in/*), rendered via the
    router on the blank layout. An anonymous session on any other path is bounced
    to /sign-in; an authed session is left where it is, so /sign-in stays
    reachable directly (handy for review/demo without signing out first).
  -->
  <div v-if="blocking" class="auth-gate__loading">
    <MpSpinner size="lg" />
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { MpSpinner } from '@mekari/pixel3'
import { isAuthPath, partnerGateTarget } from '~/data/partnerGate'
import { usePreviewMode } from '~/composables/usePreviewMode'

const { status, refresh } = useAuth()
const ps = usePartnerStatus()
const { registered: previewRegistered } = usePreviewMode()
const route = useRoute()
const router = useRouter()

onMounted(() => refresh())

watch(
  [status, ps.status, ps.homeChosen, previewRegistered, () => route.fullPath],
  ([s, partner, homeChosen, preview, _p]) => {
    // Preview bypass (?registered): don't gate — render whatever the URL points at
    // (e.g. /home?registered) as if the viewer were a submitted partner.
    if (preview) return
    const p = route.path
    // Internal portal: its own session guard (BoPage → /backoffice/login), never the partner gate.
    if (p === '/backoffice' || p.startsWith('/backoffice/')) return
    // Anonymous → onto the auth flow (but /sign-in itself stays reachable; see note).
    if (s === 'anonymous') {
      ps.clearSession()
      if (!isAuthPath(p)) router.replace('/sign-in')
      return
    }
    // Signed in: route by partner-organization status (data/partnerGate.ts) —
    // never had one → registration; org removed → the chooser on every sign-in;
    // partner → the whole app.
    if (s === 'authed') {
      const target = partnerGateTarget(partner, p, homeChosen)
      if (target) router.replace(target)
    }
  },
  { immediate: true },
)

// Spinner only during the initial session resolve. We deliberately DON'T gate on
// the anonymous-redirect: toggling the whole slot (NuxtLayout/NuxtPage) off mid
// sign-out unmounts the router and the next page never mounts (blank screen). The
// redirect below moves an anonymous session to /sign-in on the same tick instead.
const blocking = computed(() => status.value === 'loading')
</script>

<style scoped>
.auth-gate__loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mp-background-neutral-subtle, #f8f9f9);
}
</style>
