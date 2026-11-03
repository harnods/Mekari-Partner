<template>
  <AuthShell>
    <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />
    <div class="auth-head">
      <h1 class="auth-title">{{ t('Enter OTP for verification') }}</h1>
      <p class="auth-sub">{{ t('OTP has been sent via email to') }} {{ maskedEmail }}.</p>
    </div>

    <div class="auth-form">
      <div class="auth-otp" data-devchange="otp-auto-verify">
        <input
          v-for="(d, i) in digits"
          :key="i"
          :ref="(el) => setRef(el, i)"
          class="auth-otp__box"
          inputmode="numeric"
          maxlength="1"
          :value="d"
          :disabled="verifying"
          @input="onInput(i, $event)"
          @keydown="onKeydown(i, $event)"
        />
      </div>
      <!-- No Verify button: the 6th digit auto-submits. -->
      <div v-if="verifying" class="auth-verifying"><MpSpinner size="sm" /><span>{{ t('Verifying') }}</span></div>
    </div>

    <div class="auth-resend">
      <span>{{ t("Didn't receive the code?") }}</span>
      <span v-if="seconds > 0" class="auth-resend__wait">{{ t('Resend in') }} {{ label }}</span>
      <span v-else class="auth-link" role="button" @click="startResend">{{ t('Resend') }}</span>
    </div>

    <div class="auth-foot">
      <MpButton variant="ghost" is-rounded @click="router.push('/sign-in')">{{ t('Back to sign in') }}</MpButton>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { MpSpinner } from '@mekari/pixel3'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const { signInMock } = useAuth()
const flow = useAuthFlow()

onMounted(() => { if (!flow.email) router.replace('/sign-in'); else startResend() })

const digits = ref<string[]>(['', '', '', '', '', ''])
const verifying = ref(false)
const refs: HTMLInputElement[] = []
const setRef = (el: unknown, i: number) => { if (el) refs[i] = el as HTMLInputElement }
function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const d = el.value.replace(/\D/g, '').slice(-1)
  digits.value[i] = d
  el.value = d
  if (d && i < 5) refs[i + 1]?.focus()
  // All six filled → verify automatically, no button.
  if (digits.value.every((v) => v !== '')) autoVerify()
}
function onKeydown(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) refs[i - 1]?.focus()
}

const maskedEmail = computed(() => {
  const [local, domain] = flow.email.split('@')
  if (!domain) return flow.email
  return `${local.slice(0, 2)}********@${domain}`
})

const seconds = ref(60)
let timer: ReturnType<typeof setInterval> | null = null
function startResend() {
  seconds.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => { if (seconds.value > 0) seconds.value--; else if (timer) clearInterval(timer) }, 1000)
}
const label = computed(() => {
  const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const s = String(seconds.value % 60).padStart(2, '0')
  return `${m}:${s}`
})
onBeforeUnmount(() => timer && clearInterval(timer))

function autoVerify() {
  if (verifying.value) return
  verifying.value = true
  refs[5]?.blur()
  // Short beat so the last digit is visible before leaving the page.
  setTimeout(() => {
    signInMock(flow.email)
    router.push('/')
  }, 600)
}

useHead({ title: () => `Mekari Partner | ${t('Enter OTP for verification')}` })
</script>

<style scoped>
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: 600; letter-spacing: -0.48px; color: var(--mp-text-default, #080d0e); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-form { display: flex; flex-direction: column; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-verifying { display: flex; align-items: center; justify-content: center; gap: var(--mp-spacing-2, 8px); width: 100%; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-otp { display: flex; gap: var(--mp-spacing-2, 8px); width: 100%; }
.auth-otp__box {
  flex: 1; min-width: 0; height: 48px; text-align: center;
  font-family: var(--mp-fonts-body); font-size: 20px; font-weight: 600;
  color: var(--mp-text-default, #080d0e); background: #fff;
  border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-md, 6px); outline: none;
}
.auth-otp__box:focus { border-color: var(--mp-border-bold, #8c9596); box-shadow: 0 0 0 3px rgba(140, 149, 150, 0.2); }
.auth-resend { display: flex; align-items: center; gap: var(--mp-spacing-1, 4px); width: 100%; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-resend__wait { color: var(--mp-text-subtle, #6e7a7c); }
.auth-link { color: var(--mp-colors-emerald-800, #186f4a); font-weight: 600; cursor: pointer; }
.auth-link:hover { text-decoration: underline; }
.auth-foot { display: flex; justify-content: center; width: 100%; }
</style>
