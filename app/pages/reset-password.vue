<template>
  <AuthShell>
    <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />
    <div class="auth-head">
      <h1 class="auth-title">{{ t('Set a new password') }}</h1>
      <p class="auth-sub">{{ t('Choose a new password for your account.') }}</p>
    </div>

    <div class="auth-form">
      <MpFormControl id="rp-pass" :is-invalid="err.pass">
        <MpFormLabel>{{ t('New password') }}</MpFormLabel>
        <MpInputGroup id="rp-pass-group">
          <MpInput v-model="password" :type="show ? 'text' : 'password'" @input="err.pass = false" />
          <MpInputRightAddon id="rp-pass-toggle">
            <span class="auth-eye" role="button" @click="show = !show"><MpIcon :name="show ? 'hide' : 'show'" size="sm" /></span>
          </MpInputRightAddon>
        </MpInputGroup>
        <MpFormErrorMessage>{{ t('Password must be at least 8 characters') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="rp-confirm" :is-invalid="err.confirm">
        <MpFormLabel>{{ t('Confirm new password') }}</MpFormLabel>
        <MpInput v-model="confirm" :type="show ? 'text' : 'password'" @input="err.confirm = false" @keydown.enter="onSave" />
        <MpFormErrorMessage>{{ t('Passwords do not match') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpButton variant="primary" is-rounded is-full-width @click="onSave">{{ t('Save new password') }}</MpButton>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { MpButton, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon, MpIcon } from '@mekari/pixel3'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const { signInMock } = useAuth()
const flow = useAuthFlow()

const password = ref('')
const confirm = ref('')
const show = ref(false)
const err = reactive({ pass: false, confirm: false })

// Reset completes straight into the app (Home) — never back to sign-in (spec).
function onSave() {
  err.pass = password.value.length < 8
  err.confirm = confirm.value !== password.value || !confirm.value
  if (err.pass || err.confirm) return
  signInMock(flow.email || 'demo@mekari.com')
  router.push('/')
}

useHead({ title: () => `Mekari Partner | ${t('Set a new password')}` })
</script>

<style scoped>
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: 600; letter-spacing: -0.48px; color: var(--mp-text-default, #080d0e); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-form { display: flex; flex-direction: column; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-eye { display: inline-flex; cursor: pointer; color: var(--mp-text-secondary, #3a4749); }
</style>
