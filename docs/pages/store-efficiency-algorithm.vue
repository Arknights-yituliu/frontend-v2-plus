<script setup>
import LinkButton from "@/components/dev/LinkButton.vue";
</script>

<template>
  <h1 id="store-efficiency-algorithm">商店性价比算法</h1>
  <v-divider></v-divider>
  <p>
    商店性价比页面把商店内物品先折算成理智价值，再除以对应商店货币售价。这个数值只用于同一种商店货币内部排序，不用于跨商店直接比较。
  </p>

  <h2 id="data-source">数据来源</h2>
  <v-divider></v-divider>
  <ul>
    <li>物品理智价值来自当前用户配置下的物品价值表，计算细节见 <LinkButton link="/docs/item-value-algorithm" text="物品价值算法"></LinkButton>。</li>
    <li>采购中心常驻商店数据来自 <v-code>/src/static/json/material/store_perm_table.json</v-code>。</li>
    <li>活动商店数据来自接口 <v-code>/item/v5/store/activity</v-code>，页面会按活动和商店区域展示。</li>
    <li>主线物资补给箱 <v-code>itempack_main</v-code> 在页面中暂按 <v-code>20.7</v-code> 理智计价。</li>
  </ul>

  <h2 id="formula">核心公式</h2>
  <v-divider></v-divider>
  <v-alert border variant="tonal" type="info">
    <p><b>商店性价比 = 物品理智价值 × 物品数量 ÷ 商店售价</b></p>
  </v-alert>
  <p>其中“物品理智价值”来自物品价值表，“商店售价”使用该商店自己的货币单位，例如绿票、黄票、活动代币、信用等。</p>

  <h3 id="permanent-store">采购中心</h3>
  <v-divider></v-divider>
  <p>
    采购中心按照商店类型分别计算。每个商品的 <v-code>apEfficiency</v-code> 为：
  </p>
  <pre><v-code>apEfficiency = itemValueMap[itemId] * quantity / price</v-code></pre>
  <p>
    信用交易所为了让显示单位更直观，会在上述结果上再乘以 <v-code>100</v-code>，因此页面中的信用商店数值表示“每 100 信用可换得的理智价值”。
  </p>

  <h3 id="activity-store">活动商店</h3>
  <v-divider></v-divider>
  <p>
    活动商店以活动代币为售价单位。每个商品的 <v-code>itemPPR</v-code> 为：
  </p>
  <pre><v-code>itemPPR = itemValueMap[itemId] * itemQuantity / itemPrice</v-code></pre>
  <p>
    页面先按活动商店区域分组，再在每个区域内按 <v-code>itemPPR</v-code> 从高到低排序。
  </p>

  <h2 id="display">排序与颜色</h2>
  <v-divider></v-divider>
  <ul>
    <li>采购中心的每种商店独立排序，排序依据是各自的 <v-code>apEfficiency</v-code>。</li>
    <li>活动商店的每个区域独立排序，排序依据是 <v-code>itemPPR</v-code>。</li>
    <li>颜色分档只用于视觉提示。采购中心使用页面内为每种货币配置的阈值；活动商店使用接口返回的 <v-code>actPPRBase</v-code> 与 <v-code>actPPRStair</v-code>。</li>
  </ul>

  <h2 id="notice">注意事项</h2>
  <v-divider></v-divider>
  <ul>
    <li>不同商店货币获取方式不同，数值不可跨店直接比较。</li>
    <li>物品价值会随用户在个人中心选择的定价作战集、自定义物品价值和加工策略变化。</li>
    <li>如果某个物品不在物品价值表内，页面无法可靠计算它的性价比。</li>
  </ul>
</template>
