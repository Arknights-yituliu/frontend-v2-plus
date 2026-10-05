<script setup>
const entries = [
  {
    to: "/riicdev/riic-test",
    icon: "mdi-calculator-variant-outline",
    label: "RIIC 计算测试",
  },
  {
    to: "/riicdev/maa-yield",
    icon: "mdi-file-chart-outline",
    label: "MAA 排班收益核算",
  },
  ...(import.meta.env.DEV
    ? [
        {
          to: "/riicdev/operator",
          icon: "mdi-account-edit-outline",
          label: "排班干员编辑",
        },
      ]
    : []),
  {
    to: "/riicdev/drone",
    icon: "mdi-quadcopter",
    label: "无人机测试",
  },
];
</script>

<template>
  <main class="riic-dev-index">
    <h1>RIIC 测试</h1>
    <nav class="riic-dev-entry-list" aria-label="RIIC 测试页面">
      <RouterLink
        v-for="entry in entries"
        :key="entry.to"
        :to="entry.to"
        class="riic-dev-entry"
      >
        <v-icon :icon="entry.icon" size="22"></v-icon>
        <span>{{ entry.label }}</span>
        <v-icon
          class="riic-dev-entry-arrow"
          icon="mdi-chevron-right"
          size="20"
          aria-hidden="true"
        ></v-icon>
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.riic-dev-index {
  width: min(720px, calc(100% - 32px));
  margin: 32px auto;
}

.riic-dev-index h1 {
  margin: 0 0 18px;
  color: var(--c-text-color);
  font-size: 24px;
  line-height: 1.35;
}

.riic-dev-entry-list {
  border-top: 1px solid var(--c-border-color);
}

.riic-dev-entry {
  display: flex;
  align-items: center;
  min-height: 56px;
  gap: 12px;
  border-bottom: 1px solid var(--c-border-color);
  color: var(--c-text-color);
  text-decoration: none;
}

.riic-dev-entry:hover {
  color: var(--riic-blue, #2878c8);
}

.riic-dev-entry span {
  font-size: 16px;
  line-height: 1.4;
}

.riic-dev-entry-arrow {
  margin-left: auto;
}
</style>
