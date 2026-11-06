<script setup lang="ts">
/**
 * Backoffice (Mekari Partner internal portal) sidebar — shown on /backoffice/*.
 * A copy of HrSidebar's level-1 rail + level-2 secondary panel + hover flyout
 * (same behaviour, dimensions and hover/active colours). Roster Management and
 * Configurations open a level-2 panel; every other item routes directly.
 * Active state matches nested routes (/backoffice/partners/P-0004 → Partner Management).
 */
import { ref, computed } from 'vue'
import { MpTooltip, MpButton } from '@mekari/pixel3'
import toggleIcon from '~/assets/images/sidebar-toggle.svg?url'

const router = useRouter()
const route = useRoute()
const { t } = useLocale()

const expanded = ref(true)

interface SubItem { label: string; to: string }
interface Item { icon: string; name: string; to?: string; submenu?: SubItem[][] }
const groups: Item[][] = [
  [
    { icon: 'home',         name: 'Home',                to: '/backoffice/home' },
    { icon: 'pipeline',     name: 'Registrations',       to: '/backoffice/registrations' },
    { icon: 'company',      name: 'Partner Management',  to: '/backoffice/partners' },
    { icon: 'transfer',     name: 'Partner Data Change', to: '/backoffice/partner-data-change' },
    { icon: 'log',          name: 'Document Repository', to: '/backoffice/documents' },
    { icon: 'notification', name: 'Announcements',       to: '/backoffice/announcements' },
  ],
  [
    { icon: 'team', name: 'Roster Management', submenu: [[
      { label: 'Partner Account Owners', to: '/backoffice/account-owners' },
      { label: 'Trainers',               to: '/backoffice/trainers' },
    ]] },
    { icon: 'settings', name: 'Configurations', submenu: [[
      { label: 'Professions',      to: '/backoffice/configurations/professions' },
      { label: 'Specializations',  to: '/backoffice/configurations/specializations' },
      { label: 'Responsibilities', to: '/backoffice/configurations/responsibilities' },
      { label: 'Partner Roles',    to: '/backoffice/configurations/roles' },
      { label: 'Products',         to: '/backoffice/configurations/products' },
    ], [
      { label: 'Master Agreements', to: '/backoffice/configurations/master-agreements' },
    ]] },
  ],
]

const under = (path: string, base: string) => path === base || path.startsWith(base + '/')
function subMatches(s: SubItem) { return under(route.path, s.to) }
// The section whose submenu owns the current route → its level-2 panel is open.
const activePanel = computed<Item | null>(() => {
  for (const g of groups) for (const it of g)
    if (it.submenu && it.submenu.some((grp) => grp.some(subMatches))) return it
  return null
})
const activeItem = computed<string>(() => {
  for (const g of groups) for (const it of g) if (it.to && under(route.path, it.to)) return it.name
  return activePanel.value?.name ?? ''
})
// Main rail collapses to icons while a level-2 panel is open, and below tablet width.
const isNarrowViewport = ref(false)
if (import.meta.client) {
  const mq = window.matchMedia('(max-width: 1024px)')
  isNarrowViewport.value = mq.matches
  mq.addEventListener('change', (e) => { isNarrowViewport.value = e.matches })
}
const railExpanded = computed(() => expanded.value && !activePanel.value && !isNarrowViewport.value)

// ── Hover flyout (identical mechanic to HrSidebar / ErpSidebar) ──────────────
const flyoutItem = ref<Item | null>(null)
const flyoutStyle = ref<Record<string, string>>({})
const flyoutGroups = computed<SubItem[][]>(() => flyoutItem.value?.submenu ?? [])
let closeTimer: ReturnType<typeof setTimeout> | null = null

function handleItemMouseEnter(e: MouseEvent, item: Item) {
  if (!item.submenu || activePanel.value?.name === item.name) { scheduleClose(); return }
  cancelClose()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  flyoutItem.value = item
  flyoutStyle.value = { top: `${rect.top}px`, left: `${rect.right + 8}px` }
}
function scheduleClose() { closeTimer = setTimeout(() => { flyoutItem.value = null }, 300) }
function cancelClose() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null } }

function handleNavClick(item: Item) {
  if (item.submenu) { router.push(item.submenu[0]![0]!.to); flyoutItem.value = null; return }
  if (item.to) router.push(item.to)
}
function handleFlyoutSubItemClick(sub: SubItem) { router.push(sub.to); flyoutItem.value = null }
function handlePanelSubItemClick(sub: SubItem) { router.push(sub.to) }

// Collapsed-rail tooltip for plain items (submenu items get the flyout instead).
function navItemTooltip(item: Item): string | undefined {
  if (railExpanded.value || item.submenu) return undefined
  return t(item.name)
}
</script>

<template>
  <div class="sidebar-wrapper" data-devchange="bo-sidebar">
    <nav class="sidebar bo-sidebar" :class="{ 'is-expanded': railExpanded }" :aria-label="t('Backoffice navigation')">
      <div class="sidebar-header">
        <MpButton variant="ghost" class="sidebar-toggle" :title="t('Toggle sidebar')" @click="expanded = !expanded">
          <img :src="toggleIcon" :alt="t('Toggle sidebar')">
        </MpButton>
      </div>

      <div v-for="(group, gi) in groups" :key="gi" class="nav-group">
        <template v-for="item in group" :key="item.name">
          <MpTooltip
            v-if="navItemTooltip(item)"
            :id="`bo-nav-tt-${item.icon}`"
            :label="navItemTooltip(item)!"
            placement="right"
            use-portal
          >
            <MpButton
              variant="ghost"
              class="nav-item"
              :class="{ active: activeItem === item.name, 'is-flyout-open': flyoutItem?.name === item.name }"
              @click="handleNavClick(item)"
              @mouseenter="(e: MouseEvent) => handleItemMouseEnter(e, item)"
              @mouseleave="scheduleClose"
            >
              <img :src="`https://cdn.mekari.design/icons/${item.icon}-outline.svg`" class="nav-icon-line" alt="" />
              <img :src="`https://cdn.mekari.design/icons/${item.icon}-fill.svg`" class="nav-icon-fill" alt="" />
              <span class="nav-label">{{ t(item.name) }}</span>
            </MpButton>
          </MpTooltip>
          <MpButton
            v-else
            variant="ghost"
            class="nav-item"
            :class="{ active: activeItem === item.name, 'is-flyout-open': flyoutItem?.name === item.name }"
            @click="handleNavClick(item)"
            @mouseenter="(e: MouseEvent) => handleItemMouseEnter(e, item)"
            @mouseleave="scheduleClose"
          >
            <img :src="`https://cdn.mekari.design/icons/${item.icon}-outline.svg`" class="nav-icon-line" alt="" />
            <img :src="`https://cdn.mekari.design/icons/${item.icon}-fill.svg`" class="nav-icon-fill" alt="" />
            <span class="nav-label">{{ t(item.name) }}</span>
          </MpButton>
        </template>
      </div>
    </nav>

    <!-- Level-2 secondary panel -->
    <Transition name="panel">
      <div v-if="activePanel" class="sidebar-panel">
        <div class="panel-header">
          <span class="panel-title">{{ t(activePanel.name).toUpperCase() }}</span>
        </div>
        <div class="panel-list">
          <template v-for="(group, gi) in activePanel.submenu" :key="gi">
            <div v-if="gi > 0" class="panel-divider" />
            <MpButton
              v-for="sub in group"
              :key="sub.label"
              variant="ghost"
              class="panel-item"
              :class="{ active: subMatches(sub) }"
              @click="handlePanelSubItemClick(sub)"
            >
              <span>{{ t(sub.label) }}</span>
            </MpButton>
          </template>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Level-2 hover flyout preview (Teleported, like HrSidebar) -->
  <Teleport to="body">
    <div
      v-if="flyoutItem"
      class="submenu-flyout"
      :style="flyoutStyle"
      @mouseenter="cancelClose"
      @mouseleave="scheduleClose"
    >
      <template v-for="(group, gi) in flyoutGroups" :key="gi">
        <div class="submenu-group" :class="{ 'has-border': gi < flyoutGroups.length - 1 }">
          <MpButton
            v-for="sub in group"
            :key="sub.label"
            variant="ghost"
            class="submenu-item"
            :class="{ active: subMatches(sub) }"
            @click="handleFlyoutSubItemClick(sub)"
          >
            <span>{{ t(sub.label) }}</span>
          </MpButton>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar-wrapper { display: flex; height: 100%; flex-shrink: 0; }

.sidebar {
  width: var(--mp-sizes-13, 52px);
  background: var(--mp-background-neutral-subtle, #f8f9f9);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
  padding: 0 var(--mp-spacing-2) var(--mp-spacing-2);
}
.sidebar.is-expanded { width: 216px; }

.sidebar-header { display: flex; align-items: center; height: 72px; flex-shrink: 0; }
.sidebar-toggle {
  width: var(--mp-sizes-9); height: var(--mp-sizes-9);
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--mp-radii-md); cursor: pointer;
  background: transparent; border: none;
  padding: var(--mp-spacing-2) var(--mp-spacing-2) var(--mp-spacing-2) var(--mp-spacing-1);
  flex-shrink: 0; transition: background-color 100ms;
}
.sidebar-toggle:hover { background-color: var(--mp-background-neutral-subtle-hovered); }
.sidebar-toggle img {
  width: var(--mp-sizes-6); height: var(--mp-sizes-6); display: block; flex-shrink: 0;
  filter: brightness(0) opacity(0.6); transform: scaleX(-1);
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar.is-expanded .sidebar-toggle img { transform: scaleX(1); }

.nav-group {
  display: flex; flex-direction: column; gap: var(--mp-spacing-0\.5);
  padding-bottom: var(--mp-spacing-2); margin-bottom: var(--mp-spacing-1);
  border-bottom: 1px solid var(--mp-border-default, #e3e7e9);
}
.nav-group:last-child { border-bottom: none; }

.nav-item {
  display: flex; align-items: center; justify-content: flex-start;
  gap: var(--mp-spacing-2);
  width: var(--mp-sizes-9); height: var(--mp-sizes-9);
  border-radius: var(--mp-radii-md); border: none; background: transparent;
  cursor: pointer; padding: var(--mp-spacing-2); overflow: hidden;
  color: var(--mp-text-default);
  transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1), background-color 100ms;
}
.sidebar.is-expanded .nav-item { width: 100%; }

/* Hover / flyout-open — same colours as ErpSidebar (icon tinted blue) */
.nav-item:hover, .nav-item.is-flyout-open { background-color: var(--mp-background-neutral-subtle-hovered); }
.nav-item:hover .nav-label, .nav-item.is-flyout-open .nav-label { color: var(--mp-text-link, #165082); }
.nav-item:hover img, .nav-item.is-flyout-open img { filter: brightness(0) saturate(100%) invert(26%) sepia(60%) saturate(600%) hue-rotate(185deg) brightness(85%) contrast(95%); }

/* Active — neutral-pressed bg, blue label, SOLID (fill) green icon (ErpSidebar) */
.nav-item.active { background-color: var(--mp-background-neutral-pressed, #ebf0f1); }
.nav-item.active .nav-label { font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-link, #165082); }
.nav-item.active .nav-icon-line { display: none; }
.nav-item .nav-icon-fill { display: none; }
.nav-item.active .nav-icon-fill {
  display: block;
  filter: brightness(0) saturate(100%) invert(35%) sepia(55%) saturate(700%) hue-rotate(120deg) brightness(90%) contrast(100%);
}

.nav-item img { width: var(--mp-sizes-5); height: var(--mp-sizes-5); display: block; flex-shrink: 0; pointer-events: none; }

.nav-label {
  flex: 1; min-width: 0;
  font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-regular);
  color: inherit; line-height: var(--mp-line-heights-md);
  opacity: 0; overflow: hidden; white-space: nowrap; text-align: left; pointer-events: none;
  transition: opacity 140ms ease;
}
.sidebar.is-expanded .nav-label { opacity: 1; }

/* ── Level-2 secondary panel — identical to ErpSidebar ── */
.sidebar-panel {
  width: 188px; background: var(--mp-background-neutral-subtle, #f8f9f9); height: 100%; /* pixel-police-allow: 188px secondary-panel width, custom (matches ErpSidebar, not in token scale) */
  display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto;
  padding: 0 var(--mp-spacing-2) var(--mp-spacing-2);
}
/* On phones the 52px rail + 188px panel leaves the content too little room, so
   the level-2 panel is dropped there (the icon rail + hover flyout remain). */
@media (max-width: 640px) {
  .sidebar-panel { display: none; }
}
.panel-header { height: 72px; display: flex; align-items: center; padding: 0 var(--mp-spacing-2); flex-shrink: 0; }
.panel-title { font-size: var(--mp-font-sizes-sm); font-weight: var(--mp-font-weights-semi-bold); letter-spacing: 2.88px; color: var(--mp-text-default); }
.panel-list { display: flex; flex-direction: column; gap: var(--mp-spacing-0\.5); }
.panel-divider { height: 1px; background: var(--mp-border-default, #e3e7e9); margin: var(--mp-spacing-1) 0; }
.panel-item {
  display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-2);
  width: 100%; padding: var(--mp-spacing-2); border-radius: var(--mp-radii-md); border: none; background: transparent;
  font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-regular); color: var(--mp-text-default);
  cursor: pointer; text-align: left; line-height: var(--mp-line-heights-md); transition: background-color 100ms;
}
.panel-item:hover { background-color: var(--mp-background-neutral-subtle-hovered); }
.panel-item.active { background-color: var(--mp-background-neutral-pressed, #E2E8F0); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-link, #165082); }

/* Panel slide-in */
.panel-enter-active, .panel-leave-active { transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease; overflow: hidden; }
.panel-enter-from, .panel-leave-to { width: 0; opacity: 0; }
.panel-enter-to, .panel-leave-from { width: 188px; opacity: 1; }

/* ── Flyout popover — identical to ErpSidebar ── */
.submenu-flyout {
  position: fixed; z-index: 1000; width: 188px;
  background: var(--mp-background-neutral, #ffffff);
  border: 1px solid var(--mp-border-bold, #8c9596);
  border-radius: var(--mp-radii-md);
  box-shadow: var(--mp-shadows-sm); /* pixel-police-allow-shadow: floating level-2 submenu flyout */
  padding: var(--mp-spacing-2) 0;
  font-family: var(--mp-fonts-body);
}
.submenu-flyout::before {
  content: ''; position: absolute; top: 0;
  left: calc(-1 * var(--mp-spacing-3)); width: var(--mp-spacing-3); height: 100%;
}
.submenu-group { display: flex; flex-direction: column; }
.submenu-group.has-border { border-bottom: 1px solid var(--mp-border-default, #e3e7e9); padding-bottom: var(--mp-spacing-2); }
.submenu-group + .submenu-group { padding-top: var(--mp-spacing-2); }
.submenu-item {
  display: flex; align-items: center; justify-content: space-between; gap: var(--mp-spacing-2);
  width: 100%; padding: var(--mp-spacing-2) var(--mp-spacing-3);
  background: transparent; border: none; cursor: pointer;
  font-size: var(--mp-font-sizes-md); font-weight: var(--mp-font-weights-regular);
  color: var(--mp-text-default); text-align: left; line-height: var(--mp-line-heights-md);
  transition: background-color 100ms;
}
.submenu-item:hover { background-color: var(--mp-background-neutral-subtle-hovered); }
.submenu-item.active { background-color: var(--mp-background-neutral-pressed, #E2E8F0); font-weight: var(--mp-font-weights-semi-bold); color: var(--mp-text-link, #165082); }
</style>
