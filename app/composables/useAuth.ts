/**
 * Access-gate auth state (Google @mekari.com login). App-level protection: the
 * app shell renders only once `me()` confirms a valid session cookie. The cookie
 * itself is HttpOnly + signed server-side, so this composable never handles the
 * token — it only drives the login/loading/authed UI.
 *
 * Shared singleton state (module-level refs) so the gate and the user menu see
 * the same session.
 */
import { ref, computed } from 'vue'
import { mockAccountProfile } from '~/data/authMock'

export interface AuthUser {
  email: string
  name: string
  picture: string
}

type Status = 'loading' | 'anonymous' | 'authed'

const status = ref<Status>('loading')
const user = ref<AuthUser | null>(null)

export function useAuth() {
  /** Resolve the current session from the server. Called once by the gate on load.
   *  If the gate isn't configured on this deployment, the app is open (authed). */
  async function refresh(): Promise<void> {
    try {
      const res = await $fetch<{ gateEnabled: boolean; user: AuthUser | null }>('/api/auth/me')
      user.value = res.user
      status.value = 'authed' // gate off → open; gate on + valid session → authed
    } catch {
      user.value = null
      status.value = 'anonymous'
    }
  }

  /** Exchange a Google credential (id_token) for a session. Throws on rejection
   *  with a human message (e.g. wrong domain) for the login screen to display. */
  async function signInWithGoogle(credential: string): Promise<void> {
    try {
      user.value = await $fetch<AuthUser>('/api/auth/google', {
        method: 'POST',
        body: { credential },
      })
      status.value = 'authed'
    } catch (e: any) {
      const msg = e?.data?.statusMessage || e?.statusMessage || 'Login gagal. Coba lagi.'
      throw new Error(msg)
    }
  }

  async function signOut(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    status.value = 'anonymous'
  }

  /** Prototype sign-in (no backend). Used by the mock login screen for both the
   *  Google button and email/password — completes straight into the app. Derives
   *  a display name from the email so the header shows who's "signed in". */
  function signInMock(email?: string, name?: string): void {
    const addr = (email || '').trim()
    // Drop a "+tag" (dirman+deleted@… → "Dirman") before deriving a name.
    const local = (addr.split('@')[0] || '').split('+')[0] || ''
    const derived = local
      ? local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Pengguna Mekari'
    user.value = { email: addr || 'demo@mekari.com', name: name?.trim() || derived, picture: '' }
    // The stored sign-up profile belongs to ONE account per browser. If a
    // different account signs in, load that account's record instead (a Mekari
    // account always has every sign-up field — never blanks), so the header /
    // account card never show someone else's data.
    const prof = useProfile()
    const record = mockAccountProfile(user.value.email, user.value.name)
    const cur = prof.profile.value
    if (cur.email.toLowerCase() !== user.value.email.toLowerCase()) {
      prof.save(record)
    } else {
      // Same account but an incomplete stored record (e.g. saved by an older
      // build) — fill only the blanks; never overwrite what the user gave.
      const blanks = Object.fromEntries(
        (Object.keys(record) as (keyof typeof record)[]).filter((k) => !cur[k]).map((k) => [k, record[k]]),
      )
      if (Object.keys(blanks).length) prof.save(blanks)
    }
    // Mock account directory decides the partner-org state for this account
    // ("+deleted" → org removed). One place, so every sign-in path applies it.
    usePartnerStatus().applyMockAccount(user.value.email)
    status.value = 'authed'
  }

  return {
    status: computed(() => status.value),
    user: computed(() => user.value),
    isAuthed: computed(() => status.value === 'authed'),
    refresh,
    signInWithGoogle,
    signInMock,
    signOut,
  }
}
