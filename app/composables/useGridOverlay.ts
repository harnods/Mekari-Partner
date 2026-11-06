/**
 * Dev grid overlay — shows the 12-column / 24px-gutter grid (rule/grid-12-col)
 * over the stage so layouts can be eyeballed against the grid.
 *
 * Toggle:
 *   • Keyboard: Shift+G (ignored while typing in a field)
 *   • Programmatic: window.__mpGrid.show() / .hide() / .toggle()
 *   • Persisted in localStorage ('mp.grid') so it survives reloads.
 */
import { ref } from 'vue'

const visible = ref(false)
let wired = false

function persist(v: boolean) {
  try {
    localStorage.setItem('mp.grid', v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function useGridOverlay() {
  function set(v: boolean) {
    visible.value = v
    persist(v)
  }
  function toggle() {
    set(!visible.value)
  }

  if (import.meta.client && !wired) {
    wired = true
    try {
      visible.value = localStorage.getItem('mp.grid') === '1'
    } catch {
      /* ignore */
    }
    window.addEventListener('keydown', (e) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)
      if (typing) return
      // Shift+G toggles the grid overlay.
      if (e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault()
        toggle()
      }
    })
    ;(window as unknown as { __mpGrid?: unknown }).__mpGrid = {
      show: () => set(true),
      hide: () => set(false),
      toggle,
    }
  }

  return { visible, toggle, show: () => set(true), hide: () => set(false) }
}
