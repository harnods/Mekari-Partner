<script setup lang="ts">
/**
 * BoNotFound — the "record not found" reachable state for backoffice detail/edit
 * routes (docs/design/reachable-states.md › Not found). Same anatomy as the table
 * full empty state (rule/empty-state-structure): illustration + title + caption +
 * secondary button back to the list.
 */
import { MpButton } from '@mekari/pixel3'

defineProps<{ title: string; desc: string; backLabel?: string; backTo?: string }>()
const router = useRouter()
</script>

<template>
  <div class="empty-full bnf">
    <img :src="'/illustrations/empty-folder.png'" alt="" class="empty-illustration" width="288" height="240" />
    <p class="empty-full-title">{{ title }}</p>
    <p class="empty-full-desc">{{ desc }}</p>
    <MpButton v-if="backLabel && backTo" class="empty-full-btn" variant="secondary" is-rounded @click="router.push(backTo)">{{ backLabel }}</MpButton>
  </div>
</template>

<style scoped src="./bo-content.css"></style>
<style scoped>
.bnf { padding: var(--mp-spacing-10, 40px) 0; }
</style>
