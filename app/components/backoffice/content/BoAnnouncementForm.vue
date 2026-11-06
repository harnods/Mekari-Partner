<script setup lang="ts">
/**
 * BoAnnouncementForm — O-02 Create / O-03 Edit announcement (form page).
 * docs/patterns/Form.md: 6-col max 558px, stacked fields (rule/form-field-stacking),
 * char counters (rule/input-char-counter), no placeholders, errors inline on Save
 * (rule/form-errors-inline, rule/btn-no-disabled-validation), footer
 * MpButtonGroup.erp-action-footer ghost Cancel + primary (rule/btn-responsive-footer).
 * Create primary = "Post announcement" (posting publishes straight away); edit =
 * "Save changes" (rule/form-edit-save-changes). Unknown id → BoNotFound.
 */
import { ref, computed } from 'vue'
import {
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea,
} from '@mekari/pixel3'
import BoPage from '~/components/backoffice/BoPage.vue'
import ContentList from '~/components/patterns/ContentList.vue'
import BoRichText from './BoRichText.vue'
import BoNotFound from './BoNotFound.vue'
import { successToast } from '~/utils/toasts'
import { formatDateTimeLong } from '~/utils/date'
import { getAnnouncement, saveAnnouncement, announcementErrors, type BoAnnouncementDraft } from '~/data/backoffice'

const props = defineProps<{ id: string | null }>()
const { t } = useLocale()
const router = useRouter()

const saved = computed(() => (props.id ? getAnnouncement(props.id) : undefined))
const notFound = computed(() => !!props.id && !saved.value)
const isEdit = computed(() => !!saved.value)

const d = ref<BoAnnouncementDraft>({
  id: saved.value?.id ?? null,
  title: saved.value?.title ?? '',
  desc: saved.value?.desc ?? '',
  content: saved.value?.content ?? '',
})
const tried = ref(false)
const errors = computed(() => announcementErrors(d.value))
const err = (k: 'title' | 'desc' | 'content') => (tried.value ? errors.value[k] ?? '' : '')

const back = () => router.push('/backoffice/announcements')
function save() {
  const res = saveAnnouncement(d.value)
  if (!res.ok) { tried.value = true; return }
  successToast(res.msg)
  back()
}
const pageTitle = computed(() => (notFound.value ? t('Announcement') : isEdit.value ? t('Edit announcement') : t('New announcement')))
useHead({ title: () => `Mekari Partner | ${pageTitle.value}` })
</script>

<template>
  <BoPage :title="pageTitle" :breadcrumb="{ label: t('Announcements'), to: '/backoffice/announcements' }">
    <BoNotFound
      v-if="notFound"
      :title="t('Announcement not found')"
      :desc="t('It may have been deleted. Go back to the list to see current announcements.')"
      :back-label="t('Back to announcements')"
      back-to="/backoffice/announcements"
    />
    <template v-else>
      <p class="bo-lead">{{ isEdit ? t('Title, short description and content can be edited.') : t('All fields are required. Posting publishes the announcement to partners straight away.') }}</p>
      <div class="bf-form" data-devchange="bo-ann-editor">
        <MpFormControl id="bo-ann-title" :is-invalid="!!err('title')">
          <div class="bc-lbl-row"><MpFormLabel>{{ t('Title') }}</MpFormLabel><span class="bc-counter">{{ d.title.length }}/100</span></div>
          <MpInput id="bo-ann-title-input" v-model="d.title" maxlength="100" />
          <MpFormErrorMessage>{{ err('title') }}</MpFormErrorMessage>
        </MpFormControl>
        <MpFormControl id="bo-ann-desc" :is-invalid="!!err('desc')">
          <div class="bc-lbl-row"><MpFormLabel>{{ t('Short description') }}</MpFormLabel><span class="bc-counter">{{ d.desc.length }}/250</span></div>
          <MpTextarea id="bo-ann-desc-input" v-model="d.desc" maxlength="250" is-full-width />
          <span class="bc-caption">{{ t('Shown in the announcement list.') }}</span>
          <MpFormErrorMessage>{{ err('desc') }}</MpFormErrorMessage>
        </MpFormControl>
        <div class="bc-field">
          <span class="bc-label">{{ t('Content') }}</span>
          <BoRichText id="bo-ann-content" v-model="d.content" :is-invalid="!!err('content')" :aria-label="t('Content')" />
          <span v-if="err('content')" class="bc-err">{{ err('content') }}</span>
        </div>
        <div v-if="isEdit && saved">
          <ContentList :label="t('Posted at')" :value="formatDateTimeLong(saved.postedAt)" />
          <span class="bc-caption">{{ t('Set when the announcement was posted. Editing does not change it.') }}</span>
        </div>
      </div>
      <div class="bf-footer">
        <MpButtonGroup class="erp-action-footer">
          <MpButton variant="ghost" is-rounded @click="back">{{ t('Cancel') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="save">{{ isEdit ? t('Save changes') : t('Post announcement') }}</MpButton>
        </MpButtonGroup>
      </div>
    </template>
  </BoPage>
</template>

<style scoped src="./bo-content.css"></style>
