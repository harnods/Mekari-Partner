<script setup lang="ts">
/**
 * BoRosterModal — I-10 "Roster record" add / edit (Partner Account Owners, Trainers).
 * MpModal md, close × only (rule/modal-drawer-close-explicit-only), ghost Cancel +
 * primary Save / "Save changes" (rule/form-edit-save-changes), never disabled
 * (rule/btn-no-disabled-validation), errors inline (rule/form-errors-inline), products
 * via MpInputTag with suggestions (rule/select-multi-mpinputtag), 60-char counter on
 * Name (rule/input-char-counter), no placeholders (rule/input-no-placeholder).
 * Commits through saveRosterPerson(); the parent raises the success toast.
 */
import { ref, computed, watch } from 'vue'
import {
  MpModal, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalOverlay, MpModalCloseButton,
  MpButton, MpButtonGroup, MpFormControl, MpFormLabel, MpFormErrorMessage, MpInput, MpInputTag,
  type DataInterface,
} from '@mekari/pixel3'
import { bo, rosterList, rosterErrors, saveRosterPerson, type RosterKind, type BoRosterPerson } from '~/data/backoffice'

const props = defineProps<{ isOpen: boolean; kind: RosterKind; idx: number }>()
const emit = defineEmits<{ close: []; saved: [msg: string] }>()
const { t } = useLocale()

const rec = ref<BoRosterPerson>({ name: '', email: '', products: [] })
const tried = ref(false)
watch(() => [props.isOpen, props.idx] as const, ([open, idx]) => {
  if (!open) return
  const src = idx >= 0 ? rosterList(props.kind)[idx] : undefined
  rec.value = src ? { name: src.name, email: src.email, products: [...src.products] } : { name: '', email: '', products: [] }
  tried.value = false
}, { immediate: true })

const isEdit = computed(() => props.idx >= 0)
const noun = computed(() => (props.kind === 'trainers' ? t('trainer') : t('Account Owner')))
const title = computed(() => (isEdit.value ? `${t('Edit')} ${noun.value}` : `${t('Add')} ${noun.value}`))
const errors = computed(() => rosterErrors(props.kind, props.idx, rec.value))
const err = (k: 'name' | 'email' | 'products') => (tried.value ? errors.value[k] ?? '' : '')

// MpInputTag speaks DataInterface[] — suggestions come from the Products master list.
const productOptions = computed(() => bo.masters.products.map((p) => p.name))
const tagData = computed<DataInterface[]>(() => rec.value.products.map((p) => ({ text: p, id: p, value: p, isInvalid: false, isReadOnly: false })))
function onTags(data: DataInterface[]) {
  const vals = data.map((d) => String(d.value)).filter((v) => productOptions.value.includes(v))
  rec.value.products = [...new Set(vals)]
}

function save() {
  const res = saveRosterPerson(props.kind, props.idx, rec.value)
  if (!res.ok) { tried.value = true; return }
  emit('saved', res.msg)
  emit('close')
}
</script>

<template>
  <MpModal
    id="bo-roster-modal"
    :is-open="isOpen"
    size="md"
    :is-close-on-esc="false"
    :is-close-on-overlay-click="false"
    :is-keep-alive="false"
    @close="emit('close')"
  >
    <MpModalContent data-devchange="bo-roster-modal">
      <MpModalHeader>
        {{ title }}
        <MpModalCloseButton />
      </MpModalHeader>
      <MpModalBody>
        <div class="bc-body">
          <MpFormControl id="bo-roster-name" :is-invalid="!!err('name')">
            <div class="bc-lbl-row"><MpFormLabel>{{ t('Name') }}</MpFormLabel><span class="bc-counter">{{ rec.name.length }}/60</span></div>
            <MpInput id="bo-roster-name-input" v-model="rec.name" maxlength="60" />
            <MpFormErrorMessage>{{ err('name') }}</MpFormErrorMessage>
          </MpFormControl>
          <MpFormControl id="bo-roster-email" :is-invalid="!!err('email')">
            <MpFormLabel>{{ t('Email') }}</MpFormLabel>
            <MpInput id="bo-roster-email-input" v-model="rec.email" type="email" />
            <MpFormErrorMessage>{{ err('email') }}</MpFormErrorMessage>
          </MpFormControl>
          <MpFormControl id="bo-roster-products" :is-invalid="!!err('products')">
            <MpFormLabel>{{ t('Products') }}</MpFormLabel>
            <MpInputTag
              id="bo-roster-products-input"
              :data="tagData"
              :suggestions="productOptions"
              is-show-suggestions
              is-show-icon-chevron-down
              use-portal
              :is-invalid="!!err('products')"
              @change="onTags"
            />
            <span class="bc-caption">{{ t('Choose from the Products list in Configurations.') }}</span>
            <MpFormErrorMessage>{{ err('products') }}</MpFormErrorMessage>
          </MpFormControl>
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
