<script setup lang="ts">
/**
 * BoMasterModal — I-02 "Master record" add / edit, driven by BO_MASTER_META:
 * Name (all, 60-char counter), Description (responsibilities + roles, 250-char
 * counter), Role responsibilities checklist (Partner Roles only). MpModal md,
 * close × only, ghost Cancel + primary Save / "Save changes", errors inline,
 * never disabled. Commits through saveMaster(); the parent raises the toast.
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpTextarea, MpCheckbox,
} from '@mekari/pixel3'
import { bo, BO_MASTER_META, saveMaster, type MasterKey, type BoMasterRecord } from '~/data/backoffice'

const props = defineProps<{ isOpen: boolean; mkey: MasterKey; idx: number }>()
const emit = defineEmits<{ close: []; saved: [msg: string] }>()
const { t } = useLocale()

const meta = computed(() => BO_MASTER_META[props.mkey])
const rec = ref<BoMasterRecord>({ name: '', desc: '', resp: [] })
const nameErr = ref('')
watch(() => [props.isOpen, props.idx, props.mkey] as const, ([open, idx]) => {
  if (!open) return
  const src = idx >= 0 ? bo.masters[props.mkey][idx] : undefined
  rec.value = { name: src?.name ?? '', desc: src?.desc ?? '', resp: [...(src?.resp ?? [])] }
  nameErr.value = ''
}, { immediate: true })

watch(() => rec.value.name, () => { nameErr.value = '' })

const isEdit = computed(() => props.idx >= 0)
const title = computed(() => `${isEdit.value ? t('Edit') : t('Add')} ${t(meta.value.singular)}`)
const responsibilities = computed(() => bo.masters.responsibilities)

function toggleResp(name: string) {
  const cur = rec.value.resp ?? []
  rec.value.resp = cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]
}

function save() {
  const res = saveMaster(props.mkey, props.idx, rec.value)
  if (!res.ok) { nameErr.value = res.errors?.name ?? ''; return }
  emit('saved', res.msg)
  emit('close')
}
</script>

<template>
  <MpModal
    id="bo-master-modal"
    :is-open="isOpen"
    size="md"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent data-devchange="bo-cfg-master-modal">
      <MpModalHeader>
        {{ title }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="bc-body">
          <MpFormControl id="bo-master-name" :is-invalid="!!nameErr">
            <div class="bc-lbl-row"><MpFormLabel>{{ t('Name') }}</MpFormLabel><span class="bc-counter">{{ rec.name.length }}/60</span></div>
            <MpInput id="bo-master-name-input" v-model="rec.name" maxlength="60" />
            <MpFormErrorMessage>{{ nameErr }}</MpFormErrorMessage>
          </MpFormControl>
          <MpFormControl v-if="meta.desc" id="bo-master-desc">
            <div class="bc-lbl-row"><MpFormLabel>{{ t('Description (optional)') }}</MpFormLabel><span class="bc-counter">{{ (rec.desc ?? '').length }}/250</span></div>
            <MpTextarea id="bo-master-desc-input" v-model="rec.desc" maxlength="250" is-full-width />
          </MpFormControl>
          <div v-if="meta.resp" class="bc-field">
            <span class="bc-label">{{ t('Role responsibilities') }}</span>
            <span class="bc-caption">{{ t('Each ticked responsibility applies to partners with this role.') }}</span>
            <ul class="bc-checklist" :style="{ marginTop: 'var(--mp-spacing-2)' }">
              <li v-for="r in responsibilities" :key="r.name">
                <MpCheckbox :id="`bo-master-resp-${r.name}`" :is-checked="(rec.resp ?? []).includes(r.name)" @change="toggleResp(r.name)">
                  <span class="bc-check-text">
                    <span class="bc-check-title">{{ r.name }}</span>
                    <span v-if="r.desc" class="bc-check-desc">{{ r.desc }}</span>
                  </span>
                </MpCheckbox>
              </li>
            </ul>
            <span v-if="!responsibilities.length" class="bc-caption">{{ t('Add responsibilities in Configurations first.') }}</span>
          </div>
        </div>
      </MpModalBody>
      <MpModalFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" is-rounded @click="emit('close')">{{ t('Cancel') }}</MpButton>
          <MpButton variant="primary" is-rounded @click="save">{{ isEdit ? t('Save changes') : t('Save') }}</MpButton>
        </MpButtonGroup>
      </MpModalFooter>
    </MpModalContent>
    <MpModalOverlay />
  </MpModal>
</template>

<style scoped src="./bo-content.css"></style>
