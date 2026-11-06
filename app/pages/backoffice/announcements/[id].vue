<script setup lang="ts">
// O-03 Edit announcement (unknown id → not-found state inside the form).
import BoAnnouncementForm from '~/components/backoffice/content/BoAnnouncementForm.vue'
const route = useRoute()
</script>

<template>
  <BoAnnouncementForm :id="String(route.params.id)" :key="String(route.params.id)" />
</template>
