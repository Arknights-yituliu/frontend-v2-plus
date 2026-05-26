<script setup>
const algorithmDocs = [
  {
    title: "物品价值算法",
    description: "说明精英材料、加工副产物、作战效率和商店兑换价值的计算方式。",
    path: "/docs/item-value-algorithm",
    icon: "mdi-function"
  },
  {
    title: "关卡效率算法",
    description: "说明综合效率、T2/T3/T4 效率、活动无限池和搓玉效率的计算口径。",
    path: "/docs/stage-efficiency-algorithm",
    icon: "mdi-map-marker-path"
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

  <h2 id="前置条件">前置条件</h2>
  <v-divider></v-divider>
  <p>
    阅读算法文档时，默认采用以下约定。各页面会继续说明自己的特殊输入、公式和排序口径。
  </p>
  <ul>
    <li>文档使用自然语言介绍算法细节，具体实现请参考代码。若发现代码与文档中的内容不一致，欢迎提出反馈。</li>
    <li>文中示例数值只用于说明计算过程，可能不等于当前线上结果。</li>
    <li>物品价值指物品折算成理智后的长期相对价值，主要用于作战效率、商店性价比、礼包性价比等计算，不代表账号短期缺口、玩家个人偏好或现实货币价格。</li>
    <li>精英材料的稀有度从低到高依次称为<span class="gray">白</span>、<span class="green">绿</span>、<span class="blue">蓝</span>、<span class="purple">紫</span>、<span class="yellow">金</span>，或者 <span class="gray">T1</span>、<span class="green">T2</span>、<span class="blue">T3</span>、<span class="purple">T4</span>、<span class="yellow">T5</span>。</li>
    <li>物品价值、关卡效率和性价比结果会受到用户配置影响，例如定价作战集、自定义物品价值、加工策略和掉落样本数。</li>
  </ul>
  <v-alert border variant="tonal" type="info">
    <p>如果想了解物品定价思路的历史脉络，可以参考 <a href="/docs/algorithm-history">算法发展简史</a>。</p>
  </v-alert>

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
