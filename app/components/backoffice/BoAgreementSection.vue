<script setup lang="ts">
/**
 * BoAgreementSection — the Agreements block shared by the registration ticket
 * (J-06, Agreement Drafting) and the partner detail Agreements tab (K-07).
 * Renders the "Partnership Agreement" and "Other agreements" sections for one
 * owner, with add / edit / edit-remarks / duplicate / delete flows wired to
 * app/data/backoffice.ts (BoAgreementModal + ConfirmModal live inside).
 *
 *   <BoAgreementSection :owner="{ kind: 'ticket', id: t.id }" />
 *   <BoAgreementSection :owner="{ kind: 'partner', id: p.id }" @changed="…" />
 *
 * Props
 *   owner     { kind: 'ticket' | 'partner', id }
 *   sections  which sections to render (default both: ['pa', 'other'])
 *   readOnly  force read-only (default: tickets are editable only in Agreement Drafting; partners always)
 * Emits
 *   changed(msg)  after any successful mutation (the success toast is already raised)
 *
 * Row actions (design rowActions): ticket → Edit / Remove (Agreement Drafting only);
 * partner → PENDING: Edit / Delete, COMPLETED/EXPIRED: Edit remarks; + Duplicate.
 * A registration holds at most ONE Partnership Agreement — the New button stays
 * clickable and explains inline (rule/btn-no-disabled-validation).
 */
import { ref, computed } from 'vue'
import { MpButton, MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem } from '@mekari/pixel3'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import ConfirmModal from '~/components/patterns/ConfirmModal.vue'
import BoAgreementModal from '~/components/backoffice/BoAgreementModal.vue'
import {
  type BoOwner, type AgSection, type AgRowAction, type AgRowView, type BoAgDraft,
  agreementRowsView, ownerEditable, blankAgDraft, draftFromRow, duplicateDraft, removeAgreement, rowsOf,
} from '~/data/backoffice'
import { successToast } from '~/utils/toasts'

const props = withDefaults(defineProps<{
  owner: BoOwner
  sections?: AgSection[]
  readOnly?: boolean | null
}>(), { sections: () => ['pa', 'other'], readOnly: null })
const emit = defineEmits<{ changed: [msg: string] }>()
const { t } = useLocale()

const editable = computed(() => (props.readOnly === null ? ownerEditable(props.owner) : !props.readOnly))
const isTicket = computed(() => props.owner.kind === 'ticket')

const SECTION_META: Record<AgSection, { title: string; empty: string; caption: string }> = {
  pa: { title: 'Partnership Agreement', empty: 'No Partnership Agreement yet', caption: 'Lists ACTIVE PRIMARY master agreements.' },
  other: { title: 'Other agreements', empty: 'No other agreements yet', caption: 'Lists ACTIVE OTHERS master agreements.' },
}
const views = computed(() => Object.fromEntries(props.sections.map((s) => [s, agreementRowsView(props.owner, s)])) as Record<AgSection, AgRowView[]>)

// ── Expand / collapse rows (click anywhere on the row header) ──────────────
const open = ref<Set<string>>(new Set())
function toggle(id: string) { const s = new Set(open.value); s.has(id) ? s.delete(id) : s.add(id); open.value = s }

// ── Add (ticket: at most one Partnership Agreement) ────────────────────────
const addErr = ref<Partial<Record<AgSection, string>>>({})
function onAdd(section: AgSection) {
  if (isTicket.value && section === 'pa' && rowsOf(props.owner).some((r) => r.section === 'pa')) {
    addErr.value = { ...addErr.value, pa: t('A registration has at most one Partnership Agreement document. Edit or remove the existing one.') }
    return
  }
  addErr.value = {}
  openModal(blankAgDraft(props.owner, section))
}

// ── Modal ─────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const draft = ref<BoAgDraft | null>(null)
function openModal(d: BoAgDraft) { draft.value = d; modalOpen.value = true }
function onSaved(msg: string) { successToast(msg); emit('changed', msg) }

// ── Row actions ───────────────────────────────────────────────────────────
const ACTION_LABEL: Record<AgRowAction, string> = { edit: 'Edit', remove: 'Remove', delete: 'Delete', editRemarks: 'Edit remarks', duplicate: 'Duplicate' }
const confirmRow = ref<AgRowView | null>(null)
const confirmOpen = ref(false)
function onAction(v: AgRowView, a: AgRowAction) {
  addErr.value = {}
  if (a === 'edit') openModal(draftFromRow(props.owner, v.row))
  else if (a === 'editRemarks') openModal(draftFromRow(props.owner, v.row, true))
  else if (a === 'duplicate') openModal(duplicateDraft(props.owner, v.row))
  else { confirmRow.value = v; confirmOpen.value = true }
}
const confirmIsRemove = computed(() => isTicket.value)
function onConfirmDelete() {
  if (!confirmRow.value) return
  const res = removeAgreement(props.owner, confirmRow.value.row.id)
  successToast(res.msg)
  emit('changed', res.msg)
  confirmRow.value = null
}
</script>

<template>
  <div class="bas" data-devchange="bo-agreement-section">
    <section v-for="s in sections" :key="s" class="bas-card">
      <header class="bas-head">
        <div class="bas-head__text">
          <h3 class="bas-title">{{ t(SECTION_META[s].title) }}</h3>
          <span class="bas-caption">
            {{ t(SECTION_META[s].caption) + (isTicket && !editable ? ' ' + t('Read-only outside Agreement Drafting.') : '') }}
          </span>
        </div>
        <MpButton v-if="editable && views[s].length" variant="secondary" is-rounded left-icon="add" @click="onAdd(s)">{{ t('New document') }}</MpButton>
      </header>
      <span v-if="addErr[s]" class="bas-err">{{ addErr[s] }}</span>

      <!-- Empty — rule/empty-state-structure (compact, in-section) -->
      <div v-if="!views[s].length" class="bas-empty">
        <img src="/illustrations/empty-folder.png" alt="" class="bas-empty__art" />
        <span class="bas-empty__title">{{ t(SECTION_META[s].empty) }}</span>
        <span class="bas-caption">{{ editable ? t('Add a document to track its signing status.') : t('Documents appear here once added.') }}</span>
        <MpButton v-if="editable" variant="secondary" is-rounded @click="onAdd(s)">{{ t('New document') }}</MpButton>
      </div>

      <!-- Documents stack as one joined accordion group (shared border, divider between) -->
      <div v-if="views[s].length" class="bas-list">
      <div v-for="v in views[s]" :key="v.row.id" class="bas-row" :class="{ 'is-open': open.has(v.row.id) }">
        <div class="bas-row__head" role="button" :aria-expanded="open.has(v.row.id)" @click="toggle(v.row.id)">
          <MpIcon name="chevrons-down" size="sm" class="bas-chevron" />
          <div class="bas-row__name">
            <span class="bas-row__title">{{ v.name }}</span>
            <span class="bas-caption">{{ v.meta }}</span>
          </div>
          <ErpStatusBadge :status="v.status" />
          <div v-if="v.actions.length" class="bas-row__actions" @click.stop>
            <MpPopover :id="`bas-act-${v.row.id}`" is-close-on-select use-portal :is-keep-alive="false" placement="bottom-end">
              <MpPopoverTrigger>
                <MpButton variant="ghost" is-rounded class="row-kebab" :aria-label="t('Document actions')">
                  <MpIcon name="menu-kebab" size="md" />
                </MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent class="erp-dropdown-menu">
                <MpPopoverList>
                  <MpPopoverListItem v-for="a in v.actions" :key="a" @click="onAction(v, a)">{{ t(ACTION_LABEL[a]) }}</MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </MpPopover>
          </div>
        </div>
        <div v-if="open.has(v.row.id)" class="bas-row__details">
          <ContentList v-for="dt in v.details" :key="dt.label" horizontal :label="dt.label">
            <a v-if="dt.href" :href="dt.href" target="_blank" rel="noopener" class="bas-link">{{ dt.value }}</a>
            <template v-else>{{ dt.value }}</template>
          </ContentList>
        </div>
      </div>
      </div>
    </section>

    <BoAgreementModal :is-open="modalOpen" :draft="draft" @close="modalOpen = false" @saved="onSaved" />
    <ConfirmModal
      v-model:is-open="confirmOpen"
      :title="confirmIsRemove ? t('Remove document?') : t('Delete document?')"
      :description="confirmIsRemove ? t('The document is removed from this registration. The linked Mekari Sign document is not changed.') : t('Deleted document cannot be restored.')"
      :confirm-label="confirmIsRemove ? t('Remove document') : t('Delete document')"
      :cancel-label="t('Cancel')"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.bas { display: flex; flex-direction: column; gap: var(--mp-spacing-4); }
.bas-card {
  display: flex; flex-direction: column; gap: var(--mp-spacing-3);
  padding: var(--mp-spacing-5);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: var(--mp-radii-lg, 12px);
  background: var(--mp-background-stage, #ffffff);
}
.bas-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--mp-spacing-3); flex-wrap: wrap; }
.bas-head__text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.bas-title { margin: 0; font-size: var(--mp-font-sizes-lg); line-height: var(--mp-line-heights-lg); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }
.bas-caption { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.bas-err { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-danger); }

.bas-empty { display: flex; flex-direction: column; align-items: center; gap: var(--mp-spacing-2); padding: var(--mp-spacing-4) 0; text-align: center; }
.bas-empty__art { width: 96px; height: auto; }
.bas-empty__title { font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); }

.bas-list { border: 1px solid var(--mp-border-default, #e3e7e9); border-radius: var(--mp-radii-md, 6px); overflow: hidden; }
.bas-row + .bas-row { border-top: 1px solid var(--mp-border-default, #e3e7e9); }
.bas-row__head {
  display: flex; align-items: center; gap: var(--mp-spacing-3);
  padding: var(--mp-spacing-3) var(--mp-spacing-4);
  cursor: pointer;
  transition: background-color 100ms;
}
.bas-row__head:hover { background: var(--mp-background-neutral-hovered, #f8f9f9); }
.bas-chevron { flex-shrink: 0; transform: rotate(-90deg); transition: transform 150ms; }
.bas-row.is-open .bas-chevron { transform: rotate(0deg); }
.bas-row__name { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.bas-row__title { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); overflow-wrap: anywhere; }
.bas-row__actions { flex-shrink: 0; }
.bas-row__details { padding: 0 var(--mp-spacing-4) var(--mp-spacing-2) calc(var(--mp-spacing-4) + var(--mp-spacing-4) + var(--mp-spacing-3)); border-top: 1px solid var(--mp-border-default, #e3e7e9); }
/* ContentList horizontal metrics (rule/content-list-horizontal). Its css()
   atomic classes (mp-d_flex, mp-c_text.secondary, …) are not generated in this
   Panda build, so the row renders stacked/black — pin the documented metrics. */
.bas-row__details > :deep(div) { display: flex; align-items: baseline; gap: var(--mp-spacing-6, 24px); }
.bas-row__details > :deep(div) > span:first-child { flex: 0 0 184px; min-width: 184px; color: var(--mp-text-secondary); }
.bas-row__details > :deep(div) > div { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
@media (max-width: 640px) {
  .bas-row__details > :deep(div) { flex-direction: column; gap: 0; }
  .bas-row__details > :deep(div) > span:first-child { flex: none; min-width: 0; font-size: var(--mp-font-sizes-sm); }
}
.bas-link { color: var(--mp-text-link); text-decoration: none; overflow-wrap: anywhere; }
.bas-link:hover { text-decoration: underline; text-underline-offset: 2px; }
</style>
