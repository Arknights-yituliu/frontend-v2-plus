<template>
  <div class="lb-console-page">
    <header class="lb-console-header">
      <p class="lb-console-kicker">LogicalByte Post Maker</p>
      <h1>制图控制台</h1>
    </header>

    <main class="lb-console-groups">
      <section
        v-for="group in pageGroups"
        :key="group.title"
        class="lb-console-group"
        :style="{ '--group-color': group.color }"
      >
        <header class="lb-console-group-header">
          <h2>{{ group.title }}</h2>
          <span>{{ group.pages.length }} 个工具</span>
        </header>

        <nav class="lb-console-links" :aria-label="`${group.title}导航`">
          <RouterLink
            v-for="page in group.pages"
            :key="page.to"
            :to="page.to"
            class="lb-console-link"
          >
            <span class="lb-console-link-heading">
              <span class="lb-console-link-title">{{ page.title }}</span>
              <span class="lb-console-link-arrow" aria-hidden="true">→</span>
            </span>
            <span class="lb-console-link-description">{{ page.description }}</span>
            <span class="lb-console-link-path">{{ page.to }}</span>
          </RouterLink>
        </nav>
      </section>
    </main>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const pageGroups = [
  {
    title: '内容制图',
    color: '#3867d6',
    pages: [
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
        title: '礼包性价比制图',
        description: '上传头图并将已选在售礼包制作为一张纵向长图',
        to: '/lb/pack-maker'
      },
      {
        title: '收益速览制图',
        description: '输入干员名称生成精二与专精材料收益速览表',
        to: '/lb/yield-overview'
      },
      {
        title: '卡片生成器',
        description: '创建由多个可配置卡片组成的组件',
        to: '/lb/card-maker'
      },
      {
        title: '封面制作器',
        description: '制作 LogicalByte 封面图片',
        to: '/lb/cover-maker'
      },
      {
        title: '图片标记器',
        description: '上传底图后，用彩色 tag 和说明条快速做图',
        to: '/lb/image-tagger'
      }
    ]
  },
  {
    title: '数据校验',
    color: '#d97706',
    pages: [
      {
        title: '礼包校对',
        description: '读取公告礼包文本，核对名称、时间和内容',
        to: '/lb/pack-proofread'
      },
      {
        title: 'JSON 数据对比',
        description: '上传两个语义一致的 JSON 文件，按规则对比差异',
        to: '/lb/json-compare'
      },
      {
        title: '缓存掉率数据对比',
        description: '上传掉率 JSON，与本地 Penguin 缓存矩阵对比',
        to: '/lb/json-cache-compare'
      },
      {
        title: 'OpenAPI 测试',
        description: '测试第三方 OpenAPI 接口的认证与数据响应',
        to: '/dev/open-api-test'
      }
    ]
  },
  {
    title: '数据与计算',
    color: '#18866b',
    pages: [
      {
        title: '对应关系表',
        description: '查看材料、干员、职业、材料系列和模组的 ID 对应关系',
        to: '/lb/mapping-table'
      },
      {
        title: '炼金池收益计算',
        description: '按掉率与产物计算炼金池的等效理智收益',
        to: '/lb/alchemy-pool'
      }
    ]
  }
]
</script>

<style scoped>
.lb-console-page {
  --page-background: #f3f5f8;
  --panel-background: #ffffff;
  --border-color: #dfe3eb;
  --heading-color: #172033;
  --body-color: #596276;
  --muted-color: #7b8496;

  min-height: 100vh;
  padding: 40px 24px 56px;
  background: var(--page-background);
}

.lb-console-header {
  max-width: 1120px;
  margin: 0 auto 32px;
}

.lb-console-kicker {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #3867d6;
}

.lb-console-header h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.2;
  color: var(--heading-color);
}

.lb-console-groups {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  gap: 30px;
}

.lb-console-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--border-color);
}

.lb-console-group-header h2 {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.4;
  color: var(--heading-color);
}

.lb-console-group-header span {
  flex: 0 0 auto;
  font-size: 0.78rem;
  color: var(--muted-color);
}

.lb-console-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.lb-console-link {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  min-height: 126px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-top: 3px solid var(--group-color);
  border-radius: 8px;
  background: var(--panel-background);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(29, 38, 58, 0.05);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.lb-console-link:hover {
  transform: translateY(-2px);
  border-color: var(--group-color);
  box-shadow: 0 8px 18px rgba(29, 38, 58, 0.1);
}

.lb-console-link-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lb-console-link-title {
  min-width: 0;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--heading-color);
}

.lb-console-link-arrow {
  flex: 0 0 auto;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--group-color);
  transition: transform 0.18s ease;
}

.lb-console-link:hover .lb-console-link-arrow {
  transform: translateX(3px);
}

.lb-console-link-description {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.84rem;
  line-height: 1.55;
  color: var(--body-color);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.lb-console-link-path {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.73rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  color: var(--muted-color);
}

:global(html.dark) .lb-console-page {
  --page-background: #17191e;
  --panel-background: #22252c;
  --border-color: #353a45;
  --heading-color: #f0f2f6;
  --body-color: #b9c0cd;
  --muted-color: #8d96a7;
}

@media (max-width: 900px) {
  .lb-console-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .lb-console-page {
    padding: 28px 16px 40px;
  }

  .lb-console-header {
    margin-bottom: 26px;
  }

  .lb-console-header h1 {
    font-size: 1.72rem;
  }

  .lb-console-groups {
    gap: 26px;
  }

  .lb-console-links {
    grid-template-columns: 1fr;
  }

  .lb-console-link {
    min-height: 116px;
    padding: 13px 14px;
  }
}
</style>
