<script setup lang="ts">
// I-07 Master agreement editor + I-09 status (+ L-02 deprecate). Unknown id → not-found state.
import BoMaForm from '~/components/backoffice/content/BoMaForm.vue'
const route = useRoute()
</script>

<template>
  <BoMaForm :id="String(route.params.id)" :key="String(route.params.id)" />
</template>
