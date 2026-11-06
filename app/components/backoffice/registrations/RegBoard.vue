<script setup lang="ts">
/**
 * RegBoard — the J-02 registration kanban: five stage columns (name, info
 * tooltip with the stage caption, count) with ticket cards. Mirrors the CRM Deals board look (full-width neutral
 * swimlanes, white 8px cards) and moves cards with a pointer-based sortable
 * drag (no native HTML5 DnD):
 *   • press anywhere on an unlocked card and move 4px → the card lifts into a
 *     floating ghost that follows the cursor; its own slot stays behind as a
 *     gray placeholder (a plain click still opens the ticket);
 *   • over any column a gray drop slot opens at the pointer and the cards below
 *     slide down to make room (a blocked column also shows its reason); over its own
 *     column the placeholder itself moves (reorder). Swimlane colours never
 *     change — a blocked column only shows its reason inline under the title;
 *   • releasing glides the ghost into the slot, then emits `drop` with the
 *     column's new order (the page calls moveTicket / opens the modal, and
 *     shows a blocked drop's reason inline above the board — never a toast).
 * Completed / Rejected cards are locked: no handle, not draggable.
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { MpIcon, MpTooltip } from '@mekari/pixel3'
import RegTicketCard from './RegTicketCard.vue'
import { BO_STAGE_CAPTION, getTicket, type BoTicket, type TicketStage } from '~/data/backoffice'
import { dropFeedback, isLocked } from './regLogic'

export interface RegColumn { stage: TicketStage; tickets: BoTicket[] }
type Item = { kind: 'card'; tk: BoTicket } | { kind: 'slot' }

const props = withDefaults(defineProps<{ columns: RegColumn[]; loading?: boolean }>(), { loading: false })
const emit = defineEmits<{ open: [id: string]; drop: [payload: { id: string; to: TicketStage; order: string[] }] }>()
const { t } = useLocale()

// ── Pointer drag ────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 4
const SETTLE_MS = 180
const dragId = ref<string | null>(null)
const fromStage = ref<TicketStage | null>(null)
const fromIndex = ref(0)
const overStage = ref<TicketStage | null>(null)
const overIndex = ref(0)
const ghost = ref<{ x: number; y: number; w: number; h: number; settling: boolean } | null>(null)
const colEls = ref<Record<string, HTMLElement>>({})
const boardEl = ref<HTMLElement | null>(null)
function setColEl(stage: string, el: unknown) { if (el) colEls.value[stage] = el as HTMLElement }

const dragTicket = computed(() => (dragId.value ? getTicket(dragId.value) ?? null : null))
const feedback = computed(() => (dragTicket.value && overStage.value ? dropFeedback(dragTicket.value, overStage.value) : null))
/** Column the card would land in right now (its own column counts), or null. */
const target = computed<TicketStage | null>(() =>
  feedback.value && feedback.value.state !== 'blocked' ? overStage.value : null)

let grabDX = 0
let grabDY = 0
let cleanup: (() => void) | null = null
let suppressClick = false
let settleTimer: ReturnType<typeof setTimeout> | null = null

function stageAt(x: number, y: number): TicketStage | null {
  for (const col of props.columns) {
    const el = colEls.value[col.stage]
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col.stage
  }
  return null
}

/** Insertion index in `stage` for pointer y: before the first card whose middle is below it. */
function indexAt(stage: TicketStage, y: number): number {
  const el = colEls.value[stage]
  if (!el) return 0
  const cards = [...el.querySelectorAll<HTMLElement>('.rb-card:not(.is-dragging):not(.rb-card-leave-active)')]
  let i = 0
  for (const c of cards) {
    const r = c.getBoundingClientRect()
    if (y < r.top + r.height / 2) break
    i++
  }
  return i
}

/** What a column renders: its cards, with the gray slot / dragged placeholder spliced in. */
function itemsFor(col: RegColumn): Item[] {
  const id = dragId.value
  const cards: Item[] = col.tickets.filter((tk) => tk.id !== id).map((tk) => ({ kind: 'card', tk }))
  if (!id) return cards
  if (col.stage === fromStage.value) {
    const tk = col.tickets.find((x) => x.id === id)
    if (!tk) return cards
    const at = overStage.value === col.stage ? overIndex.value : fromIndex.value
    cards.splice(Math.min(at, cards.length), 0, { kind: 'card', tk })
  } else if (overStage.value === col.stage) {
    // Open the gap in any column under the pointer (even a blocked one), so the
    // landing spot is always visible; a blocked drop then glides back home.
    cards.splice(Math.min(overIndex.value, cards.length), 0, { kind: 'slot' })
  }
  return cards
}

function onPointerDown(tk: BoTicket, e: PointerEvent) {
  if (e.button !== 0 || isLocked(tk) || ghost.value) return
  const card = e.currentTarget as HTMLElement
  const sx = e.clientX
  const sy = e.clientY
  let started = false

  const begin = () => {
    started = true
    const r = card.getBoundingClientRect()
    grabDX = sx - r.left
    grabDY = sy - r.top
    const col = props.columns.find((c) => c.stage === tk.stage)
    fromStage.value = tk.stage
    fromIndex.value = Math.max(0, col?.tickets.findIndex((x) => x.id === tk.id) ?? 0)
    overStage.value = tk.stage
    overIndex.value = fromIndex.value
    ghost.value = { x: r.left, y: r.top, w: r.width, h: r.height, settling: false }
    dragId.value = tk.id
  }

  const onMove = (ev: PointerEvent) => {
    if (!started) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return
      begin()
    }
    const g = ghost.value
    if (!g || g.settling) return
    ev.preventDefault()
    g.x = ev.clientX - grabDX
    g.y = ev.clientY - grabDY
    const stage = stageAt(ev.clientX, ev.clientY)
    overStage.value = stage
    if (stage) overIndex.value = indexAt(stage, ev.clientY)
    // Edge auto-scroll so off-screen columns (e.g. Rejected) stay reachable.
    const b = boardEl.value
    if (b) {
      const r = b.getBoundingClientRect()
      if (ev.clientX > r.right - 48) b.scrollLeft += 12
      else if (ev.clientX < r.left + 48) b.scrollLeft -= 12
    }
  }
  const onUp = () => {
    unlisten()
    if (!started) return
    suppressClick = true
    setTimeout(() => { suppressClick = false }, 0)
    settle()
  }
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && started) { overStage.value = null; unlisten(); settle() } }
  const unlisten = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('keydown', onKey)
    cleanup = null
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('keydown', onKey)
  cleanup = unlisten
}

/** Glide the ghost into its landing spot (drop slot, or back home), then commit. */
function settle() {
  const g = ghost.value
  const id = dragId.value
  if (!g || !id) { reset(); return }
  const blockedAt = feedback.value?.state === 'blocked' ? overStage.value : null
  const tgt = target.value
  const landing = tgt && tgt !== fromStage.value
    ? colEls.value[tgt]?.querySelector<HTMLElement>('.rb-slot')
    : colEls.value[fromStage.value!]?.querySelector<HTMLElement>('.rb-card.is-dragging')
  // Order of the landing column with the card at the slot.
  const col = tgt ? props.columns.find((c) => c.stage === tgt) : undefined
  const order = col ? itemsFor(col).map((it) => (it.kind === 'card' ? it.tk.id : id)) : []
  const commit = () => {
    reset()
    if (tgt) emit('drop', { id, to: tgt, order })
    else if (blockedAt) emit('drop', { id, to: blockedAt, order: [] }) // page explains why, inline
  }
  if (landing) {
    const r = landing.getBoundingClientRect()
    g.settling = true
    g.x = r.left
    g.y = r.top
    settleTimer = setTimeout(commit, SETTLE_MS)
  } else commit()
}
function reset() {
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null }
  dragId.value = null; fromStage.value = null; overStage.value = null; ghost.value = null
}
onBeforeUnmount(() => { cleanup?.(); reset() })

function onClick(id: string) {
  if (suppressClick) return
  emit('open', id)
}
</script>

<template>
  <div ref="boardEl" class="rb" :class="{ 'rb--dragging': !!dragId, 'rb--blocked': feedback?.state === 'blocked' }" data-devchange="bo-reg-board">
    <section
      v-for="col in columns"
      :key="col.stage"
      :ref="(el) => setColEl(col.stage, el)"
      class="rb-col"
      :aria-label="t(col.stage)"
    >
      <header class="rb-col-head">
        <div class="rb-col-title-row">
          <span class="rb-col-title">{{ t(col.stage) }}</span>
          <MpTooltip :id="`rb-cap-${col.stage}`" :label="t(BO_STAGE_CAPTION[col.stage])" placement="top" use-portal>
            <span class="rb-col-info" tabindex="0" :aria-label="t(BO_STAGE_CAPTION[col.stage])">
              <MpIcon name="info" size="sm" />
            </span>
          </MpTooltip>
          <span class="rb-col-count">{{ loading ? '—' : col.tickets.length }}</span>
        </div>
        <span v-if="overStage === col.stage && feedback?.state === 'blocked'" class="rb-col-reason" role="alert">{{ feedback.msg }}</span>
      </header>

      <div class="rb-col-body">
        <template v-if="loading">
          <div v-for="n in 3" :key="n" class="rb-skeleton" />
        </template>
        <template v-else>
          <TransitionGroup name="rb-card" tag="div" class="rb-cards">
            <template v-for="it in itemsFor(col)" :key="it.kind === 'slot' ? '__slot__' : it.tk.id">
              <div v-if="it.kind === 'slot'" class="rb-slot" :style="{ height: (ghost?.h ?? 0) + 'px' }" />
              <article
                v-else
                class="rb-card"
                :class="{ 'is-dragging': dragId === it.tk.id, 'is-locked': isLocked(it.tk) }"
                :style="dragId === it.tk.id && ghost ? { height: ghost.h + 'px' } : undefined"
                role="button"
                tabindex="0"
                :aria-label="`${it.tk.id} ${it.tk.brand}`"
                @pointerdown="onPointerDown(it.tk, $event)"
                @click="onClick(it.tk.id)"
                @keydown.enter="emit('open', it.tk.id)"
              >
                <RegTicketCard :ticket="it.tk" />
              </article>
            </template>
          </TransitionGroup>
          <p v-if="!col.tickets.length && !(overStage === col.stage && dragId)" class="rb-col-empty">{{ t('No tickets') }}</p>
        </template>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="ghost && dragTicket"
        class="rb-ghost"
        :class="{ 'is-settling': ghost.settling }"
        :style="{ width: ghost.w + 'px', transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0)` }"
      >
        <RegTicketCard :ticket="dragTicket" ghost :settling="ghost.settling" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rb { display: flex; gap: var(--mp-spacing-3); align-items: stretch; flex: 1; min-height: 480px; overflow-x: auto; padding-bottom: var(--mp-spacing-3); }
.rb--dragging, .rb--dragging * { user-select: none; cursor: grabbing !important; }
.rb--blocked, .rb--blocked * { cursor: not-allowed !important; }
.rb-col {
  flex: 1 1 0; min-width: 200px; display: flex; flex-direction: column; min-height: 0;
  background: var(--mp-background-neutral-subtle, #f4f5f7);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: 12px;
}
.rb-col-head { display: flex; flex-direction: column; gap: 2px; padding: var(--mp-spacing-3) var(--mp-spacing-3) var(--mp-spacing-2); }
.rb-col-title-row { display: flex; align-items: center; gap: var(--mp-spacing-1); }
.rb-col-title { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rb-col-count { flex-shrink: 0; margin-left: var(--mp-spacing-1); font-size: var(--mp-font-sizes-sm); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-secondary); background: var(--mp-background-neutral, #fff); border-radius: 999px; padding: 1px 8px; }
.rb-col-info { display: inline-flex; flex-shrink: 0; color: var(--mp-icon-subtle, #97a0af); cursor: help; border-radius: 999px; }
.rb-col-info:hover, .rb-col-info:focus-visible { color: var(--mp-icon-default, #536062); }
.rb-col-reason { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-danger, #c9372c); }
.rb-col-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: var(--mp-spacing-2); padding: 0 var(--mp-spacing-2) var(--mp-spacing-2); }
.rb-cards { position: relative; display: flex; flex-direction: column; gap: var(--mp-spacing-2); }
.rb-card { border-radius: 8px; cursor: grab; }
.rb-card.is-locked { cursor: pointer; }
.rb-card :deep(.rtc) { transition: border-color 100ms; }
.rb-card:hover :deep(.rtc) { border-color: var(--mp-border-bold, #8c9596); }
.rb--dragging .rb-card:hover :deep(.rtc) { border-color: var(--mp-border-default, #e3e7e9); }
.rb-card:focus-visible { outline: 2px solid var(--mp-border-brand, #0a6e4e); outline-offset: 1px; }
/* Dragged card's own slot and the drop slot → the same gray placeholder (size kept, content hidden). */
.rb-card.is-dragging, .rb-slot { flex-shrink: 0; border-radius: 8px; background: var(--mp-border-default, #e3e7e9); }
.rb-card.is-dragging :deep(.rtc) { visibility: hidden; }
.rb-col-empty { margin: 0; padding: var(--mp-spacing-4) 0; text-align: center; font-size: var(--mp-font-sizes-sm); color: var(--mp-text-secondary); }
/* rule/skeleton-solid-static + rule/skeleton-3-rows */
.rb-skeleton { height: 112px; border-radius: 8px; background-color: var(--mp-border-default, #e3e7e9); }

.rb-ghost { position: fixed; left: 0; top: 0; z-index: 3000; pointer-events: none; will-change: transform; }
.rb-ghost.is-settling { transition: transform 180ms cubic-bezier(0.2, 0, 0, 1); }

.rb-card-move { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1); }
.rb-card-enter-active, .rb-card-leave-active { transition: opacity 120ms ease; }
.rb-card-enter-from, .rb-card-leave-to { opacity: 0; }
.rb-card-leave-active { position: absolute; left: 0; right: 0; }
</style>
