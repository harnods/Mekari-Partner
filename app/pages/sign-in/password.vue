<template>
  <AuthShell>
    <MpSpinner size="lg" />
  </AuthShell>
</template>

<script setup lang="ts">
// The password step is now inline on /sign-in (the field appears under the email
// once a registered address is entered), so this standalone route is retired.
// Kept only to redirect any lingering deep-link back to the sign-in page.
import { onMounted } from 'vue'
import { MpSpinner } from '@mekari/pixel3'

definePageMeta({ layout: 'blank' })

const router = useRouter()
onMounted(() => router.replace('/sign-in'))
</script>
