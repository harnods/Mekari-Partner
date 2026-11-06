<template>
  <AuthShell>
    <img class="auth-logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />

    <MpBanner v-if="flow.unregistered" id="su-unregistered" variant="info" data-devchange="signup-unregistered-banner">
      <MpBannerIcon />
      <MpBannerTitle>{{ t("Let's finish setting up your account") }}</MpBannerTitle>
      <MpBannerDescription>
        {{ t('Complete your profile below to create your Mekari Partner account.') }}
      </MpBannerDescription>
    </MpBanner>

    <div class="auth-head">
      <h1 class="auth-title">{{ t('Complete your profile') }}</h1>
      <p class="auth-sub">{{ t('Tell us a bit about you to finish setting up your account.') }}</p>
    </div>

    <div class="auth-form" data-devchange="signup-required-errors">
      <MpFormControl id="su-name" :is-invalid="err.name">
        <MpFormLabel>{{ t('Full name') }}</MpFormLabel>
        <MpInput v-model="fullName" @input="err.name = false" />
        <MpFormErrorMessage>{{ t('You must fill in full name') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="su-email" :is-invalid="err.email">
        <MpFormLabel>{{ t('Email') }}</MpFormLabel>
        <MpInput v-model="email" type="email" @input="err.email = false" />
        <MpFormErrorMessage>{{ t('You must fill in email') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="su-company" :is-invalid="err.company">
        <MpFormLabel>{{ t('Company') }}</MpFormLabel>
        <MpInput v-model="company" @input="err.company = false" />
        <MpFormErrorMessage>{{ t('You must fill in company') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="su-job" :is-invalid="err.job">
        <MpFormLabel>{{ t('Job position') }}</MpFormLabel>
        <MpInput v-model="jobPosition" @input="err.job = false" />
        <MpFormErrorMessage>{{ t('You must fill in job position') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="su-role" :is-invalid="err.role" data-devchange="signup-role-field">
        <MpFormLabel>{{ t('Role') }}</MpFormLabel>
        <MpAutocomplete
          id="su-role-ac"
          v-model="role"
          :data="roleOptions"
          label-prop="label"
          value-prop="value"
          :placeholder="t('Select role')"
          is-searchable
          use-portal
          is-full-width
          :is-invalid="err.role"
          @update:model-value="err.role = false"
        />
        <MpFormErrorMessage>{{ t('You must select role') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl v-if="role === 'other'" id="su-role-other" :is-invalid="err.roleOther">
        <MpFormLabel>{{ t('Please specify your role') }}</MpFormLabel>
        <MpInput v-model="roleOther" @input="err.roleOther = false" />
        <MpFormErrorMessage>{{ t('You must fill in your role') }}</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl id="su-phone" :is-invalid="err.phone">
        <MpFormLabel>{{ t('Phone number') }}</MpFormLabel>
        <MpInputGroup id="su-phone-group">
          <MpInputLeftAddon id="su-phone-cc">
            <MpPopover id="su-cc-popover" is-close-on-select placement="bottom-start" use-portal @open="ccSearch = ''">
              <MpPopoverTrigger>
                <span class="auth-cc" role="button">
                  <span>{{ country.flag }}</span>
                  <MpIcon name="chevrons-down" size="sm" />
                  <span class="auth-cc__code">{{ country.code }}</span>
                </span>
              </MpPopoverTrigger>
              <MpPopoverContent class="auth-cc__menu">
                <div class="auth-cc__search">
                  <MpInput v-model="ccSearch" size="sm" :placeholder="t('Search country')" />
                </div>
                <MpPopoverList>
                  <MpPopoverListItem
                    v-for="c in filteredCountries"
                    :key="c.iso2"
                    :is-active="c.iso2 === country.iso2"
                    @click="country = c; ccSearch = ''"
                  >
                    <span class="auth-cc__row">
                      <span>{{ c.flag }}</span>
                      <span class="auth-cc__name">{{ c.name }}</span>
                      <span class="auth-cc__dial">{{ c.code }}</span>
                    </span>
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </MpPopover>
          </MpInputLeftAddon>
          <MpInput v-model="phone" type="tel" @input="err.phone = false" @keydown.enter="onSave" />
        </MpInputGroup>
        <MpFormErrorMessage>{{ t('You must fill in phone number') }}</MpFormErrorMessage>
      </MpFormControl>
    </div>

    <div class="auth-actions">
      <MpButton variant="primary" is-rounded is-full-width @click="onSave">{{ t('Save and continue') }}</MpButton>
      <MpButton variant="ghost" is-rounded @click="flow.unregistered = false; router.push('/sign-in')">{{ t('Back to sign in') }}</MpButton>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { MpButton, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputGroup, MpInputLeftAddon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, MpIcon, MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription, MpAutocomplete } from '@mekari/pixel3'
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '~/utils/countries'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const { signInMock } = useAuth()
const flow = useAuthFlow()
const { save: saveProfile } = useProfile()

const fullName = ref('')
const email = ref(flow.email)
const company = ref('')
const jobPosition = ref('')
const phone = ref('')
const country = ref<Country>(DEFAULT_COUNTRY)
const ccSearch = ref('')
const role = ref('')
const roleOther = ref('')

const err = reactive({ name: false, email: false, company: false, job: false, phone: false, role: false, roleOther: false })

// Stable value keys so selection survives a language switch; labels go through t().
const roleOptions = computed(() => [
  { label: t('Consultant'), value: 'consultant' },
  { label: t('Implementer'), value: 'implementer' },
  { label: t('Developer'), value: 'developer' },
  { label: t('Project manager'), value: 'project_manager' },
  { label: t('Accountant or tax professional'), value: 'accountant' },
  { label: t('HR professional'), value: 'hr' },
  { label: t('Student or lecturer'), value: 'student' },
  { label: t('Other'), value: 'other' },
])

const filteredCountries = computed(() => {
  const q = ccSearch.value.trim().toLowerCase()
  if (!q) return COUNTRIES
  return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.includes(q))
})

const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim())

function onSave() {
  err.name = !fullName.value.trim()
  err.email = !isValidEmail(email.value)
  err.company = !company.value.trim()
  err.job = !jobPosition.value.trim()
  err.role = !role.value
  err.roleOther = role.value === 'other' && !roleOther.value.trim()
  err.phone = phone.value.replace(/\D/g, '').length < 6
  if (err.name || err.email || err.company || err.job || err.role || err.roleOther || err.phone) return
  flow.unregistered = false
  // Carry what we just collected into the partner registration (auto-fill).
  saveProfile({
    fullName: fullName.value.trim(),
    email: email.value.trim(),
    company: company.value.trim(),
    jobPosition: jobPosition.value.trim(),
    role: role.value === 'other' ? roleOther.value.trim() : role.value,
    phone: phone.value.trim(),
    phoneIso2: country.value.iso2.toLowerCase(),
  })
  signInMock(email.value, fullName.value.trim())
  // A fresh account is never a partner yet → straight to the partner
  // registration (the gate would send them there anyway).
  router.push('/partner-registration')
}

useHead({ title: () => `Mekari Partner | ${t('Complete your profile')}` })
</script>

<style scoped>
.auth-logo { height: 42px; width: auto; display: block; }
.auth-head { display: flex; flex-direction: column; gap: var(--mp-spacing-1, 4px); width: 100%; }
.auth-title { margin: 0; font-size: var(--mp-font-sizes-2xl, 24px); line-height: 32px; font-weight: 600; letter-spacing: -0.48px; color: var(--mp-text-default, #080d0e); }
.auth-sub { margin: 0; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-secondary, #3a4749); }
.auth-form { display: flex; flex-direction: column; gap: var(--mp-spacing-4, 16px); width: 100%; }
.auth-actions { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; }
.auth-cc { display: inline-flex; align-items: center; gap: var(--mp-spacing-1, 4px); cursor: pointer; }
.auth-cc__code { font-weight: 600; color: var(--mp-text-default, #080d0e); }
.auth-cc__menu { width: 288px; max-height: 320px; overflow-y: auto; }
.auth-cc__search { position: sticky; top: 0; background: #fff; padding: var(--mp-spacing-2, 8px); border-bottom: 1px solid var(--mp-border-default, #e3e7e9); z-index: 1; }
.auth-cc__row { display: flex; align-items: center; gap: var(--mp-spacing-2, 8px); width: 100%; }
.auth-cc__name { flex: 1; color: var(--mp-text-default, #080d0e); }
.auth-cc__dial { color: var(--mp-text-secondary, #3a4749); }
.auth-foot { display: flex; justify-content: center; width: 100%; }
</style>
