<script setup lang="ts">
// I-11 Trainers (Roster Management).
import BoRosterPage from '~/components/backoffice/content/BoRosterPage.vue'
const { t } = useLocale()
useHead({ title: () => `Mekari Partner | ${t('Trainers')}` })
</script>

<template>
  <BoRosterPage kind="trainers" />
</template>
