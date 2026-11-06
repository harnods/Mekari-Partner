<template>
  <!--
    "No partner organization" chooser. Shown on every sign-in for a user whose
    partner organization was deleted (from the Mekari backoffice) while their
    Mekari account still exists — partner status 'removed' (data/partnerGate.ts).
    Two stacked choices: register a new partner organization (the registration
    form from the start) or go to Home.
  -->
  <div class="porg">
    <PartnerTopBar />
    <main class="porg__main">
      <div class="porg__card" data-devchange="partner-org-chooser">
        <div class="porg__head">
          <h1 class="porg__title">{{ t('You don’t have a partner organization') }}</h1>
          <p class="porg__text">{{ t('Your Mekari account is still active, but it’s no longer linked to a partner organization. What would you like to do?') }}</p>
        </div>

        <div class="porg__options">
          <div
            v-for="o in options"
            :key="o.id"
            :id="`porg-${o.id}`"
            class="porg__option"
            role="button"
            tabindex="0"
            @click="o.run"
            @keydown.enter.prevent="o.run"
            @keydown.space.prevent="o.run"
          >
            <span class="porg__option-text">
              <span class="porg__option-title">{{ o.title }}</span>
              <span class="porg__option-desc">{{ o.desc }}</span>
            </span>
            <MpIcon name="chevrons-right" size="md" color="icon.default" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MpIcon } from '@mekari/pixel3'
import PartnerTopBar from '~/components/PartnerTopBar.vue'
import { REG_ROUTE } from '~/data/partnerGate'

definePageMeta({ layout: 'blank' })

const { t } = useLocale()
const router = useRouter()
const ps = usePartnerStatus()

/** Start the partner registration over (any old draft is cleared). */
function registerNew() {
  ps.startNew()
  router.push(REG_ROUTE)
}
/** Open the app without a partner organization — this session only. */
function goHome() {
  ps.chooseHome()
  router.push('/')
}

const options = computed(() => [
  { id: 'register', title: t('Register a new partner organization'), desc: t('Fill in the partner registration from the start.'), run: registerNew },
  { id: 'home', title: t('Go to Home'), desc: t('Continue to Home without a partner organization.'), run: goHome },
])

useHead({ title: () => `Mekari Partner | ${t('Partner organization')}` })
</script>

<style scoped>
.porg { position: fixed; inset: 0; display: flex; flex-direction: column; overflow-y: auto; background: var(--mp-background-neutral-subtle, #f8f9f9); color: var(--mp-text-default, #080d0e); }
.porg__main { flex: 1; padding: 8px 24px 48px; }
.porg__card { max-width: 520px; margin: 48px auto; display: flex; flex-direction: column; gap: 24px; padding: 40px; background: var(--mp-background-stage, #ffffff); border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-lg, 12px); }
.porg__head { display: flex; flex-direction: column; gap: 8px; }
.porg__title { margin: 0; font-size: 24px; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; }
.porg__text { margin: 0; font-size: var(--mp-font-sizes-md, 14px); line-height: 1.6; color: var(--mp-text-secondary, #3a4749); }
/* One joined group: a single bold outer border, a default divider between rows. */
.porg__options { display: flex; flex-direction: column; border: 1px solid var(--mp-colors-border-bold, #8c9596); border-radius: var(--mp-radii-lg, 12px); overflow: hidden; }
.porg__option { display: flex; align-items: center; gap: 16px; padding: 16px; cursor: pointer; }
.porg__option + .porg__option { border-top: 1px solid var(--mp-border-default, #e3e7e9); }
.porg__option:hover { background: var(--mp-background-neutral-subtle, #f8f9f9); }
.porg__option:focus-visible { outline: 2px solid var(--mp-colors-border-bold, #8c9596); outline-offset: -2px; }
.porg__option-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.porg__option-title { font-size: var(--mp-font-sizes-md, 14px); line-height: var(--mp-line-heights-md, 20px); font-weight: 600; }
.porg__option-desc { font-size: var(--mp-font-sizes-sm, 12px); line-height: var(--mp-line-heights-sm, 16px); color: var(--mp-text-secondary, #3a4749); }
@media (max-width: 560px) { .porg__card { padding: 24px; margin: 24px auto; } }
</style>
