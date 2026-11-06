<script setup lang="ts">
// I-02 Configurations master pages — /backoffice/configurations/<professions|specializations|responsibilities|roles|products>.
// (master-agreements/ is its own folder and wins over this dynamic route.)
import { computed } from 'vue'
import BoPage from '~/components/backoffice/BoPage.vue'
import BoMasterPage from '~/components/backoffice/content/BoMasterPage.vue'
import BoNotFound from '~/components/backoffice/content/BoNotFound.vue'
import { BO_MASTER_META, type MasterKey } from '~/data/backoffice'

const { t } = useLocale()
const route = useRoute()
const mkey = computed(() => String(route.params.key) as MasterKey)
const known = computed(() => mkey.value in BO_MASTER_META)
useHead({ title: () => `Mekari Partner | ${known.value ? t(BO_MASTER_META[mkey.value].title) : t('Configurations')}` })
</script>

<template>
  <BoMasterPage v-if="known" :mkey="mkey" />
  <BoPage v-else :title="t('Configurations')">
    <BoNotFound :title="t('This configuration does not exist')" :desc="t('Pick a list from Configurations in the sidebar.')" />
  </BoPage>
</template>
