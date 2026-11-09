<script setup lang="ts">
/**
 * RegTicketCard — one registration ticket on the J-02 board (also rendered as the
 * floating drag ghost). Number + submitted date, brand, code · entity · product,
 * the stage note badge (ticketCardNote), then Source + Account Owner.
 * Unlocked cards show the drag grip (the whole card drags — RegBoard);
 * Completed / Rejected cards are locked and have none.
 */
import { computed } from 'vue'
import { MpIcon } from '@mekari/pixel3'
import ErpStatusBadge from '~/components/patterns/ErpStatusBadge.vue'
import { ticketCardNote, aeName, type BoTicket } from '~/data/backoffice'
import { formatDateLong } from '~/utils/date'
import { isLocked, noteBadgeType } from './regLogic'

const props = withDefaults(defineProps<{ ticket: BoTicket; ghost?: boolean; settling?: boolean }>(), { ghost: false, settling: false })
const { t } = useLocale()

const locked = computed(() => isLocked(props.ticket))
const note = computed(() => ticketCardNote(props.ticket))
const sub = computed(() => [props.ticket.code, t(props.ticket.entity), props.ticket.product].filter(Boolean).join(' · '))
</script>

<template>
  <div class="rtc" :class="{ 'rtc--ghost': ghost, 'rtc--settling': settling }">
    <div class="rtc-top">
      <span v-if="!locked" class="rtc-drag" aria-hidden="true">
        <MpIcon name="drag" size="sm" />
      </span>
      <span class="rtc-id">{{ ticket.id }}</span>
      <span class="rtc-date" data-devchange="bo-reg-card-type">{{ formatDateLong(ticket.date) }}</span>
    </div>
    <span class="rtc-brand">{{ ticket.brand }}</span>
    <span class="rtc-sub">{{ sub }}</span>
    <div v-if="note.note">
      <ErpStatusBadge status="ticket-note" :type="noteBadgeType(note.tone)" :label="note.note" />
    </div>
    <div class="rtc-foot">
      <span>{{ t('Source') }}: <span class="rtc-strong">{{ ticket.source || '—' }}</span></span>
      <!-- Unassigned is already the card's badge — don't say it twice -->
      <span v-if="ticket.ae" class="rtc-ae">{{ t('Account Owner') }}: {{ aeName(ticket.ae) }}</span>
    </div>
  </div>
</template>

<style scoped>
.rtc {
  display: flex; flex-direction: column; gap: var(--mp-spacing-2);
  padding: var(--mp-spacing-3);
  background: var(--mp-background-neutral, #fff);
  border: 1px solid var(--mp-border-default, #e3e7e9);
  border-radius: 8px;
}
.rtc-top { display: flex; align-items: center; gap: var(--mp-spacing-2); font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); }
.rtc-id { flex: 1; min-width: 0; }
.rtc-date { flex-shrink: 0; color: var(--mp-text-default); }
.rtc-drag {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  margin-left: calc(-1 * var(--mp-spacing-1)); color: var(--mp-icon-subtle, #97a0af);
  user-select: none; border-radius: var(--mp-radii-sm, 4px);
}
.rtc-brand { font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-md); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-default); overflow-wrap: anywhere; }
.rtc-sub { font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary); overflow-wrap: anywhere; }
.rtc-foot {
  display: flex; flex-direction: column; gap: 2px;
  padding-top: var(--mp-spacing-2); border-top: 1px solid var(--mp-border-default, #e3e7e9);
  font-size: var(--mp-font-sizes-sm); line-height: var(--mp-line-heights-sm); color: var(--mp-text-secondary);
}
.rtc-strong { font-weight: var(--mp-font-weights-regular); color: var(--mp-text-default); }
.rtc-ae { overflow-wrap: anywhere; }
/* Floating drag ghost — transient lift, the documented exception to
   rule/surface-border-no-shadow (rule/dnd-live-sortable §2). */
.rtc--ghost { box-shadow: 0 2px 6px rgba(8, 13, 14, 0.08); transform: rotate(-0.5deg); animation: rtc-lift 140ms cubic-bezier(0.2, 0, 0, 1); transition: transform 180ms cubic-bezier(0.2, 0, 0, 1), box-shadow 180ms ease; } /* pixel-police-allow-shadow — drag ghost */
.rtc--ghost.rtc--settling { transform: none; box-shadow: none; /* pixel-police-allow-shadow: clears the drag-ghost shadow */ }
@keyframes rtc-lift { from { transform: none; box-shadow: none; } /* pixel-police-allow-shadow: keyframe clears shadow */ }
</style>
