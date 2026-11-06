/**
 * The profile captured at Complete-your-profile (sign-up). Persisted so the
 * Partner registration can auto-fill what the user already gave (phone, and a
 * starting Brand name from their company) instead of asking twice.
 *
 * localStorage, per-viewer, wrapped in try/catch. Module-level ref so sign-up
 * writes it and the registration reads the same value.
 */
import { ref, computed } from 'vue'

export interface Profile {
  fullName: string
  email: string
  company: string
  jobPosition: string
  role: string
  phone: string
  /** ISO-3166 alpha-2 of the phone country, lower-cased (e.g. "id"). */
  phoneIso2: string
}

const KEY = 'mp.profile'

function empty(): Profile {
  return { fullName: '', email: '', company: '', jobPosition: '', role: '', phone: '', phoneIso2: 'id' }
}

const profile = ref<Profile>(empty())
let hydrated = false

function hydrate(): void {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) profile.value = { ...empty(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
}

export function useProfile() {
  if (typeof window !== 'undefined') hydrate()

  function save(p: Partial<Profile>): void {
    profile.value = { ...profile.value, ...p }
    try {
      localStorage.setItem(KEY, JSON.stringify(profile.value))
    } catch {
      /* ignore */
    }
  }

  return { profile: computed(() => profile.value), save }
}
