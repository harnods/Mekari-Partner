<template>
  <!--
    Partner header — the single dark app bar for the whole Mekari Partner app
    (rendered on every page by layouts/default.vue, replacing the ERP header).
    Mekari Partner wordmark (white) on the left; on the right only the user
    snapshot (1-letter avatar + name + company). No product switcher, no search, no
    quick-action icons. Layout is scoped CSS (not MpFlex utilities) for the same
    reason as ErpHeader — see global-header-bar.md.
  -->
  <header class="phh">
    <!-- Left: white Mekari Partner wordmark -->
    <div class="phh__left">
      <img class="phh__logo" src="/mekari-partner-wordmark.svg" alt="Mekari Partner" />
    </div>

    <!-- Right: user snapshot (avatar + name + company) → account menu -->
    <div class="phh__right">
      <MpPopover id="phh-user-menu" placement="bottom-end" trigger="click" use-portal v-slot="{ onClosePopover }" @close="onMenuClose">
        <MpPopoverTrigger>
          <div class="phh__user" role="button" tabindex="0" :aria-label="t('User menu')" data-devchange="partner-header">
            <MpAvatar id="phh-user-avatar" :name="userInitial" size="md" variant-color="sky" />
            <span class="phh__user-text">
              <span class="phh__user-name">{{ userName }}</span>
              <span v-if="companyName" class="phh__user-company">{{ companyName }}</span>
            </span>
          </div>
        </MpPopoverTrigger>
        <MpPopoverContent class="phh-menu" is-unstyled>
          <nav v-if="menuView === 'main'" class="phh-menu__group">
            <MpButton variant="ghost" class="phh-menu__row" @click="menuView = 'language'">
              <span class="phh-menu__label">{{ t('Language') }}</span>
              <span class="phh-menu__value">{{ currentLanguage }}</span>
              <MpIcon name="chevrons-right" size="md" color="icon.default" />
            </MpButton>
            <MpButton variant="ghost" class="phh-menu__row" @click="onSignOut(onClosePopover)">
              <span class="phh-menu__label">{{ t('Sign out') }}</span>
            </MpButton>
          </nav>
          <template v-else>
            <div class="phh-menu__subhead">
              <MpButton variant="ghost" class="phh-menu__back" :aria-label="t('Back')" @click="menuView = 'main'">
                <MpIcon name="chevrons-left" size="md" color="icon.default" />
              </MpButton>
              <span class="phh-menu__subtitle">{{ t('Change language') }}</span>
            </div>
            <nav class="phh-menu__group">
              <MpButton v-for="lang in languages" :key="lang.value" variant="ghost" class="phh-menu__row" @click="selectLanguage(lang.value)">
                <span class="phh-menu__label">{{ lang.label }}</span>
                <MpIcon v-if="lang.value === locale" name="check" size="md" color="icon.brand" />
              </MpButton>
            </nav>
          </template>
        </MpPopoverContent>
      </MpPopover>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MpPopover, MpPopoverTrigger, MpPopoverContent, MpAvatar, MpButton, MpIcon } from '@mekari/pixel3'

const { t, locale, setLocale } = useLocale()
const router = useRouter()
const auth = useAuth()
const { profile } = useProfile()

// Name + company come from the sign-up profile (Complete-your-profile), falling
// back to the signed-in session for the name.
const userName = computed(() => profile.value.fullName || auth.user.value?.name || auth.user.value?.email || 'Pengguna Mekari')
const companyName = computed(() => profile.value.company || '')
// 1-letter initial only (not first+last) — pass a single char so MpAvatar renders one letter.
const userInitial = computed(() => (userName.value.trim().charAt(0) || 'M').toUpperCase())

// Language lives inside the user menu (Language › Change language sub-view).
const languages = [
  { label: 'English', value: 'en' },
  { label: 'Bahasa Indonesia', value: 'id' },
] as const
const menuView = ref<'main' | 'language'>('main')
const currentLanguage = computed(() => (locale.value === 'id' ? 'Bahasa Indonesia' : 'English'))
function selectLanguage(v: 'en' | 'id') { setLocale(v); menuView.value = 'main' }
function onMenuClose() { setTimeout(() => { menuView.value = 'main' }, 300) }

async function onSignOut(close: () => void) {
  close()
  await auth.signOut()
  router.replace('/sign-in')
}
</script>

<style scoped>
/* Dark app bar — background.header (navy via the Mekari Partner theme), 56px. */
.phh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mp-spacing-2, 8px);
  height: var(--mp-sizes-14, 56px);
  flex-shrink: 0;
  padding: 0 var(--mp-spacing-3, 12px) 0 var(--mp-spacing-4, 16px);
  background: var(--mp-colors-background-header, #0b257e);
  z-index: var(--mp-z-indices-sticky, 1100);
}
.phh__left { display: flex; align-items: center; min-width: 0; }
/* The wordmark SVG is multi-colour; force it solid white for the dark bar. */
.phh__logo { height: 24px; width: auto; display: block; filter: brightness(0) invert(1); }

.phh__right { display: flex; align-items: center; }
.phh__user {
  display: flex;
  align-items: center;
  gap: var(--mp-spacing-2, 8px);
  min-width: 0;
  padding: var(--mp-spacing-1, 4px) var(--mp-spacing-2, 8px);
  border-radius: var(--mp-radii-full, 999px);
  cursor: pointer;
}
.phh__user:hover { background: rgba(255, 255, 255, 0.12); /* pixel-police-allow: translucent white hover on the dark brand bar, no token */ }
.phh__user:focus-visible { outline: 2px solid var(--mp-colors-focus, #fff); outline-offset: 2px; }
.phh__user-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.phh__user-name {
  max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: var(--mp-font-sizes-sm, 14px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  color: var(--mp-colors-text-inverse, #fff);
}
.phh__user-company {
  max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: var(--mp-font-sizes-xs, 12px);
  color: rgba(255, 255, 255, 0.75); /* pixel-police-allow: muted white on the dark brand bar, no token */
}
@media (max-width: 640px) { .phh__user-text { display: none; } }

/* Account menu popover — mirrors ErpUserMenu / PartnerTopBar. Portalled to <body>,
   so the root box rule is global; inner rows keep the scope id. */
:global(.mp-popover.phh-menu) { z-index: var(--mp-z-indices-popover, 1600); width: 240px; padding: var(--mp-spacing-2, 8px) 0; background: var(--mp-colors-background-stage, #fff); border: 1px solid var(--mp-colors-border-default, #e3e7e9); border-radius: var(--mp-radii-md, 6px); box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; /* pixel-police-allow-shadow: floating account-menu popover */ }
.phh-menu__group { display: flex; flex-direction: column; }
.phh-menu__row { display: flex; align-items: center; gap: var(--mp-spacing-3, 12px); width: 100%; padding: var(--mp-spacing-2, 8px) var(--mp-spacing-3, 12px); background: transparent; border: 0; border-radius: 0; cursor: pointer; text-align: left; }
.phh-menu__row:hover { background: var(--mp-colors-background-neutral-hovered, #f0f2f2); }
.phh-menu__label { flex: 1; font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-colors-text-default, #080d0e); }
.phh-menu__value { font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-colors-text-secondary, #3a4749); }
.phh-menu__subhead { display: flex; align-items: center; gap: var(--mp-spacing-2, 8px); padding: 0 var(--mp-spacing-2, 8px) var(--mp-spacing-2, 8px) var(--mp-spacing-1, 4px); }
.phh-menu__back { display: flex; align-items: center; justify-content: center; padding: var(--mp-spacing-1, 4px); background: transparent; border: 0; border-radius: var(--mp-radii-md, 6px); cursor: pointer; }
.phh-menu__back:hover { background: var(--mp-colors-background-neutral-hovered, #f0f2f2); }
.phh-menu__subtitle { font-size: var(--mp-font-sizes-md, 14px); font-weight: 600; color: var(--mp-colors-text-default, #080d0e); }
</style>
