<script setup lang="ts">
/**
 * Partner Home (/) — greeting + short welcome, on the Bootstrap 12-col grid
 * (left 8 columns). While the partner organization is UNDER VALIDATION by the
 * Mekari team, a single status card for that org is shown; once approved it
 * disappears. One user has exactly one partner org.
 */
import { computed, ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import { MpButton } from '@mekari/pixel3'
import { PRODUCTS } from '~/data/partnerReg'
import { useHomeScenario } from '~/composables/useHomeScenario'
import HomeScenarioFab from '~/components/HomeScenarioFab.vue'

// Clicking the validation card opens a read-only preview of the submitted
// registration (cannot edit while under validation).
const previewOpen = ref(false)

const { locale, t } = useLocale()
const { profile } = useProfile()
const auth = useAuth()
const partner = usePartnerStatus()
const router = useRouter()
// Which Home state to render — switched from the FAB (useHomeScenario):
//   'under-validation' → org card · 'validated' (default) → straight to
//   announcements · 'no-org' → a "create partner organization" CTA.
const { scenario } = useHomeScenario()

const fullName = computed(() => profile.value.fullName || auth.user.value?.name || '')
const firstName = computed(() => fullName.value.trim().split(' ')[0] || '')

// "Create partner organization" starts a FRESH registration — clear any saved
// draft first so the form opens empty (startNew resets the draft + status).
function goRegister() {
  partner.startNew()
  router.push('/partner-registration')
}

// Time-of-day greeting (pagi / siang / sore / malam).
const greeting = computed(() => {
  const h = new Date().getHours()
  const id = locale.value === 'id'
  if (h >= 5 && h < 11) return id ? 'Selamat pagi' : 'Good morning'
  if (h >= 11 && h < 15) return id ? 'Selamat siang' : 'Good afternoon'
  if (h >= 15 && h < 19) return id ? 'Selamat sore' : 'Good evening'
  return id ? 'Selamat malam' : 'Good evening'
})

// ── Scenario-driven Home state ───────────────────────────────────────────────
// 'under-validation' → the org card; 'no-org' → the create CTA; 'validated' → neither.
const showValidationCard = computed(() => scenario.value === 'under-validation')
const showCreateCta = computed(() => scenario.value === 'no-org')
// When the card is shown without real registration data, fall back to placeholders.
const demoCard = computed(() => showValidationCard.value)
const orgName = computed(() => partner.draft.value.brand || profile.value.company || 'Your organization')
// The single product the partner chose at registration. Falls back to a demo
// product name on the demo card, or an em dash when there's no real selection.
const productsLabel = computed(() => {
  const p = partner.draft.value.product || ''
  if (p) return p
  return demoCard.value ? PRODUCTS[0] : '—'
})
// Registration date = when they submitted (NOT an "onboarded" date). Without a real
// submission (demo card), show today's date as a stand-in.
const registeredDate = computed(() => {
  const iso = partner.submittedAt.value || (demoCard.value ? new Date().toISOString() : '')
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
})

// ── Public announcements from Mekari to all partners ─────────────────────────
const announcements = [
  {
    title: 'Talenta Payroll API v2 is now live',
    by: 'Mekari Product Team',
    date: '02 Nov 2026',
    desc: 'The new Payroll API brings bulk payroll runs, incremental sync, and webhook events for payslip status. Existing v1 integrations keep working until 30 June 2027, but we recommend migrating early to benefit from the higher rate limits and the dedicated sandbox environment for safe testing before you go live.',
  },
  {
    title: 'Partner tier benefits updated for Q4 2026',
    by: 'Partnership Team',
    date: '28 Oct 2026',
    desc: 'Gold and Platinum partners now receive higher deal-registration discounts and priority implementation support.',
  },
  {
    title: 'Mekari Partner Summit 2026 — registration is open',
    by: 'Mekari Events',
    date: '20 Oct 2026',
    desc: 'Join partners from across Indonesia for a full day of product deep-dives, certification workshops, and networking. Early-bird registration is open until 15 November, with limited seats for the hands-on implementation labs — reserve yours before they fill up.',
  },
  {
    title: 'Jurnal now supports multi-currency invoicing',
    by: 'Mekari Product Team',
    date: '12 Oct 2026',
    desc: 'Issue invoices and record transactions in multiple currencies with automatic exchange-rate updates.',
  },
  {
    title: 'Updated partner commission scheme, effective 1 November',
    by: 'Partnership Team',
    date: '05 Oct 2026',
    desc: 'The updated commission structure takes effect on 1 November 2026. Review the new tiers and payout schedule in the partner portal; deals registered before that date keep their original rates for the full contract term.',
  },
]
const expanded = reactive<boolean[]>(announcements.map(() => false))
const overflowing = reactive<boolean[]>(announcements.map(() => false))
const descEls = ref<HTMLElement[]>([])
function setDescRef(el: HTMLElement | null, i: number) {
  if (el) descEls.value[i] = el
}
function toggleAnnounce(i: number) {
  expanded[i] = !expanded[i]
}
function checkOverflow() {
  descEls.value.forEach((el, i) => {
    if (el && !expanded[i]) overflowing[i] = el.scrollHeight > el.clientHeight + 1
  })
}
onMounted(async () => {
  await nextTick()
  checkOverflow()
  window.addEventListener('resize', checkOverflow)
})
onBeforeUnmount(() => window.removeEventListener('resize', checkOverflow))
</script>

<template>
  <div class="home" data-devchange="partner-home-greeting">
    <div class="home__container">
      <div class="home__grid mp-grid mp-grid--center" data-devchange="home-content-indent">
        <!-- Greeting + short welcome — main content on the left 8 columns -->
        <header class="home__head">
          <h1 class="home__greeting">{{ firstName ? `${greeting}, ${firstName}` : greeting }}</h1>
          <p class="home__desc">
            Welcome to Mekari Partner — your workspace to sell and implement Mekari
            products for your clients.
          </p>
        </header>

        <!-- Scenario 'under-validation' — org card (click → read-only preview). -->
        <section v-if="showValidationCard" class="home__status">
          <article
            class="org-card"
            role="button"
            tabindex="0"
            :aria-label="`${orgName} — view registration details`"
            @click="previewOpen = true"
            @keydown.enter.prevent="previewOpen = true"
            @keydown.space.prevent="previewOpen = true"
          >
            <div class="org-card__head">
              <ErpStatusBadge status="pending" type="information" label="Under validation" />
              <div class="org-card__name">{{ orgName }}</div>
            </div>
            <dl class="org-card__meta">
              <div class="org-card__row">
                <dt>Product</dt>
                <dd>{{ productsLabel }}</dd>
              </div>
              <div class="org-card__row">
                <dt>Registered</dt>
                <dd>{{ registeredDate }}</dd>
              </div>
            </dl>
            <p class="org-card__note">
              Our team is reviewing your partner organization. This usually takes 1–3
              business days — we'll let you know once it's approved.
            </p>
          </article>
        </section>

        <!-- Scenario 'no-org' — CTA to create a partner org (opens the reg form). -->
        <section v-else-if="showCreateCta" class="home__cta">
          <p class="home__cta-text">
            You don't have a partner organization yet. Create one to start selling and
            implementing Mekari products for your clients.
          </p>
          <MpButton variant="primary" is-rounded @click="goRegister">
            {{ t('Create partner organization') }}
          </MpButton>
        </section>

        <!-- Announcements — the whole page stacks vertically (greeting → org card
             → Announcements heading → the announcement list), each block on its
             own grid row. The heading sits directly above its card list. -->
        <h2 class="home__announce-title">Announcements</h2>
        <article class="announce-card">
          <ul class="announce-list">
              <li v-for="(a, i) in announcements" :key="a.title" class="announce-item">
                <div class="announce-item__head">
                  <h3 class="announce-item__title">{{ a.title }}</h3>
                  <span class="announce-item__date">{{ a.date }}</span>
                </div>
                <div class="announce-item__by">{{ a.by }}</div>
                <p
                  :ref="(el) => setDescRef(el as HTMLElement | null, i)"
                  class="announce-item__desc"
                  :class="{ 'is-expanded': expanded[i] }"
                >{{ a.desc }}</p>
                <button
                  v-if="overflowing[i]"
                  type="button"
                  class="announce-item__toggle"
                  @click="toggleAnnounce(i)"
                >{{ expanded[i] ? 'Show less' : 'Show more' }}</button>
              </li>
          </ul>
        </article>
      </div>
    </div>

    <!-- Read-only preview of the submitted registration -->
    <PartnerRegPreviewDrawer :is-open="previewOpen" @close="previewOpen = false" />

    <!-- Demo: switch Home between its three scenarios (bottom-right FAB). -->
    <HomeScenarioFab />
  </div>
</template>

<style scoped>
/* The .stage owns the 24px padding on all four sides and the mint hero gradient
   (rule/grid-12-col, .stage--home). Home adds NO padding/margin of its own — its
   content sits directly on the stage's 12-col grid. */
.home {
  min-width: 0;
}

/* Transparent passthrough — the 12-col grid fills the stage content box (no extra
   padding, no centered max-width container). */
.home__container {
  width: 100%;
}

/* The grid system (12 fluid cols, 12px gutter, 1440 max, centered) comes from the
   global .mp-grid / .mp-grid--center classes (grid.css). The page stacks VERTICALLY:
   every block starts at COLUMN 3 (a 2-col left indent), so each lands on its own grid
   row — greeting, then the org card below it, then the Announcements heading, then the
   announcement list. Widths are set by each block's span; the ladder (12 → 10 → 8 → 6
   → 4) narrows them. Below 992px the start resets to column 1 so the wide blocks fit. */

/* Greeting + welcome — row 1, spans 8, indented to start at column 3. */
.home__head {
  grid-column: 3 / span 8;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-2, 8px);
  text-align: left;
}
.home__greeting {
  font-size: var(--mp-font-sizes-2xl, 24px);
  font-weight: var(--mp-font-weights-bold, 700);
  line-height: var(--mp-line-heights-2xl, 32px);
  color: var(--mp-text-default, #080d0e);
}
.home__desc {
  font-size: var(--mp-font-sizes-md, 14px);
  line-height: var(--mp-line-heights-lg, 22px);
  color: var(--mp-text-default, #080d0e);
  max-width: 52ch;
}

/* Validation card — row 2 (below the greeting), spans 4, indented to column 3. */
.home__status { grid-column: 3 / span 4; min-width: 0; }

/* Create-org CTA (scenario 'no-org') — row 2, spans 8, text + primary button. */
.home__cta {
  grid-column: 3 / span 8;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--mp-spacing-4, 16px);
}
.home__cta-text {
  font-size: var(--mp-font-sizes-md, 14px);
  line-height: var(--mp-line-heights-lg, 22px);
  color: var(--mp-text-default, #080d0e);
  max-width: 52ch;
}

.org-card {
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-4, 16px);
  padding: var(--mp-spacing-5, 20px);
  background: var(--mp-background-neutral, #fff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  cursor: pointer;
  text-align: left;
  transition: border-color 100ms, background 100ms;
}
.org-card:hover { border-color: var(--mp-border-bold, #8c9596); }
.org-card:focus-visible { outline: 2px solid var(--mp-border-bold, #8c9596); outline-offset: 2px; }
.org-card__head { display: flex; flex-direction: column; align-items: flex-start; gap: var(--mp-spacing-2, 8px); }
.org-card__name {
  font-size: var(--mp-font-sizes-md, 14px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  line-height: var(--mp-line-heights-md, 20px);
  color: var(--mp-text-default, #080d0e);
  min-width: 0;
}
.org-card__meta { display: flex; flex-direction: column; gap: var(--mp-spacing-2, 8px); margin: 0; }
.org-card__row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--mp-spacing-3, 12px); }
.org-card__row dt { font-size: var(--mp-font-sizes-md, 14px); color: var(--mp-text-default, #080d0e); }
.org-card__row dd {
  margin: 0;
  font-size: var(--mp-font-sizes-md, 14px);
  color: var(--mp-text-default, #080d0e);
  text-align: right;
}
.org-card__note {
  font-size: var(--mp-font-sizes-md, 14px);
  line-height: var(--mp-line-heights-lg, 22px);
  color: var(--mp-text-default, #080d0e);
  padding-top: var(--mp-spacing-2, 8px);
  border-top: 1px solid var(--mp-border-default, #e3e7e9);
}

/* ── Announcements ───────────────────────────────────────────────────────── */
/* Heading — its own grid row, directly above the list card; 32px above (12px
   row-gap + 20px margin) to separate it from the greeting/card block above. */
.home__announce-title {
  grid-column: 3 / span 6;
  margin-top: var(--mp-spacing-5, 20px);
  font-size: var(--mp-font-sizes-xl, 20px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  line-height: var(--mp-line-heights-xl, 30px);
  color: var(--mp-text-default, #080d0e);
}
/* Announcement list card — its own grid row, directly below the heading. */
.announce-card {
  grid-column: 3 / span 8;
  min-width: 0;
  background: var(--mp-background-neutral, #fff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  overflow: hidden;
}

/* ── Block widths narrow with the column-count ladder. Below 992px the grid drops
   to ≤8 cols, so the 2-col indent can't hold the wide (span-8) blocks — drop the
   indent back to column 1 (spans unchanged). At ≤6 cols each block spans the full
   row. Everything stays vertically stacked at every width. */
@media (max-width: 991.98px) {
  .home__head,
  .home__status,
  .home__cta,
  .home__announce-title,
  .announce-card { grid-column-start: 1; }
}
@media (max-width: 767.98px) {
  .home__head,
  .home__status,
  .home__cta,
  .home__announce-title,
  .announce-card { grid-column: 1 / -1; }
}
.announce-list { list-style: none; margin: 0; padding: 0; }
.announce-item {
  display: flex;
  flex-direction: column;
  gap: var(--mp-spacing-2, 8px);
  padding: var(--mp-spacing-4, 16px) var(--mp-spacing-5, 20px);
}
.announce-item + .announce-item { border-top: 1px solid var(--mp-border-default, #e3e7e9); }
.announce-item__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mp-spacing-4, 16px);
}
.announce-item__title {
  margin: 0;
  font-size: var(--mp-font-sizes-lg, 16px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  line-height: var(--mp-line-heights-lg, 22px);
  color: var(--mp-text-default, #080d0e);
  min-width: 0;
}
.announce-item__date {
  flex-shrink: 0;
  font-size: var(--mp-font-sizes-sm, 12px);
  color: var(--mp-text-secondary, #3a4749);
}
/* Who posted it — small byline under the title. */
.announce-item__by {
  margin-top: calc(-1 * var(--mp-spacing-1, 4px));
  font-size: var(--mp-font-sizes-sm, 12px);
  color: var(--mp-text-secondary, #3a4749);
}
/* Short description — clamped to 3 lines; "Show more" reveals the rest. */
.announce-item__desc {
  font-size: var(--mp-font-sizes-md, 14px);
  line-height: var(--mp-line-heights-lg, 22px);
  color: var(--mp-text-default, #080d0e);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.announce-item__desc.is-expanded {
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
}
.announce-item__toggle {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: var(--mp-font-sizes-md, 14px);
  font-weight: var(--mp-font-weights-semi-bold, 600);
  color: var(--mp-text-link, #165082);
}
.announce-item__toggle:hover { text-decoration: underline; }
</style>
