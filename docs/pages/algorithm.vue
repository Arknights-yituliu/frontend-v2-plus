<script setup>
const algorithmDocs = [
  {
    title: "物品价值算法",
    description: "说明精英材料、加工副产物、作战效率和商店兑换价值的计算方式。",
    path: "/docs/item-value-algorithm",
    icon: "mdi-function"
  },
  {
    title: "商店性价比算法",
    description: "说明活动商店、采购中心和信用交易所的理智价值/商店货币换算口径。",
    path: "/docs/store-efficiency-algorithm",
    icon: "mdi-store"
  },
  {
    title: "礼包性价比算法",
    description: "说明礼包内抽卡资源、材料价值、中坚寻访和 648 源石基准的计算方式。",
    path: "/docs/pack-efficiency-algorithm",
    icon: "mdi-gift-outline"
  },
  {
    title: "精英化/专精排名算法",
    description: "说明精英化、技能专精和模组材料开销的折算、排序与练度率展示口径。",
    path: "/docs/elite-specialization-ranking-algorithm",
    icon: "mdi-podium"
  }
]
</script>

<template>
  <h1 id="algorithm">算法总览</h1>
  <v-divider></v-divider>
  <p>
    这里集中整理一图流中会影响页面结果和推荐结论的算法说明。算法文档主要用于解释计算口径、输入数据、迭代过程和与代码实现的对应关系。
  </p>

  <h2 id="algorithm-documents">算法文档</h2>
  <v-divider></v-divider>
  <div class="algorithm-doc-list">
    <router-link
      v-for="doc in algorithmDocs"
      :key="doc.path"
      :to="doc.path"
      class="algorithm-doc-link"
    >
      <v-card class="algorithm-doc-card" variant="outlined" hover>
        <v-card-item>
          <template v-slot:prepend>
            <v-avatar color="primary" variant="tonal">
              <v-icon :icon="doc.icon"></v-icon>
            </v-avatar>
          </template>
          <v-card-title>{{ doc.title }}</v-card-title>
          <v-card-subtitle>{{ doc.description }}</v-card-subtitle>
        </v-card-item>
      </v-card>
    </router-link>
  </div>

  <h2 id="writing-algorithm-documents">补充算法文档</h2>
  <v-divider></v-divider>
  <p>
    新增算法说明时，可以在 <v-code>/docs/pages</v-code> 下创建页面，并在
    <v-code>/docs/router/routes.js</v-code> 中把页面的 <v-code>module</v-code> 设置为
    <v-code>AlgorithmDocumentation</v-code>。
  </p>
</template>

<style scoped>
.algorithm-doc-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin: 16px 0 24px;
}

.algorithm-doc-link {
  color: inherit;
  text-decoration: none;
}

.algorithm-doc-link:hover {
  text-decoration: none;
}

.algorithm-doc-card {
  height: 100%;
  border-radius: 8px !important;
}

.algorithm-doc-card :deep(.v-card-subtitle) {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  line-height: 1.5;
}
</style>
