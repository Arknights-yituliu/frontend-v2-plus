<script setup>
import LinkButton from "@/components/dev/LinkButton.vue";
</script>

<template>
  <h1 id="stage-efficiency-algorithm">关卡效率算法</h1>
  <v-divider></v-divider>
  <p>
    关卡效率算法把关卡的期望掉落折算成理智价值，再除以关卡理智消耗。页面中的推荐关卡、活动关卡效率、T2/T3/T4 效率和搓玉效率都基于这一套数据加工得到。
  </p>

  <h2 id="data-source">数据来源</h2>
  <v-divider></v-divider>
  <ul>
    <li>物品理智价值来自当前用户配置下的物品价值表，计算细节见 <LinkButton link="/docs/item-value-algorithm" text="物品价值算法"></LinkButton>。</li>
    <li>关卡掉落数据来自企鹅物流数据统计缓存，读取入口为 <v-code>getStageDropCollect(stageConfig, false)</v-code>。</li>
    <li>关卡基础信息来自关卡信息缓存，包括关卡名、理智消耗、关卡类型、开放时间和 SPM。</li>
    <li>具体计算函数位于 <v-code>/src/utils/item/stageEfficiencyCal.js</v-code>。</li>
  </ul>

  <h2 id="drop-expected-value">掉落期望价值</h2>
  <v-divider></v-divider>
  <p>
    对于关卡中的每一种掉落物，先根据掉落数量和样本数计算单次作战的期望掉落数量，再乘以物品价值，得到该掉落物的期望价值。
  </p>
  <pre><v-code>掉落率 = 掉落数量 / 样本数
掉落期望价值 = 掉落率 * 物品理智价值</v-code></pre>
  <p>
    关卡的期望产出价值是所有可计价掉落物期望价值之和。若某个掉落物不在物品价值表内，该掉落物不会参与关卡效率计算。
  </p>

  <h2 id="stage-efficiency">综合效率</h2>
  <v-divider></v-divider>
  <v-alert border variant="tonal" type="info">
    <p><b>综合效率 = 关卡期望产出总价值 ÷ 关卡理智消耗</b></p>
  </v-alert>
  <p>
    综合效率表示每消耗 1 点理智能获得多少理智价值的物品。长期囤材料时，材料推荐页默认更关注综合效率。
  </p>

  <h2 id="main-product">主产物与副产物</h2>
  <v-divider></v-divider>
  <ul>
    <li>页面先按掉落期望价值从高到低排序。</li>
    <li>价值最高的非无限兑换掉落物会被视为该关卡的主产物。</li>
    <li>价值排名第二，且其期望价值占理智消耗比例大于 <v-code>0.1</v-code> 的掉落物会被视为副产物。</li>
    <li>如果主产物无法对应到精英材料系列，该关卡不会进入材料系列推荐结果。</li>
  </ul>
  <p>
    主产物用于把关卡归入对应材料系列，也用于计算单件期望理智。
  </p>
  <pre><v-code>单件期望理智 = 关卡理智消耗 ÷ 主产物掉落率</v-code></pre>

  <h2 id="tier-efficiency">T2/T3/T4 效率</h2>
  <v-divider></v-divider>
  <p>
    对于已经识别出主产物系列的关卡，算法会额外统计同一材料系列内不同稀有度材料带来的价值，用于回答“只缺某一档材料时刷哪里更合适”。
  </p>
  <pre><v-code>T2 效率 = 同系列绿材料与白材料期望价值之和 ÷ 关卡理智消耗
T3 效率 = 同系列蓝材料、绿材料、白材料期望价值之和 ÷ 关卡理智消耗
T4 效率 = 同系列紫材料、蓝材料、绿材料、白材料期望价值之和 ÷ 关卡理智消耗</v-code></pre>
  <p>
    推荐卡片会分别展示综合效率最高、T4 效率最高、T3 效率最高和 T2 效率最高的关卡。
  </p>

  <h2 id="activity-stage">活动关卡与无限池</h2>
  <v-divider></v-divider>
  <p>
    活动关卡、复刻活动关卡和一图流虚拟活动平均关会额外加入一条“活动代币可兑换物”的虚拟掉落，用来反映活动代币的无限池价值。
  </p>
  <p>
    算法会在活动无限龙门币和部分无限池材料中，选择每活动代币理智价值最高的兑换物作为虚拟掉落。这样可以避免活动无限池材料价值高于龙门币时，活动关卡效率被低估。
  </p>

  <h2 id="orundum">搓玉效率</h2>
  <v-divider></v-divider>
  <p>
    对固源岩、固源岩组、装置、全新装置等可用于制造源石碎片的材料，算法会额外计算每理智可转化的合成玉数量。
  </p>
  <pre><v-code>固源岩：每个折算 5 / 3 合成玉
固源岩组：每个折算 5 合成玉
装置：每个折算 10 / 3 合成玉
全新装置：每个折算 10 合成玉</v-code></pre>
  <p>
    搓玉推荐会过滤掉每理智合成玉产出较低的关卡，再按 <v-code>orundumPerAp</v-code> 从高到低排序，并以当前最高值作为 100% 计算搓玉效率。
  </p>

  <h2 id="filter-and-sort">筛选与排序</h2>
  <v-divider></v-divider>
  <ul>
    <li>掉落样本数低于用户配置中 <v-code>sampleSize</v-code> 的掉落数据不会进入计算。</li>
    <li>当前开放关卡用于实时推荐；历史活动关卡会单独按活动分组展示。</li>
    <li>材料推荐会先过滤综合效率不高于 <v-code>0.5</v-code> 的关卡，再按材料系列分组。</li>
    <li>历史活动关卡只统计活动或复刻活动中的蓝材料主产关，并在每个活动内按综合效率排序。</li>
  </ul>

  <h2 id="notice">注意事项</h2>
  <v-divider></v-divider>
  <ul>
    <li>关卡效率依赖物品价值表，因此会随用户的定价作战集、自定义物品价值、加工策略和样本数配置变化。</li>
    <li>综合效率适合长期囤材料参考；短期只缺特定稀有度材料时，应同时参考 T2/T3/T4 效率和单件期望理智。</li>
    <li>活动无限池虚拟掉落只用于估算活动关卡整体收益，不表示关卡本身直接掉落这些物品。</li>
    <li>SPM 只表示理想情况下 1 倍速每分钟消耗的理智，实际刷图速度会受练度和操作影响。</li>
  </ul>
</template>
