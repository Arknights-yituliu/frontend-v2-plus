<template>
  <nav class="logical-byte-tool-nav" aria-label="LogicalByte 工具导航">
    <RouterLink
      class="logical-byte-tool-nav__link logical-byte-tool-nav__back"
      to="/lb"
      exact-active-class="is-active"
    >
      <span class="mdi mdi-arrow-left" aria-hidden="true"></span>
      <span>返回 LB</span>
    </RouterLink>

    <span class="logical-byte-tool-nav__divider" aria-hidden="true"></span>

    <div class="logical-byte-tool-nav__links">
      <RouterLink
        v-for="link in toolLinks"
        :key="link.to"
        class="logical-byte-tool-nav__link"
        :to="link.to"
        exact-active-class="is-active"
      >
        {{ link.label }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const toolLinks = [
  { label: '精二性价比', to: '/lb/elite' },
  { label: '新材料简报制图', to: '/lb/new-material' },
  { label: '商店性价比', to: '/material/store' }
]
</script>

<style scoped>
.logical-byte-tool-nav {
  --nav-background: #ffffff;
  --nav-border: #dfe3eb;
  --nav-text: #4b5568;
  --nav-active: #176b68;
  --nav-active-background: #e8f5f3;

  box-sizing: border-box;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 18px;
  overflow-x: auto;
  background: var(--nav-background);
  border-bottom: 1px solid var(--nav-border);
  box-shadow: 0 2px 8px rgba(29, 38, 58, 0.08);
  white-space: nowrap;
}

.logical-byte-tool-nav__links {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.logical-byte-tool-nav__divider {
  width: 1px;
  height: 24px;
  flex: 0 0 auto;
  background: var(--nav-border);
}

.logical-byte-tool-nav__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--nav-text);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.logical-byte-tool-nav__link:hover {
  color: var(--nav-active);
  background: var(--nav-active-background);
  border-color: #b8ddd8;
}

.logical-byte-tool-nav__link.is-active {
  color: var(--nav-active);
  background: var(--nav-active-background);
  border-color: #8fc9c1;
}

.logical-byte-tool-nav__back {
  flex: 0 0 auto;
  color: #3867d6;
}

.logical-byte-tool-nav__back:hover,
.logical-byte-tool-nav__back.is-active {
  color: #2451b8;
  background: #edf2ff;
  border-color: #c2d0ff;
}

:global(html.dark) .logical-byte-tool-nav {
  --nav-background: #22252c;
  --nav-border: #353a45;
  --nav-text: #c4cad5;
  --nav-active: #8ed8cc;
  --nav-active-background: #1d3c3b;
}

@media (max-width: 600px) {
  .logical-byte-tool-nav {
    gap: 8px;
    min-height: 52px;
    padding: 7px 10px;
  }

  .logical-byte-tool-nav__link {
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.84rem;
  }
}
</style>
