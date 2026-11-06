<script setup lang="ts">
/**
 * BoRichText — minimal rich-text field for the announcement editor (O-02). The repo
 * has no rich-text editor, so this is the smallest thing that works: a
 * contenteditable area + a toolbar of ghost icon buttons (Pixel `text-editor-*`
 * icons) each wrapped in an MpTooltip. v-model is the HTML string.
 *
 * Field metrics follow MpInput md: form border at rest, neutral bold border + 1px
 * ring on focus (rule/form-focus-border-bold), danger border when invalid. Lists
 * keep their markers (CLAUDE.md › List bullets).
 */
import { ref, watch, onMounted } from 'vue'
import { MpButton, MpTooltip } from '@mekari/pixel3'

const props = withDefaults(defineProps<{ id: string; modelValue: string; isInvalid?: boolean; ariaLabel?: string }>(), { isInvalid: false, ariaLabel: '' })
const emit = defineEmits<{ 'update:modelValue': [html: string] }>()
const { t } = useLocale()

const el = ref<HTMLDivElement | null>(null)
let last = ''
onMounted(() => { if (el.value) { el.value.innerHTML = props.modelValue || ''; last = props.modelValue || '' } })
watch(() => props.modelValue, (v) => { if (el.value && v !== last) { el.value.innerHTML = v || ''; last = v || '' } })

// Remember the caret/selection inside the area so a toolbar click applies the
// command where the user was typing (focus() alone would reset it to the start).
let saved: Range | null = null
function remember() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount && el.value?.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange()
}
function restore() {
  el.value?.focus()
  const sel = window.getSelection()
  if (saved && sel) { sel.removeAllRanges(); sel.addRange(saved) }
}

function onInput() {
  remember()
  if (!el.value) return
  last = el.value.innerHTML
  emit('update:modelValue', last)
}

const tools = [
  { key: 'bold', icon: 'text-editor-bold', label: 'Bold', cmd: 'bold' },
  { key: 'italic', icon: 'text-editor-italic', label: 'Italic', cmd: 'italic' },
  { key: 'underline', icon: 'text-editor-underline', label: 'Underline', cmd: 'underline' },
  { key: 'heading', icon: 'text-editor-text', label: 'Heading', cmd: 'formatBlock', arg: 'h3' },
  { key: 'paragraph', icon: 'text-editor-paragraph', label: 'Normal text', cmd: 'formatBlock', arg: 'p' },
  { key: 'bullet', icon: 'text-editor-bullet-list', label: 'Bulleted list', cmd: 'insertUnorderedList' },
  { key: 'number', icon: 'text-editor-number-list', label: 'Numbered list', cmd: 'insertOrderedList' },
] as const satisfies readonly { key: string; icon: string; label: string; cmd: string; arg?: string }[]
function run(cmd: string, arg?: string) {
  restore()
  try { document.execCommand(cmd, false, arg) } catch { /* unsupported → no-op */ }
  onInput()
}
</script>

<template>
  <div class="brt" :class="{ 'brt--invalid': isInvalid }">
    <div class="brt-toolbar" role="toolbar" :aria-label="t('Formatting')">
      <MpTooltip v-for="tl in tools" :key="tl.key" :label="t(tl.label)" placement="bottom">
        <MpButton
          :id="`${id}-${tl.key}`" class="brt-tool" variant="ghost" :left-icon="tl.icon" :aria-label="t(tl.label)"
          @mousedown.prevent @click="run(tl.cmd, 'arg' in tl ? tl.arg : undefined)"
        />
      </MpTooltip>
    </div>
    <div
      :id="id"
      ref="el"
      class="brt-area"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="ariaLabel"
      :aria-invalid="isInvalid"
      @input="onInput"
      @keyup="remember"
      @mouseup="remember"
      @blur="remember"
    />
  </div>
</template>

<style scoped>
.brt {
  display: flex; flex-direction: column;
  border: 1px solid var(--mp-colors-border-form, #1d1f2429);
  border-radius: var(--mp-radii-md, 6px);
  background: var(--mp-colors-background-neutral, #fff);
  overflow: hidden;
}
.brt:focus-within { border-color: var(--mp-colors-border-bold, #8c9596); box-shadow: 0 0 0 1px var(--mp-colors-border-bold, #8c9596); /* pixel-police-allow-shadow: 1px focus ring, not a drop-shadow */ }
.brt--invalid, .brt--invalid:focus-within { border-color: var(--mp-colors-border-danger, #e1544a); }
.brt-toolbar {
  display: flex; flex-wrap: wrap; gap: var(--mp-spacing-1);
  padding: var(--mp-spacing-1);
  border-bottom: 1px solid var(--mp-colors-border-default, #e3e7e9);
  background: var(--mp-colors-background-neutral-subtle, #f8f9f9);
}
.brt-area {
  min-height: 240px; max-height: 480px; overflow-y: auto;
  padding: var(--mp-spacing-3) var(--mp-spacing-4);
  font-size: var(--mp-font-sizes-md); line-height: var(--mp-line-heights-lg, 24px);
  color: var(--mp-colors-text-default, #080d0e);
  outline: none; overflow-wrap: anywhere;
}
.brt-area :deep(ul) { list-style: disc outside; padding-left: var(--mp-spacing-6, 24px); margin: var(--mp-spacing-2) 0; }
.brt-area :deep(ol) { list-style: decimal outside; padding-left: var(--mp-spacing-6, 24px); margin: var(--mp-spacing-2) 0; }
.brt-area :deep(li) { display: list-item; }
.brt-area :deep(h3) { margin: var(--mp-spacing-2) 0; font-size: var(--mp-font-sizes-lg); font-weight: var(--mp-font-weights-semi-bold); line-height: var(--mp-line-heights-lg); }
.brt-area :deep(p) { margin: 0 0 var(--mp-spacing-2); }
</style>
