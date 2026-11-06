<script setup lang="ts">
// I-10 Partner Account Owners (Roster Management).
import BoRosterPage from '~/components/backoffice/content/BoRosterPage.vue'
const { t } = useLocale()
useHead({ title: () => `Mekari Partner | ${t('Partner Account Owners')}` })
</script>

<template>
  <BoRosterPage kind="owners" />
</template>
