<template>
  <div>
    <h1 id="deprecated-item-value-algorithm">弃用内容：物品价值算法</h1>
    <v-divider></v-divider>
    <p>本页收纳从物品价值算法主文档中移出的旧内容，不在文档站导航中展示。</p>

    <h2 id="rhodes-island-bureau-of-price">罗德岛物价局</h2>
    <v-divider></v-divider>
    <p>
      原文位置：<v-code>/docs/item-value-algorithm</v-code> 的“多种定价算法”章节。
    </p>
    <p>
      相关链接：
      <a href="https://github.com/Bidgecfah/Rhodes-Island-Bureau-of-Price" target="_blank" rel="noopener noreferrer">罗德岛物价局</a>
    </p>
    <p>罗德岛物价局的思路与明日方舟一图流类似。</p>
    <v-alert border>
      <p>上千关卡的约束条件对应几十种材料价值作为未知数，其中大多关卡带来的条件会成为松约束，那么如何筛选参与定价的关卡就是问题本质所在了。</p>
      <p>本项目迭代选择与待定价材料相等数量的定价关卡，解一次方程组就得到了材料的定价，判断筛选范围内的关卡是否服从定价：不服从的关卡替代现有定价关卡成为新的定价关卡并重新进行方程组求解；而所有关卡都服从定价时就确定了最终的材料定价。 再通过定价结果计算各商店的兑换货币性价比，从而指导“在什么商店买什么”的问题。</p>
    </v-alert>
  </div>
</template>
