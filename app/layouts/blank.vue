<template>
  <!-- Chrome-less layout for the auth + partner-registration flow. No ERP
       header/sidebar — those pages own the full screen. The toast manager is
       mounted here so blank-layout pages can raise toasts (e.g. Draft saved). -->
  <div>
    <slot />
    <MpToastManager />
  </div>
</template>

<script setup lang="ts">
import { MpToastManager } from '@mekari/pixel3'
</script>
