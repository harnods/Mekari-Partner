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

const { status, refresh } = useAuth()
const route = useRoute()
const router = useRouter()

const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']
const isAuthPath = (p: string) => AUTH_ROUTES.some((a) => p === a || p.startsWith(a + '/'))

onMounted(() => refresh())

watch(
  [status, () => route.path],
  ([s, p]) => {
    // Only bounce an anonymous session onto the auth flow. We deliberately do
    // NOT redirect an authed user away from /sign-in — the gate is off in this
    // prototype (every load resolves to authed), so bouncing would make the
    // sign-in page impossible to open directly. Leave /sign-in reachable.
    if (s === 'anonymous' && !isAuthPath(p)) router.replace('/sign-in')
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
