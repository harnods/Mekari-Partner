<template>
  <!-- Top bar for the chrome-less partner pages (registration, organization
       chooser): Mekari Partner logo + the user menu (avatar 36px + name →
       Language sub-view + Sign out). Same structure as the ERP header ErpUserMenu. -->
  <header class="ptb">
    <img class="ptb__logo" src="/mekari-partner-logo.svg" alt="Mekari Partner" />
    <MpPopover id="ptb-user-menu" placement="bottom-end" trigger="click" use-portal v-slot="{ onClosePopover }" @close="onMenuClose">
      <MpPopoverTrigger>
        <div class="ptb__user" role="button" tabindex="0" data-devchange="preg-user-menu" :aria-label="t('User menu')">
          <MpAvatar id="ptb-user-avatar" :name="userName" size="lg" variant-color="sky" />
          <span class="ptb__user-name">{{ userName }}</span>
        </div>
      </MpPopoverTrigger>
      <MpPopoverContent class="ptb-menu" is-unstyled>
        <nav v-if="menuView === 'main'" class="ptb-menu__group">
          <MpButton variant="ghost" class="ptb-menu__row" @click="menuView = 'language'">
            <span class="ptb-menu__label">{{ t('Language') }}</span>
            <span class="ptb-menu__value">{{ currentLanguage }}</span>
            <MpIcon name="chevrons-right" size="md" color="icon.default" />
          </MpButton>
          <MpButton variant="ghost" class="ptb-menu__row" @click="onSignOut(onClosePopover)">
            <span class="ptb-menu__label">{{ t('Sign out') }}</span>
          </MpButton>
        </nav>
        <template v-else>
          <div class="ptb-menu__subhead">
            <MpButton variant="ghost" class="ptb-menu__back" aria-label="Back" @click="menuView = 'main'">
              <MpIcon name="chevrons-left" size="md" color="icon.default" />
            </MpButton>
            <span class="ptb-menu__subtitle">{{ t('Change language') }}</span>
          </div>
          <nav class="ptb-menu__group">
            <MpButton v-for="lang in languages" :key="lang.value" variant="ghost" class="ptb-menu__row" @click="selectLanguage(lang.value)">
              <span class="ptb-menu__label">{{ lang.label }}</span>
              <MpIcon v-if="lang.value === locale" name="check" size="md" color="icon.brand" />
            </MpButton>
          </nav>
        </template>
      </MpPopoverContent>
    </MpPopover>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MpPopover, MpPopoverTrigger, MpPopoverContent, MpAvatar, MpButton, MpIcon } from '@mekari/pixel3'

const { t, locale, setLocale } = useLocale()
const router = useRouter()
const auth = useAuth()
const { profile } = useProfile()

// Language lives inside the user menu (Language › Change language sub-view).
const languages = [
  { label: 'English', value: 'en' },
  { label: 'Bahasa Indonesia', value: 'id' },
] as const
const menuView = ref<'main' | 'language'>('main')
const currentLanguage = computed(() => (locale.value === 'id' ? 'Bahasa Indonesia' : 'English'))
function selectLanguage(v: 'en' | 'id') { setLocale(v); menuView.value = 'main' }
// Reopening the menu always starts on the main view.
function onMenuClose() { setTimeout(() => { menuView.value = 'main' }, 300) }

// Name from Complete-your-profile (sign-up), else the signed-in session.
// Sign out ends the session; AuthGate then routes to /sign-in. A registration
// draft is kept, so the next sign-in resumes it.
const userName = computed(() => profile.value.fullName || auth.user.value?.name || auth.user.value?.email || 'Pengguna Mekari')
async function onSignOut(close: () => void) {
  close()
  await auth.signOut()
  router.replace('/sign-in')
}
</script>

<style scoped>
.ptb { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; }
.ptb__logo { height: 36px; width: auto; display: block; }
.ptb__user { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px 8px 4px 4px; border-radius: var(--mp-radii-full, 999px); cursor: pointer; }
.ptb__user:hover { background: var(--mp-background-neutral-subtle-hovered, #eef0f1); }
.ptb__user:focus-visible { outline: 2px solid var(--mp-colors-border-bold, #8c9596); outline-offset: 2px; }
.ptb__user-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: var(--mp-font-weights-regular, 400); color: var(--mp-text-default, #080d0e); }
@media (max-width: 640px) { .ptb__user-name { display: none; } }

/* User menu popover — mirrors ErpUserMenu. MpPopoverContent is portalled to
   <body>, so its root box rule must be global; inner rows keep the scope id. */
:global(.mp-popover.ptb-menu) { z-index: var(--mp-z-indices-popover, 1600); width: 240px; padding: var(--mp-spacing-2, 8px) 0; background: var(--mp-colors-background-stage, #ffffff); border: var(--mp-border-width-sm, 1px) solid var(--mp-colors-border-default, #e3e7e9); border-radius: var(--mp-radii-md, 6px); box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; /* pixel-police-allow-shadow: floating account-menu popover */ }
.ptb-menu__group { display: flex; flex-direction: column; }
.ptb-menu__row { display: flex; align-items: center; gap: var(--mp-spacing-3, 12px); width: 100%; padding: var(--mp-spacing-2, 8px) var(--mp-spacing-3, 12px); background: transparent; border: 0; border-radius: 0; cursor: pointer; text-align: left; }
.ptb-menu__row:hover { background: var(--mp-colors-background-neutral-hovered, #f0f2f2); }
.ptb-menu__label { flex: 1; font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: var(--mp-font-weights-regular, 400); color: var(--mp-colors-text-default, #080d0e); }
.ptb-menu__value { font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: var(--mp-font-weights-regular, 400); color: var(--mp-colors-text-secondary, #3a4749); }
.ptb-menu__subhead { display: flex; align-items: center; gap: var(--mp-spacing-2, 8px); padding: 0 var(--mp-spacing-2, 8px) var(--mp-spacing-2, 8px) var(--mp-spacing-1, 4px); }
.ptb-menu__back { display: flex; align-items: center; justify-content: center; padding: var(--mp-spacing-1, 4px); background: transparent; border: 0; border-radius: var(--mp-radii-md, 6px); cursor: pointer; }
.ptb-menu__back:hover { background: var(--mp-colors-background-neutral-hovered, #f0f2f2); }
.ptb-menu__subtitle { font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: 600; color: var(--mp-colors-text-default, #080d0e); }
</style>
