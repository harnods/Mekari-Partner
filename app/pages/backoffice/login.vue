<template>
  <!-- H-01 Internal portal login — Google SSO restricted to @mekari.com accounts.
       Mirrors the partner auth pages (AuthShell, blank layout). -->
  <AuthShell>
    <div class="bo-login-brand" data-devchange="bo-login">
      <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />
      <MpBadge for="additionalInformation" type="information">{{ t('Internal portal') }}</MpBadge>
    </div>

    <div class="auth-head">
      <h1 class="auth-title">{{ t('Log in to the internal portal') }}</h1>
      <p class="auth-sub">{{ t('For Mekari employees. Use your @mekari.com Google account.') }}</p>
    </div>

    <!-- Wrong-domain account → inline error (rule/form-errors-inline, never a toast) -->
    <div v-if="loginErr" id="bo-login-error" class="bo-login-error" role="alert">
      <MpIcon name="warning-triangle" size="md" variant="fill" color="icon.danger" />
      <div class="bo-login-error__text">
        <span class="bo-login-error__title">{{ t("This account can't access the internal portal") }}</span>
        <span>{{ loginErr }}</span>
      </div>
    </div>

    <div class="auth-actions">
      <MpButton variant="secondary" is-rounded is-full-width @click="onLogin">
        <span class="auth-gbtn">
          <img src="/google-logo.svg" alt="" class="auth-gicon" />
          {{ t('Login with Mekari') }}
        </span>
      </MpButton>
      <p class="bo-login-caption">{{ t('Signs in with Google. Only @mekari.com accounts are accepted.') }}</p>
    </div>
  </AuthShell>

  <!-- Prototype: which Google account the SSO returns (the design's internalAccount prop). -->
  <ScenarioFab v-model="account" :heading="t('Google account')" :scenarios="scenarios" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MpButton, MpBadge, MpIcon } from '@mekari/pixel3'
import ScenarioFab from '~/components/patterns/ScenarioFab.vue'
import { bo, boLogin, BO_ME, BO_ME_EMAIL } from '~/data/backoffice'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()

const OTHER_EMAIL = 'alexandria.putri@gmail.com'
const account = ref<'internal' | 'other'>('internal')
const scenarios = computed(() => [
  { label: `${BO_ME_EMAIL} (@mekari.com)`, value: 'internal' },
  { label: `${OTHER_EMAIL} (${t('Other domain')})`, value: 'other' },
])
const loginErr = ref('')

function onLogin() {
  const res = account.value === 'internal' ? boLogin(BO_ME_EMAIL, BO_ME) : boLogin(OTHER_EMAIL, 'Alexandria Putri')
  if (!res.ok) { loginErr.value = res.msg; return }
  loginErr.value = ''
  router.push('/backoffice/home')
}

// Already signed in → straight to the dashboard.
onMounted(() => { if (bo.session) router.replace('/backoffice/home') })

useHead({ title: () => `Mekari Partner | ${t('Internal portal')}` })
</script>

<style scoped>
.bo-login-brand { display: flex; align-items: center; gap: var(--mp-spacing-3, 12px); }
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: var(--mp-font-weights-semi-bold, 600); letter-spacing: -0.48px; color: var(--mp-text-default); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary); }
.bo-login-error {
  display: flex; align-items: flex-start; gap: var(--mp-spacing-2, 8px); width: 100%;
  padding: var(--mp-spacing-3, 12px) var(--mp-spacing-4, 16px);
  border: 1px solid var(--mp-border-danger, #e2483d);
  border-radius: var(--mp-radii-md, 6px);
  background: var(--mp-background-danger, #fceeed);
  font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); color: var(--mp-text-default);
}
.bo-login-error__text { display: flex; flex-direction: column; gap: var(--mp-spacing-0\.5, 2px); min-width: 0; }
.bo-login-error__title { font-weight: var(--mp-font-weights-semi-bold, 600); }
.auth-actions { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; }
.auth-gbtn { display: inline-flex; align-items: center; gap: var(--mp-spacing-2, 8px); }
.auth-gicon { width: 18px; height: 18px; display: block; }
.bo-login-caption { margin: 0; font-size: var(--mp-font-sizes-sm, 12px); color: var(--mp-text-secondary); text-align: center; }
</style>
