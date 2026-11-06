/**
 * Partner membership state for the mock Partner-registration flow.
 *
 * A signed-in user cannot reach the ERP until they have SUBMITTED a partner
 * registration. Until then the AuthGate bounces them to /partner-registration,
 * where their in-progress entries are kept as a draft (so the next sign-in
 * resumes exactly where they left off).
 *
 * Status:
 *   'none'       — signed in, nothing started yet
 *   'draft'      — a registration is in progress (data holds the draft)
 *   'submitted'  — registration sent → the user is a partner → ERP unlocked
 *   'removed'    — the partner organization was deleted (from the Mekari
 *                  backoffice) but the Mekari account still exists → every
 *                  sign-in shows the /partner-organization chooser (register a
 *                  new org, or go to Home). Routing rules: data/partnerGate.ts.
 *
 * Persisted to localStorage (per-viewer) and wrapped in try/catch so a private
 * window or blocked storage never breaks the flow. Module-level refs so the
 * gate, the wizard and the user menu all see the same status.
 */
import { ref, computed } from 'vue'
import { emptyPartnerRegData, normalizePartnerRegData, type PartnerRegData } from '~/data/partnerReg'
import type { PartnerStatus } from '~/data/partnerGate'
import { isDeletedOrgEmail } from '~/data/authMock'

const STATUSES: PartnerStatus[] = ['none', 'draft', 'submitted', 'approved', 'removed']

const KEY = 'mp.partner'

interface Persisted {
  status: PartnerStatus
  data: PartnerRegData
  submittedAt?: string
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p === 'object' && STATUSES.includes(p.status)) {
        return { status: p.status, data: normalizePartnerRegData(p.data || {}), submittedAt: p.submittedAt }
      }
    }
  } catch {
    /* ignore — storage unavailable or corrupt */
  }
  return { status: 'none', data: emptyPartnerRegData() }
}

const status = ref<PartnerStatus>('none')
const draft = ref<PartnerRegData>(emptyPartnerRegData())
/** ISO timestamp of when the registration was submitted (the partner's sign-up /
 *  registration date), surfaced on the Home "under validation" card. */
const submittedAt = ref<string>('')
/** A 'removed' user picked "Go to Home" — kept for this browser session
 *  (sessionStorage, survives a reload) and cleared on sign-out, so the next
 *  sign-in shows the chooser again. */
const HOME_KEY = 'mp.partner.homeChosen'
const homeChosen = ref(false)
function setHomeChosen(v: boolean): void {
  homeChosen.value = v
  try {
    if (v) sessionStorage.setItem(HOME_KEY, '1')
    else sessionStorage.removeItem(HOME_KEY)
  } catch {
    /* ignore */
  }
}
let hydrated = false

function hydrate(): void {
  if (hydrated) return
  hydrated = true
  const p = load()
  status.value = p.status
  draft.value = p.data
  submittedAt.value = p.submittedAt ?? ''
  try {
    homeChosen.value = sessionStorage.getItem(HOME_KEY) === '1'
  } catch {
    /* ignore */
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ status: status.value, data: draft.value }))
  } catch {
    /* ignore */
  }
}

export function usePartnerStatus() {
  // Resolve from storage on first use (client only).
  if (typeof window !== 'undefined') hydrate()

  /** Save the current entries as a draft (keeps the user mid-registration). */
  function saveDraft(data: PartnerRegData): void {
    draft.value = { ...data }
    // A submitted or removed status only changes through submit / startNew.
    if (status.value === 'none') status.value = 'draft'
    persist()
  }

  /** Mark the registration as submitted → the user becomes a partner. */
  function submit(data: PartnerRegData): void {
    draft.value = { ...data }
    status.value = 'submitted'
    submittedAt.value = new Date().toISOString()
    try {
      localStorage.setItem(KEY, JSON.stringify({ status: 'submitted', data: draft.value, submittedAt: submittedAt.value }))
    } catch {
      /* ignore */
    }
  }

  /** The Mekari team approved the partner org → it leaves "under validation"
   *  (the Home validation card disappears). Keeps the submitted data + date. */
  function markApproved(): void {
    status.value = 'approved'
    try {
      localStorage.setItem(KEY, JSON.stringify({ status: 'approved', data: draft.value, submittedAt: submittedAt.value }))
    } catch {
      /* ignore */
    }
  }

  /** Clear everything (e.g. after a full sign-out reset — not used by default). */
  function reset(): void {
    status.value = 'none'
    draft.value = emptyPartnerRegData()
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }

  /** "Register a new partner organization" — start the registration over. */
  function startNew(): void {
    status.value = 'none'
    draft.value = emptyPartnerRegData()
    setHomeChosen(false)
    persist()
  }

  /** "Go to Home" for a user whose org was removed — opens the app this session. */
  function chooseHome(): void {
    setHomeChosen(true)
  }

  /**
   * Mock sign-in hook: a "+deleted" demo address means the partner org was
   * deleted (backoffice) → status 'removed'. Signing in with any other address
   * clears a leftover 'removed' state from an earlier "+deleted" demo in this
   * browser (partner state is per-browser in the prototype), so normal accounts
   * keep their usual flow.
   */
  function applyMockAccount(email: string): void {
    if (isDeletedOrgEmail(email)) {
      status.value = 'removed'
      draft.value = emptyPartnerRegData()
      setHomeChosen(false)
      persist()
    } else if (status.value === 'removed') {
      status.value = 'none'
      draft.value = emptyPartnerRegData()
      persist()
    }
  }

  /** Sign-out ends the session choice. */
  function clearSession(): void {
    if (homeChosen.value) setHomeChosen(false)
  }

  return {
    status: computed(() => status.value),
    isRemoved: computed(() => status.value === 'removed'),
    homeChosen: computed(() => homeChosen.value),
    startNew,
    chooseHome,
    applyMockAccount,
    clearSession,
    draft: computed(() => draft.value),
    submittedAt: computed(() => submittedAt.value),
    isPartner: computed(() => status.value === 'submitted' || status.value === 'approved'),
    /** Org submitted but not yet approved → show the Home validation card. */
    isUnderValidation: computed(() => status.value === 'submitted'),
    isApproved: computed(() => status.value === 'approved'),
    hasDraft: computed(() => status.value === 'draft'),
    saveDraft,
    submit,
    markApproved,
    reset,
  }
}
