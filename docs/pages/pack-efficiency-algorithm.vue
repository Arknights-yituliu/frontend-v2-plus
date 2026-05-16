<script setup>
import LinkButton from "@/components/dev/LinkButton.vue";
</script>

<template>
  <h1 id="pack-efficiency-algorithm">礼包性价比算法</h1>
  <v-divider></v-divider>
  <p>
    礼包性价比页面把礼包内抽卡资源和可计价物品折算为理智或源石，再与直接购买 648 源石的价格进行比较。页面同时展示“抽卡性价比”和“综合性价比”两套指标。
  </p>

  <h2 id="data-source">数据来源</h2>
  <v-divider></v-divider>
  <ul>
    <li>礼包基础信息来自本地礼包缓存 <v-code>packInfoCache.listPackInfo()</v-code>。</li>
    <li>礼包内材料价值来自当前用户配置下的物品价值表，计算细节见 <LinkButton link="/docs/item-value-algorithm" text="物品价值算法"></LinkButton>。</li>
    <li>具体计算函数位于 <v-code>/src/utils/item/packEfficiency.js</v-code>。</li>
  </ul>

  <h2 id="benchmark">基准</h2>
  <v-divider></v-divider>
  <p>页面以可无限购买的 648 元源石作为 100% 基准：</p>
  <pre><v-code>综合性价比基准 = 648 / 185
抽卡性价比基准 = 648 / 185 / 0.3</v-code></pre>
  <p>
    这里的 <v-code>185</v-code> 是 648 元档位获得的源石数量，<v-code>0.3</v-code> 表示 1 源石可兑换 180 合成玉，即 <v-code>0.3</v-code> 抽。
  </p>

  <h2 id="draws">抽数计算</h2>
  <v-divider></v-divider>
  <p>礼包内的直接抽卡资源按以下方式换算为抽数：</p>
  <pre><v-code>合成玉抽数 = 合成玉数量 / 600
源石抽数 = 源石数量 * 0.3
单抽券抽数 = 单抽券数量
十连券抽数 = 十连券数量 * 10</v-code></pre>
  <p>
    抽卡性价比使用礼包售价除以抽数得到每抽价格，再与 648 源石的每抽价格比较：
  </p>
  <pre><v-code>每抽价格 = 礼包售价 / 抽数
抽卡性价比 = 抽卡性价比基准 / 每抽价格</v-code></pre>

  <h2 id="overall">综合性价比</h2>
  <v-divider></v-divider>
  <p>
    综合性价比会把礼包内所有可计价物品折算为理智价值，再按 <v-code>135</v-code> 理智折算为源石。
  </p>
  <pre><v-code>礼包总理智价值 = Σ(物品理智价值 * 数量)
礼包折合源石 = 礼包总理智价值 / 135
折合源石单价 = 礼包售价 / 礼包折合源石
综合性价比 = 综合性价比基准 / 折合源石单价</v-code></pre>
  <p>
    礼包详情里的“总价值”和“占比”也基于同一套理智价值计算：
  </p>
  <pre><v-code>单项总价值 = 物品理智价值 * 数量
单项占比 = 综合性价比基准 / 礼包售价 * (单项总价值 / 135)</v-code></pre>

  <h2 id="kernel-gacha">中坚寻访</h2>
  <v-divider></v-divider>
  <p>
    中坚寻访凭证默认不计入抽数和综合价值。开启“需要中坚寻访”后，页面会把中坚单抽券和中坚十连券纳入抽数与理智价值。
  </p>
  <v-alert border variant="tonal" type="info">
    标准寻访为 258 黄票兑换 38 抽，中坚寻访为 216 黄票兑换 38 抽，因此中坚寻访的抽卡价值口径约为 <v-code>216 / 258 = 0.837</v-code> 个标准抽。
  </v-alert>

  <h2 id="display-and-sort">显示与排序</h2>
  <v-divider></v-divider>
  <ul>
    <li>“只看抽卡”会让卡片效率条重点显示抽卡性价比，适合只关心抽卡资源的用户。</li>
    <li>“综合性价比”包含礼包内全部可计价物品，材料、龙门币、源石、合成玉、寻访凭证等都会折算。</li>
    <li>在售活动礼包支持按上架时间、价格、抽卡性价比、综合性价比排序。</li>
    <li>礼包历史支持按年份、价格区间和礼包标签筛选。</li>
  </ul>

  <h2 id="notice">注意事项</h2>
  <v-divider></v-divider>
  <ul>
    <li>每月芯片自选包和每月材料自选包使用可选项中价值最高的材料计价。</li>
    <li>精二券暂按平均价值计价，相关口径可参考 <LinkButton link="/docs/elite-specialization-ranking-algorithm" text="精英化/专精排名算法"></LinkButton>。</li>
    <li>模组数据块暂按 120 红票计价，数据增补条和数据增补仪存在无法稳定计价的情况，需要结合个人需求判断。</li>
  </ul>
</template>
