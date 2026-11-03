<template>
  <AuthShell>
    <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />

    <template v-if="!sent">
      <div class="auth-head">
        <h1 class="auth-title">{{ t('Reset your password') }}</h1>
        <p class="auth-sub">{{ t('Enter your registered email and we will send a reset link.') }}</p>
      </div>
      <div class="auth-form">
        <MpFormControl id="fp-email" :is-invalid="emailInvalid">
          <MpFormLabel>{{ t('Email') }}</MpFormLabel>
          <MpInput v-model="email" type="email" @input="emailInvalid = false" @keydown.enter="onSend" />
          <MpFormErrorMessage>{{ t('You must fill in email') }}</MpFormErrorMessage>
        </MpFormControl>
      </div>
      <div class="auth-actions">
        <MpButton variant="primary" is-rounded is-full-width @click="onSend">{{ t('Continue') }}</MpButton>
        <MpButton variant="ghost" is-rounded @click="router.push('/sign-in')">{{ t('Back to sign in') }}</MpButton>
      </div>
    </template>

    <template v-else>
      <div class="auth-sent">
        <img src="/reset-password-sent.png" alt="" class="auth-sent__art" />
        <h1 class="auth-title auth-sent__title">{{ t('Check your email to reset password') }}</h1>
        <p class="auth-sub auth-sent__text">{{ t('We have sent password reset instructions to') }} {{ maskedEmail }}.</p>
      </div>
      <!-- Prototype affordance: no real email is sent, so this stands in for
           clicking the reset link in the email. -->
      <div class="auth-actions">
        <MpButton variant="primary" is-rounded is-full-width @click="router.push('/reset-password?token=demo')">
          {{ t('Open reset link') }}
        </MpButton>
        <MpButton variant="ghost" is-rounded @click="router.push('/sign-in')">{{ t('Back to sign in') }}</MpButton>
      </div>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MpButton, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput } from '@mekari/pixel3'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const flow = useAuthFlow()

const email = ref(flow.email)
const emailInvalid = ref(false)
const sent = ref(false)

const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim())
const maskedEmail = computed(() => {
  const [local, domain] = email.value.split('@')
  if (!domain) return email.value
  return `${local.slice(0, 2)}********@${domain}`
})

function onSend() {
  if (!isValidEmail(email.value)) { emailInvalid.value = true; return }
  emailInvalid.value = false
  flow.email = email.value.trim()
  sent.value = true
}

useHead({ title: () => `Mekari Partner | ${t('Reset your password')}` })
</script>

<style scoped>
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: 600; letter-spacing: -0.48px; color: var(--mp-text-default, #080d0e); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-form { display: flex; flex-direction: column; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-sent { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-4, 16px); width: 100%; text-align: center; }
.auth-sent__art { width: 120px; height: auto; display: block; }
.auth-sent__title { text-align: center; }
.auth-sent__text { text-align: center; }
.auth-actions { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; }
</style>
