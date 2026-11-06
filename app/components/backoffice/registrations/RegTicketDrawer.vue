<script setup lang="ts">
/**
 * RegTicketDrawer — J-04 Registration ticket (+ J-06 Agreements, J-12 Activity
 * log). Hand-rolled Teleport drawer shell copied from CrmCustomerViewDrawer /
 * BillsFiltersDrawer (rule/drawer-custom-shell: header fill, no shadow, the
 * overlay is a backdrop only — close via × only), 720px wide over the kanban.
 * (ErpDrawer's css() atomic classes are not generated in this Panda build.)
 *
 *   Header   brand + stage badge (+ Locked for Completed / Rejected)
 *   Summary  number · code · entity, key facts (ContentList), provenance link →
 *            ActivityLogModal (rule/activity-log-trigger)
 *   Banners  Rejected (reason) / Completed (partner + Open partner)
 *   Account Owner selector (setTicketAe) — required before Data Validation
 *   Agreements (BoAgreementSection; editable only in Agreement Drafting)
 *   3 data sections, grouped like the partner registration form (Legal
 *            information · Business profile · Market and expertise) — in Data
 *            Validation each title gets a one-click check button (→ Valid, toast); Legal adds Identity
 *            Outside it the result shows as badges.
 *   Hint     info banner under Account Owner (footerHint: what's still needed)
 *   Footer   inline error · Reject · Move to {next} (Registration Request) or, later,
 *            a "Move to" popover: the next stage + every stage already passed. Buttons are never
 *            disabled — a blocked move explains itself inline in the footer
 *            (rule/btn-no-disabled-validation, rule/form-errors-inline).
 * Moves to Rejected / Completed are handed to the page (`needs`) which opens the
 * J-09 / J-11 modal.
 */
import { ref, reactive, computed, watch, nextTick } from 'vue'
import {
  MpButton, MpIcon, MpFormControl, MpFormLabel, MpFormErrorMessage, MpAutocomplete,
  MpBanner, MpBannerIcon, MpBannerTitle, MpBannerDescription,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, MpTooltip,
} from '@mekari/pixel3'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import ActivityLogModal from '~/components/patterns/ActivityLogModal.vue'
import BoAgreementSection from '~/components/backoffice/BoAgreementSection.vue'
import FilePreviewModal from '~/components/patterns/FilePreviewModal.vue'
import { idDocPdfUrl } from '~/utils/boIdDocPdf'
import {
  getTicket, moveTicket, setTicketAe, setTicketCheck, ticketActivityEntries, tr,
  BO_SECTIONS,
  type CheckKey, type CheckValue, type SectionKey, type TicketStage,
} from '~/data/backoffice'
import { successToast } from '~/utils/toasts'
import {
  isLocked, stageNav, footerHint, ticketFacts, sectionRows, aeCaption, aeOptions, aeName,
  provenance, completedText, rejectedText,
} from './regLogic'

const props = defineProps<{ ticketId: string | null }>()
const emit = defineEmits<{ close: []; needs: [payload: { kind: 'reject' | 'complete'; id: string }] }>()
const { t } = useLocale()
const router = useRouter()

const ticket = computed(() => (props.ticketId ? getTicket(props.ticketId) : undefined))
const open = computed(() => !!ticket.value)
const locked = computed(() => (ticket.value ? isLocked(ticket.value) : false))
const isDV = computed(() => ticket.value?.stage === 'Data Validation')
const nav = computed(() => (ticket.value ? stageNav(ticket.value) : { prev: null, next: null, invalidLock: false }))
const hint = computed(() => (ticket.value ? footerHint(ticket.value) : ''))
const facts = computed(() => (ticket.value ? ticketFacts(ticket.value) : []))
const prov = computed(() => (ticket.value ? provenance(ticket.value) : { text: '' }))
const showAgreements = computed(() => !!ticket.value && (ticket.value.stage === 'Agreement Drafting' || ticket.value.stage === 'Completed' || ticket.value.agreements.length > 0))

// ── Inline errors (footer + the field the failed move points at) ──────────
const footErr = ref('')
const footErrFor = ref<'' | 'ae'>('')
watch(() => props.ticketId, () => { footErr.value = ''; footErrFor.value = '' })
function clearErr() { footErr.value = ''; footErrFor.value = '' }

// ── Account Owner ─────────────────────────────────────────────────────────
// Name-only labels: the inline picker sits in one summary column.
const aeOpts = computed(() => aeOptions().map((o) => ({ value: o.value, label: aeName(o.value) })))
const aeCaptionText = computed(() => (ticket.value
  ? [aeCaption(ticket.value), ticket.value.stage === 'Registration Request' && !ticket.value.ae ? t('Required to move to Data Validation.') : ''].filter(Boolean).join(' ')
  : ''))
const aeEditing = ref(false)
const aeDraft = ref('')
watch(() => props.ticketId, () => { aeEditing.value = false; aeDraft.value = '' })
/** The picker shows while editing, or straight away when no Account Owner is set yet (it's required). */
const aeOpen = computed(() => !!ticket.value && !locked.value && (aeEditing.value || !ticket.value.ae))
function startAeEdit() { if (!ticket.value) return; aeDraft.value = ticket.value.ae; aeEditing.value = true }
function cancelAe() { aeEditing.value = false; aeDraft.value = ''; if (footErrFor.value === 'ae') clearErr() }
function saveAe() {
  const tk = ticket.value
  if (!tk || locked.value) return
  if (!aeDraft.value) { footErr.value = t('Select an Account Owner.'); footErrFor.value = 'ae'; return }
  aeEditing.value = false
  if (aeDraft.value === tk.ae) return
  setTicketAe(tk.id, aeDraft.value)
  aeDraft.value = ''
  if (footErrFor.value === 'ae') clearErr()
  successToast(tr('Account Owner saved.'))
}

// ── Section checks (Data Validation) ────────────────────────────────────────
/** Section check is a one-click toggle: unchecked ↔ Valid (saved on the fly). */
function toggleCheck(key: SectionKey, title: string) {
  if (!ticket.value) return
  const on = ticket.value.checks[key] === 'Valid'
  setTicketCheck(ticket.value.id, key, (on ? '' : 'Valid') as CheckValue)
  clearErr()
  successToast(tr(on ? '{section} check removed.' : '{section} marked as valid.', { section: t(title) }))
}
const isCompany = computed(() => ticket.value?.entity === 'Company')

// ── ID file preview (NPWP / KTP) ─────────────────────────────────────────
const filePreview = reactive({ open: false, src: '', name: '' })
function openIdFile() {
  const tk = ticket.value
  if (!tk) return
  if (filePreview.src) URL.revokeObjectURL(filePreview.src)
  filePreview.src = idDocPdfUrl({ type: isCompany.value ? 'NPWP' : 'KTP', number: tk.idNo, name: tk.legal, address: [tk.addr, tk.city, tk.prov].filter(Boolean).join(', ') })
  filePreview.name = tk.idFile
  filePreview.open = true
}
function closeIdFile() { filePreview.open = false }

function sectionCheck(key: SectionKey): CheckValue { return ticket.value?.checks[key] ?? '' }

// ── Stage moves ───────────────────────────────────────────────────────────
function attempt(to: TicketStage) {
  if (!ticket.value) return
  const id = ticket.value.id
  const res = moveTicket(id, to)
  if (res.same) return
  if (!res.ok) {
    footErr.value = res.msg
    footErrFor.value = res.msg === tr('Assign an Account Owner before moving to Data Validation.') ? 'ae'
      : ''
    // A field-bound error shows once, under its field — bring that field into view.
    if (footErrFor.value) nextTick(() => document.getElementById('rtd-ae')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    return
  }
  clearErr()
  if (res.needs) { emit('needs', { kind: res.needs, id }); return }
  successToast(res.msg)
}
function onReject() { if (ticket.value) { clearErr(); emit('needs', { kind: 'reject', id: ticket.value.id }) } }

// ── Activity log (rule/activity-log-trigger) ──────────────────────────────
const logOpen = ref(false)
const logEntries = computed(() => (ticket.value ? ticketActivityEntries(ticket.value) : []))

function openPartner() {
  if (ticket.value?.partnerId) router.push(`/backoffice/partners/${ticket.value.partnerId}`)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rtd">
      <div v-if="open && ticket" class="rtd-overlay">
        <div class="rtd-panel" role="dialog" :aria-label="ticket.brand" data-devchange="bo-reg-ticket">
          <header class="rtd-header">
            <span class="rtd-title">
              <span class="rtd-title__text">{{ ticket.brand }}</span>
              <ErpStatusBadge badge-for="additionalInformation" :status="ticket.stage" :label="t(ticket.stage)" />
            </span>
            <MpButton class="rtd-close" variant="ghost" :aria-label="t('Close')" @click="emit('close')"><MpIcon name="close" size="md" /></MpButton>
          </header>

          <div class="rtd-body">
        <!-- Summary -->
        <section class="rtd-summary">
          <div class="rtd-facts">
            <ContentList v-for="f in facts" :key="f.label" :label="f.label" :value="f.value" />
            <!-- Account Owner — inline: name + edit, or the picker with [×] [✓] (saved on ✓) -->
            <div class="rtd-ae-fact" :class="{ 'is-editing': aeOpen }" data-devchange="bo-reg-ae-inline">
              <span>{{ t('Account Owner') }}</span>
              <template v-if="!aeOpen">
                <div class="rtd-ae-view">
                  <span class="rtd-ae-name">{{ ticket.ae ? aeName(ticket.ae) : '—' }}</span>
                  <MpTooltip v-if="!locked" id="rtd-ae-edit-tt" :label="t('Edit')" placement="top" use-portal>
                    <MpButton variant="ghost" is-rounded class="rtd-icon-btn" :aria-label="t('Edit Account Owner')" @click="startAeEdit">
                      <MpIcon name="edit" size="sm" />
                    </MpButton>
                  </MpTooltip>
                </div>
                <span v-if="aeCaptionText" class="rtd-caption">{{ aeCaptionText }}</span>
              </template>
              <MpFormControl v-else id="rtd-ae" :is-invalid="footErrFor === 'ae'">
                <div class="rtd-ae-edit">
                  <MpAutocomplete
                    id="rtd-ae-ac" :model-value="aeDraft" :data="aeOpts" label-prop="label" value-prop="value"
                    is-searchable use-portal is-full-width :placeholder="t('Select')" :is-invalid="footErrFor === 'ae'"
                    @update:model-value="(v: string) => { aeDraft = v || ''; if (footErrFor === 'ae') clearErr() }"
                  />
                  <MpTooltip v-if="ticket.ae" id="rtd-ae-cancel-tt" :label="t('Cancel')" placement="top" use-portal>
                    <MpButton variant="ghost" is-rounded class="rtd-icon-btn" :aria-label="t('Cancel')" @click="cancelAe">
                      <MpIcon name="close" size="sm" />
                    </MpButton>
                  </MpTooltip>
                  <MpTooltip id="rtd-ae-save-tt" :label="t('Save')" placement="top" use-portal>
                    <MpButton variant="ghost" is-rounded class="rtd-icon-btn rtd-icon-btn--save" :aria-label="t('Save')" @click="saveAe">
                      <MpIcon name="check" size="sm" />
                    </MpButton>
                  </MpTooltip>
                </div>
                <span v-if="aeCaptionText && footErrFor !== 'ae'" class="rtd-caption">{{ aeCaptionText }}</span>
                <MpFormErrorMessage>{{ footErrFor === 'ae' ? footErr : '' }}</MpFormErrorMessage>
              </MpFormControl>
            </div>
          </div>
          <a class="rtd-provenance" href="#" @click.prevent="logOpen = true">{{ prov.text }}</a>
        </section>

        <MpBanner v-if="ticket.stage === 'Rejected'" id="rtd-rejected-banner" variant="danger">
          <MpBannerIcon />
          <MpBannerTitle>{{ t('Rejected') }}</MpBannerTitle>
          <MpBannerDescription>{{ rejectedText(ticket) }}</MpBannerDescription>
        </MpBanner>
        <MpBanner v-if="ticket.stage === 'Completed'" id="rtd-completed-banner" variant="success" class="rtd-banner-success">
          <MpBannerIcon />
          <MpBannerTitle>{{ t('Completed') }}</MpBannerTitle>
          <MpBannerDescription>
            {{ completedText(ticket) }}
            <a v-if="ticket.partnerId" class="rtd-link" href="#" @click.prevent="openPartner">{{ t('Open partner') }}</a>
          </MpBannerDescription>
        </MpBanner>


        <!-- What's still needed to move on — info banner under Account Owner (not the footer) -->
        <MpBanner v-if="hint" id="rtd-hint" variant="info" data-devchange="bo-reg-hint-banner">
          <MpBannerIcon id="rtd-hint-icon" />
          <MpBannerDescription>{{ hint }}</MpBannerDescription>
        </MpBanner>

        <!-- J-06 Agreements -->
        <BoAgreementSection v-if="showAgreements" compact :owner="{ kind: 'ticket', id: ticket.id }" @changed="clearErr" />

        <!-- Data sections -->
        <section v-for="[key, title] in BO_SECTIONS" :key="key" class="rtd-card">
          <header class="rtd-card__head">
            <!-- Title + its result badge sit together (badge right after the title) -->
            <div class="rtd-card__title-wrap">
              <h3 class="rtd-card__title">{{ t(title) }}</h3>
              <ErpStatusBadge v-if="!isDV && sectionCheck(key)" :status="sectionCheck(key)" :label="t(sectionCheck(key))" />
              <ErpStatusBadge v-if="isDV && sectionCheck(key) === 'Invalid'" status="Invalid" :label="t('Invalid')" />
            </div>
            <div v-if="isDV" class="rtd-badges">
              <MpTooltip :id="`rtd-check-tt-${key}`" :label="sectionCheck(key) === 'Valid' ? t('Valid — click to undo') : t('Mark as valid')" placement="top" use-portal>
                <MpButton
                  variant="ghost" is-rounded class="rtd-check-btn" :class="{ 'is-on': sectionCheck(key) === 'Valid' }"
                  :aria-label="t('Mark as valid')" :aria-pressed="sectionCheck(key) === 'Valid'" data-devchange="bo-reg-checks"
                  @click="toggleCheck(key, title)"
                >
                  <MpIcon name="check" size="md" />
                </MpButton>
              </MpTooltip>
            </div>
          </header>

          <div class="rtd-rows">
            <template v-for="r in sectionRows(ticket, key)" :key="r.label">
              <!-- Uploaded ID file → text link that opens the file preview (with Download) -->
              <ContentList v-if="r.file && ticket.idFile" horizontal :label="r.label">
                <span class="rtd-file" role="button" tabindex="0" @click="openIdFile" @keydown.enter="openIdFile">{{ r.value }}</span>
              </ContentList>
              <ContentList v-else horizontal :label="r.label" :value="r.value" />
            </template>
          </div>
        </section>
          </div>

          <footer v-if="!locked" class="rtd-foot" data-devchange="bo-reg-ticket-footer">
        <span v-if="footErr && !footErrFor" class="rtd-foot__msg rtd-foot__msg--err" role="alert">{{ footErr }}</span>
        <div class="rtd-foot__actions">
          <MpButton variant="ghost" is-rounded @click="onReject">{{ t('Reject') }}</MpButton>
          <!-- Past Registration Request: one "Move to" button → popover with the next
               stage and every stage already passed (back moves). -->
          <MpPopover v-if="nav.back.length" id="rtd-move" placement="top-end" is-close-on-select use-portal :is-keep-alive="false">
            <MpPopoverTrigger>
              <MpButton variant="primary" is-rounded right-icon="chevrons-up" data-devchange="bo-reg-move-to">{{ t('Move to') }}</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent class="erp-dropdown-menu rtd-move-menu">
              <MpPopoverList>
                <template v-if="nav.next">
                  <span class="rtd-move-group">{{ t('Next stage') }}</span>
                  <MpPopoverListItem @click="attempt(nav.next!)">{{ t(nav.next) }}</MpPopoverListItem>
                </template>
                <span class="rtd-move-group">{{ t('Previous stages') }}</span>
                <MpPopoverListItem v-for="st in nav.back" :key="st" @click="attempt(st)">{{ t(st) }}</MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpButton v-else-if="nav.next" variant="primary" is-rounded @click="attempt(nav.next!)">{{ tr('Move to {stage}', { stage: t(nav.next) }) }}</MpButton>
        </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>

  <FilePreviewModal :open="filePreview.open" :src="filePreview.src" :filename="filePreview.name" kind="pdf" @close="closeIdFile" />
    <ActivityLogModal
    :is-open="logOpen && !!ticket"
    :subject="ticket ? `${ticket.id} · ${ticket.brand}` : ''"
    :entries="logEntries"
    @close="logOpen = false"
  />
</template>

<style scoped>
/* ── Drawer shell (rule/drawer-custom-shell) ── */
.rtd-enter-active, .rtd-leave-active { transition: background-color 250ms ease; }
.rtd-enter-from, .rtd-leave-to { background-color: transparent; }
.rtd-enter-active .rtd-panel { transition: transform 350ms ease-out; }
.rtd-leave-active .rtd-panel { transition: transform 250ms ease-in; }
.rtd-enter-from .rtd-panel, .rtd-leave-to .rtd-panel { transform: translateX(calc(100% + 12px)); }
.rtd-overlay { position: fixed; inset: 0; z-index: 1300; background: var(--mp-colors-overlay, rgba(8, 13, 14, 0.45)); display: flex; justify-content: flex-end; }
.rtd-panel { margin: var(--mp-spacing-3); width: min(720px, calc(100% - 24px)); height: calc(100% - 24px); display: flex; flex-direction: column; background: var(--mp-background-stage, #fff); border-radius: 12px; overflow: hidden; }
.rtd-header { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); padding: var(--mp-spacing-3) var(--mp-spacing-3) var(--mp-spacing-3) var(--mp-spacing-4); background: var(--mp-background-neutral-subtle, #f8f9f9); border-bottom: 1px solid var(--mp-border-default, #e3e7e9); }
.rtd-close { flex-shrink: 0; display: inline-flex !important; align-items: center; justify-content: center; width: 36px !important; height: 36px !important; min-width: 0 !important; padding: 0 !important; border: none !important; background: none !important; border-radius: var(--mp-radii-md); cursor: pointer; color: var(--mp-icon-default); }
.rtd-close:hover { background: var(--mp-background-neutral-hovered, #eef0f3) !important; }
.rtd-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--mp-spacing-5, 20px); padding: var(--mp-spacing-5) var(--mp-spacing-4); }

.rtd-title { display: inline-flex; align-items: center; gap: var(--mp-spacing-2); flex-wrap: wrap; min-width: 0; }
.rtd-title__text { font-size: var(--mp-font-sizes-lg); line-height: var(--mp-line-heights-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); overflow-wrap: anywhere; }

.rtd-summary { display: flex; flex-direction: column; gap: var(--mp-spacing-2); }
.rtd-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); column-gap: var(--mp-spacing-4); }
/* ContentList vertical metrics — its css() atomic classes aren't all generated in
   this Panda build (same pin as BoAgreementSection). 12px secondary label over 14px value. */
.rtd-facts > :deep(div) { display: flex; flex-direction: column; padding: var(--mp-spacing-2) 0; min-width: 0; }
.rtd-facts > :deep(div) > span:first-child { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.rtd-facts > :deep(div) > div { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); overflow-wrap: anywhere; }
.rtd-provenance { align-self: flex-start; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); color: var(--mp-text-link); text-decoration: none; cursor: pointer; }
.rtd-provenance:hover { text-decoration: underline; text-underline-offset: 2px; }
/* Pixel's success-banner fill isn't generated in this Panda build — pin it. */
.rtd-banner-success { background: var(--mp-background-brand-subtle, #e8f5f0); }
.rtd-link { margin-left: var(--mp-spacing-1); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-link); text-decoration: none; }
.rtd-link:hover { text-decoration: underline; text-underline-offset: 2px; }

/* Sections are separated by a divider, not boxed. */
.rtd-card {
  display: flex; flex-direction: column; gap: var(--mp-spacing-3);
  padding-top: var(--mp-spacing-5);
  border-top: 1px solid var(--mp-border-default, #e3e7e9);
}
/* Agreements (shared BoAgreementSection) follow the same divider layout here. */
.rtd-body :deep(.bas) { gap: var(--mp-spacing-5); }
.rtd-body :deep(.bas-card) { padding: var(--mp-spacing-5) 0 0; border: none; border-top: 1px solid var(--mp-border-default, #e3e7e9); border-radius: 0; background: transparent; }
.rtd-ae-view { display: flex; align-items: center; gap: var(--mp-spacing-1); min-width: 0; }
.rtd-ae-name { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); overflow-wrap: anywhere; }
.rtd-ae-edit { display: flex; align-items: center; gap: var(--mp-spacing-1); min-width: 0; }
.rtd-ae-edit > :first-child { flex: 1 1 auto; min-width: 0; }
.rtd-icon-btn { flex-shrink: 0; min-width: 32px !important; width: 32px; height: 32px; padding: 0 !important; }
.rtd-icon-btn--save { color: var(--mp-icon-success, #029861); }
.rtd-field { max-width: 320px; }
.rtd-rows > :deep(div.rtd-field-row) { align-items: center; }
.rtd-check-btn { min-width: 32px !important; width: 32px; height: 32px; padding: 0 !important; border: 1px solid var(--mp-border-bold, #8c9596) !important; color: var(--mp-icon-default, #536062); }
.rtd-check-btn.is-on { background: var(--mp-background-success-bold, #029861) !important; border-color: var(--mp-background-success-bold, #029861) !important; color: var(--mp-text-inverse, #fff); }
.rtd-check-btn.is-on :deep(svg) { color: var(--mp-text-inverse, #fff); }
.rtd-move-group { display: block; text-align: left; padding: var(--mp-spacing-2) var(--mp-spacing-3) var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.rtd-move-menu { min-width: 220px; }
.rtd-move-menu :deep(.mp-popover-list) { align-items: stretch; }
.rtd-move-group, .rtd-move-menu :deep(.mp-popover-list-item) { align-self: stretch; width: 100%; text-align: left; justify-content: flex-start; }
.rtd-file { color: var(--mp-text-link); cursor: pointer; overflow-wrap: anywhere; }
.rtd-file:hover, .rtd-file:focus-visible { text-decoration: underline; text-underline-offset: 2px; }
.rtd-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-3); flex-wrap: wrap; }
.rtd-card__title { margin: 0; font-size: var(--mp-font-sizes-lg); line-height: var(--mp-line-heights-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.rtd-card__title-wrap { display: flex; align-items: center; gap: var(--mp-spacing-2); flex-wrap: wrap; min-width: 0; }
.rtd-badges { display: flex; gap: var(--mp-spacing-2); flex-wrap: wrap; }
.rtd-caption { display: block; margin-top: var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.rtd-rows { display: flex; flex-direction: column; }
/* ContentList horizontal metrics (rule/content-list-horizontal) — pinned, see above. */
.rtd-rows > :deep(div) { display: flex; align-items: baseline; gap: var(--mp-spacing-6, 24px); padding: var(--mp-spacing-2) 0; }
.rtd-rows > :deep(div) > span:first-child { flex: 0 0 240px; min-width: 240px; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-lg); color: var(--mp-text-secondary); }
.rtd-rows > :deep(div) > div { flex: 1 1 auto; min-width: 0; font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-lg); color: var(--mp-text-default); overflow-wrap: anywhere; }
@media (max-width: 640px) {
  .rtd-rows > :deep(div) { flex-direction: column; gap: 0; }
  .rtd-rows > :deep(div) > span:first-child { flex: none; min-width: 0; font-size: var(--mp-font-sizes-sm); }
}

.rtd-foot { flex-shrink: 0; display: flex; align-items: center; gap: var(--mp-spacing-3); flex-wrap: wrap; padding: var(--mp-spacing-3) var(--mp-spacing-4); border-top: 1px solid var(--mp-border-default, #e3e7e9); }
.rtd-foot__msg { flex: 1 1 240px; min-width: 0; font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.rtd-foot__msg--err { color: var(--mp-text-danger); }
.rtd-foot__actions { display: flex; align-items: center; gap: var(--mp-spacing-2); margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
</style>
