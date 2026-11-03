<template>
  <!--
    Shared chrome for every auth page (sign-in, sign-up, forgot/reset password):
    neutral-subtle backdrop, a centered white card (page content goes in the
    default slot), a language switcher below the card, and the Mekari footer.
    Ported from mekari-account's login shell, restyled to DT 2.4 Enterprise.
  -->
  <div class="auth">
    <div class="auth__col">
      <div class="auth__card">
        <slot />
      </div>

      <!-- Language switcher (below the card) -->
      <div class="auth__lang">
        <MpAutocomplete
          id="auth-lang"
          :model-value="locale"
          :data="langOptions"
          label-prop="label"
          value-prop="value"
          use-portal
          is-full-width
          @update:model-value="onLang"
        />
      </div>
    </div>

    <!-- Footer -->
    <footer class="auth__footer">
      <nav class="auth__links">
        <a href="https://mekari.com/privacy/" target="_blank" rel="noopener">{{ t('Privacy Policy') }}</a>
        <span class="auth__dot">•</span>
        <a href="https://mekari.com/persyaratan-layanan/" target="_blank" rel="noopener">{{ t('Terms of Use') }}</a>
        <span class="auth__dot">•</span>
        <a href="https://mekari.com/tentang-mekari/" target="_blank" rel="noopener">{{ t('About Mekari') }}</a>
      </nav>
      <img src="/logo-mekari.svg" alt="Mekari" class="auth__brand" />
      <p class="auth__copy">© {{ year }} PT Mid Solusi Nusantara</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { MpAutocomplete } from '@mekari/pixel3'

const { t, locale, setLocale } = useLocale()
const year = new Date().getFullYear()

const langOptions = [
  { label: 'English', value: 'en' },
  { label: 'Bahasa Indonesia', value: 'id' },
]

function onLang(v: unknown) {
  if (v === 'en' || v === 'id') setLocale(v)
}
</script>

<style scoped>
.auth {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  padding: var(--mp-spacing-10, 40px) var(--mp-spacing-6, 24px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
}

.auth__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mp-spacing-5, 20px);
  width: 100%;
  flex: 1;
}

.auth__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--mp-spacing-6, 24px);
  width: min(440px, 100%);
  padding: var(--mp-spacing-8, 32px);
  background: var(--mp-background-stage, #ffffff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
}

.auth__lang {
  width: 220px;
  max-width: 100%;
}

.auth__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mp-spacing-5, 20px);
  padding: var(--mp-spacing-6, 24px) 0 var(--mp-spacing-4, 16px);
}
.auth__links {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-2, 8px);
  font-size: var(--mp-font-sizes-sm, 12px);
}
.auth__links a {
  color: var(--mp-text-secondary, #3a4749);
  text-decoration: none;
}
.auth__links a:hover {
  text-decoration: underline;
}
.auth__dot {
  color: var(--mp-text-secondary, #3a4749);
}
.auth__brand {
  height: 24px;
  width: auto;
  display: block;
}
.auth__copy {
  margin: 0;
  font-size: var(--mp-font-sizes-sm, 12px);
  color: var(--mp-text-secondary, #3a4749);
}
</style>
