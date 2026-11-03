import { reactive } from 'vue'

/**
 * Transient state carried across the multi-step auth routes (/sign-in →
 * /sign-in/password → /sign-in/otp, and /sign-in → /sign-up). Module-level
 * singleton so each step reads what the previous one set. A step reached
 * directly (deep-link) with no email guards back to /sign-in.
 */
interface AuthFlow {
  /** The email entered on /sign-in, reused by password / OTP / sign-up. */
  email: string
  /** Reset-password token (from the emailed link's ?token=). */
  resetToken: string
  /** True when /sign-up was reached because the entered email wasn't registered
   *  (vs. the "Create account" link) — drives the notice banner on that page. */
  unregistered: boolean
}

const state = reactive<AuthFlow>({ email: '', resetToken: '', unregistered: false })

export function useAuthFlow() {
  return state
}
