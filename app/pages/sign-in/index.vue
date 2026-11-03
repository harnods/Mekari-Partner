<template>
  <AuthShell>
    <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />

    <div class="auth-head">
      <h1 class="auth-title">{{ t('Sign in') }}</h1>
      <p class="auth-sub">
        {{ t("Don't have a Mekari Partner account? ") }}<NuxtLink class="auth-link" to="/sign-up" @click="flow.unregistered = false">{{ t('Create account') }}</NuxtLink>
      </p>
    </div>

    <!-- Google + divider stay visible the whole time — revealing the password
         below the email never changes the rest of the form. -->
    <MpButton variant="secondary" is-rounded is-full-width @click="onGoogle">
      <span class="auth-gbtn">
        <img src="/google-logo.svg" alt="" class="auth-gicon" />
        {{ t('Sign in with Google') }}
      </span>
    </MpButton>

    <div class="auth-divider"><span></span><span class="auth-or">{{ t('or') }}</span><span></span></div>

    <div class="auth-form">
      <MpFormControl id="si-email" :is-invalid="emailInvalid">
        <MpFormLabel>{{ t('Email') }}</MpFormLabel>
        <MpInput v-model="email" type="email" data-devchange="signin-inline-password" @input="onEmailInput" @keydown.enter="onContinue" />
        <MpFormErrorMessage>{{ t('You must fill in email') }}</MpFormErrorMessage>
      </MpFormControl>

      <!-- Registered email → password appears right here, no page change. -->
      <MpFormControl v-if="stage === 'password'" id="si-password" :is-invalid="passwordInvalid">
        <MpFormLabel>{{ t('Password') }}</MpFormLabel>
        <MpInputGroup id="si-password-group">
          <MpInput ref="passwordField" v-model="password" :type="show ? 'text' : 'password'" @input="passwordInvalid = false" @keydown.enter="onSignIn" />
          <MpInputRightAddon id="si-password-toggle">
            <span class="auth-eye" role="button" @click="show = !show"><MpIcon :name="show ? 'hide' : 'show'" size="sm" /></span>
          </MpInputRightAddon>
        </MpInputGroup>
        <MpFormErrorMessage>{{ t('You must fill in your password') }}</MpFormErrorMessage>
      </MpFormControl>
    </div>

    <div class="auth-actions">
      <MpButton v-if="stage === 'email'" variant="primary" is-rounded is-full-width :is-loading="loading" @click="onContinue">
        {{ t('Continue') }}
      </MpButton>
      <MpButton v-else variant="primary" is-rounded is-full-width @click="onSignIn">
        {{ t('Sign in') }}
      </MpButton>
      <MpButton v-if="stage === 'password'" variant="ghost" is-rounded @click="onChangeEmail">{{ t('Use a different email') }}</MpButton>
      <MpButton variant="ghost" is-rounded data-devchange="forgot-prefill-email" @click="onForgot">{{ t('Forgot password') }}</MpButton>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { MpButton, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputGroup, MpInputRightAddon, MpIcon } from '@mekari/pixel3'
import { isRegisteredEmail, GOOGLE_DEMO_EMAIL } from '~/data/authMock'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const { signInMock } = useAuth()
const flow = useAuthFlow()

const email = ref(flow.email)
const emailInvalid = ref(false)
const loading = ref(false)

// Two-stage inline form: 'email' asks for the address; a registered address
// flips to 'password' in place (no route change) so the password shows right
// under the email. An unregistered address still routes to /sign-up.
const stage = ref<'email' | 'password'>('email')
const password = ref('')
const show = ref(false)
const passwordInvalid = ref(false)
const passwordField = ref<any>(null)

const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim())

// Google: the demo account is registered → straight Home (an unregistered Google
// account would route to /sign-up — see isRegisteredEmail).
function onGoogle() {
  if (isRegisteredEmail(GOOGLE_DEMO_EMAIL)) {
    signInMock(GOOGLE_DEMO_EMAIL)
    router.push('/')
  } else {
    flow.email = GOOGLE_DEMO_EMAIL
    flow.unregistered = true
    router.push('/sign-up')
  }
}

// Email: registered → reveal the password field inline; unregistered → complete profile.
function onContinue() {
  if (!isValidEmail(email.value)) { emailInvalid.value = true; return }
  emailInvalid.value = false
  flow.email = email.value.trim()
  loading.value = true
  setTimeout(() => {
    loading.value = false
    if (isRegisteredEmail(flow.email)) {
      flow.unregistered = false
      stage.value = 'password'
      nextTick(() => passwordField.value?.$el?.querySelector('input')?.focus())
    } else {
      flow.unregistered = true
      router.push('/sign-up')
    }
  }, 500)
}

function onSignIn() {
  if (!password.value) { passwordInvalid.value = true; return }
  passwordInvalid.value = false
  router.push('/sign-in/otp')
}

// Carry whatever email is already typed into the reset flow so the user doesn't
// retype it on the forgot-password page.
function onForgot() {
  const addr = email.value.trim()
  if (addr) flow.email = addr
  router.push('/forgot-password')
}

// Email stays editable in the password stage, and editing it does NOT collapse
// the form back to the email/Google step — the password field stays put. Only
// the explicit "Use a different email" returns to the email step.
function onEmailInput() {
  emailInvalid.value = false
}

// Back to the email step to sign in as someone else.
function onChangeEmail() {
  stage.value = 'email'
  password.value = ''
  passwordInvalid.value = false
  show.value = false
}

useHead({ title: () => `Mekari Partner | ${t('Sign in')}` })
</script>

<style scoped>
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: 600; letter-spacing: -0.48px; color: var(--mp-text-default, #080d0e); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-link { color: var(--mp-colors-emerald-800, #186f4a); font-weight: 600; text-decoration: none; }
.auth-link:hover { text-decoration: underline; }
.auth-gbtn { display: inline-flex; align-items: center; justify-content: center; gap: var(--mp-spacing-2, 8px); }
.auth-gicon { height: var(--mp-spacing-5, 20px); width: auto; display: block; }
.auth-divider { display: flex; align-items: center; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-divider span:first-child, .auth-divider span:last-child { flex: 1; height: 1px; background: var(--mp-border-default, #e3e7e9); }
.auth-or { font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-form { display: flex; flex-direction: column; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-actions { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; }
.auth-eye { display: inline-flex; cursor: pointer; color: var(--mp-text-secondary, #3a4749); }
</style>
