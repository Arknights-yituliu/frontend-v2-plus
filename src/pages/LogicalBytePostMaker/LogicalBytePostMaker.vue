<template>
  <div class="lb-console-page">
    <header class="lb-console-header">
      <p class="lb-console-kicker">LogicalByte Post Maker</p>
      <h1>制图控制台</h1>
    </header>

    <nav class="lb-console-links" aria-label="次级页面导航">
      <RouterLink
        v-for="page in pages"
        :key="page.to"
        :to="page.to"
        class="lb-console-link"
      >
        <span class="lb-console-link-title">{{ page.title }}</span>
        <span class="lb-console-link-description">{{ page.description }}</span>
        <span class="lb-console-link-path">{{ page.to }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const pages = [
  {
    title: '精二性价比制图',
    description: '进入干员精英化与专精制图页面',
    to: '/lb/elite'
  },
  {
    title: '简报制图',
    description: '进入简报条目制图页面',
    to: '/lb/return'
  },
  {
    title: '卡片生成器',
    description: '创建由多个可配置卡片组成的组件',
    to: '/lb/card-maker'
  },
  {
    title: '图片标记器',
    description: '上传底图后，用彩色 tag 和说明条快速做图',
    to: '/lb/image-tagger'
  },
  {
    title: '腾讯文档智能表测试',
    description: '测试从腾讯文档智能表读取字段和记录并在页面展示',
    to: '/lb/tencent-docs-smartsheet-test'
  }
]
</script>

<style scoped>
.lb-console-page {
  min-height: 100vh;
  padding: 48px 20px;
  background:
    radial-gradient(circle at top, rgba(78, 122, 255, 0.2), transparent 32%),
    linear-gradient(180deg, #f6f8fc 0%, #eef2f9 100%);
}

.lb-console-header {
  max-width: 960px;
  margin: 0 auto 24px;
}

.lb-console-kicker {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f67c6;
}

.lb-console-header h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  color: #182033;
}

.lb-console-links {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.lb-console-link {
  display: grid;
  gap: 6px;
  padding: 20px 24px;
  border: 1px solid rgba(79, 103, 198, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 18px 40px rgba(24, 32, 51, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.lb-console-link:hover {
  transform: translateY(-2px);
  border-color: rgba(79, 103, 198, 0.34);
  box-shadow: 0 22px 44px rgba(24, 32, 51, 0.12);
}

.lb-console-link-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #182033;
}

.lb-console-link-description {
  font-size: 0.96rem;
  color: #55607a;
}

.lb-console-link-path {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.86rem;
  color: #4f67c6;
}

@media (max-width: 768px) {
  .lb-console-page {
    padding: 32px 16px;
  }

  .lb-console-link {
    padding: 18px;
    border-radius: 16px;
  }
}
</style>
