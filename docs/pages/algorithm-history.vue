<template>
  <div>
    <h1 id="algorithm-history">算法发展简史</h1>
    <v-divider></v-divider>
    <p>
      本页整理与一图流物品价值算法相关的历史算法和相近思路。这些内容不一定是当前线上算法的直接组成部分，但有助于理解“为什么要这样定价”以及不同方案各自关注的问题。
    </p>

    <h2 id="物品定价算法">物品定价算法</h2>
    <v-divider></v-divider>
    <p>物品定价算法用于把作战掉落、加工配方、商店兑换等不同来源的物品放到同一套价值尺度中比较。下面按相关思路的发展脉络，整理几个对一图流物品价值算法有参考意义的算法或项目。</p>

    <h3 id="arkplanner">ArkPlanner</h3>
    <v-divider></v-divider>
    <p>
      <a href="https://penguin-stats.io/planner" target="_blank" rel="noopener noreferrer">ArkPlanner</a>
      是较早被广泛使用的明日方舟材料规划工具。它基于掉落统计、素材合成规则和线性规划，回答的是“在给定材料需求下，刷哪些关卡更划算”。
    </p>
    <v-alert border>
      明日方舟最优刷图策略规划工具，基于开源的掉落统计数据、素材合成规则以及线性规划实现。由于混合掉落、额外掉落副本的存在且各种材料掉落概率不同，在材料需求较复杂时，要刷哪些副本并不直观，大多情况下需要通过比较复杂的计算得到最优解。同时，了解刷所需材料预计消耗多少体力也会帮助你更好的规划体力。原理：将素材合成也看作一种掉落在约束中加以考虑（目标材料掉落 1，消耗的材料掉落为 -1），其 cost 为 0 或合成所需代币的等价体力消耗。
    </v-alert>
    <p>简单来说，ArkPlanner 可以通过求解如下的线性规划问题来计算精英材料的价值（假设精英材料以外的物品的价值已知）。</p>
    <v-alert border>
      <p><b>【决策变量】</b></p>
      <p>每种精英材料的价值</p>
      <p><b>【目标函数】</b></p>
      <p>最大化全干员满练需求物品的总价值</p>
      <p><b>【约束条件】</b></p>
      <ol>
        <li>作战期望掉落物品的总价值 ≤ 作战的理智消耗（对任意的作战）；</li>
        <li>加工期望得到的物品的总价值 ≤ 加工消耗的物品的总价值（对任意的加工配方）。</li>
      </ol>
    </v-alert>
    <p>以上仅为框架，省去了很多实现细节。</p>
    <v-alert border>
      <p><b>核心视角：</b>把关卡掉落和加工配方一起放进约束里，在需求目标下求解最优刷图方案。</p>
      <p>由于目标函数与玩家需求相关，新的精英材料刚加入、需求量还很少时，需求敏感模型可能会给出偏低的材料价值。</p>
    </v-alert>

    <h3 id="yituliu">明日方舟一图流</h3>
    <v-divider></v-divider>
    <p>
      一图流当前物品价值算法更关注“稳定的物品理智价值”。它不把全干员需求量作为主变量，而是要求定价作战集内的作战效率不超过 100%，并让每个材料系列至少有一个主产作战达到 100%。
    </p>
    <p>明日方舟一图流在计算精英材料的价值时不以需求作为变量，从而是需求不敏感的。在 ArkPlanner 算法的 2 类约束条件中，明日方舟一图流算法完全保留约束条件 1，即<b>所有作战的作战效率 ≤ 1</b>；对于约束条件 2，在明日方舟一图流算法中，直接要求<b>精英材料配方的不等号取等</b>，即要求<b>所有精英材料配方的<span class="red">消耗总价值</span>等于<span class="red">产出总价值</span>。</b></p>
    <p>由于精英材料的加工配方都变成了等式，在知道了<span class="blue">蓝</span>材料的价值后就能知道全部精英材料的价值。因此，明日方舟一图流算法<b>以<span class="blue">蓝</span>材料价值为核心</b>，<b>额外要求每一系列材料</b>（源岩、固源岩、固源岩组、提纯源岩算一系列材料，其他类似）<b>都至少存在 1 个以该系列材料为主产物且效率等于 1 的作战。</b></p>
    <v-alert border variant="tonal" type="info">
      <p><b>核心视角：</b>以<span class="blue">蓝</span>材料价值为迭代核心，用加工配方推出其他精英材料价值，再用定价作战集修正蓝材料价值。</p>
      <p>详细算法见 <a href="/docs/item-value-algorithm">物品价值算法</a>。</p>
    </v-alert>

    <h3 id="rhodes-island-bureau-of-price">罗德岛物价局</h3>
    <v-divider></v-divider>
    <p>
      <a href="https://github.com/Bidgecfah/Rhodes-Island-Bureau-of-Price" target="_blank" rel="noopener noreferrer">罗德岛物价局</a>
      的思路与一图流有相近之处，也关注如何从大量关卡约束中筛选出真正参与定价的关卡。
    </p>
    <v-alert border>
      <p>上千关卡的约束条件对应几十种材料价值作为未知数，其中大多关卡带来的条件会成为松约束，那么如何筛选参与定价的关卡就是问题本质所在了。</p>
      <p>本项目迭代选择与待定价材料相等数量的定价关卡，解一次方程组就得到了材料的定价，判断筛选范围内的关卡是否服从定价：不服从的关卡替代现有定价关卡成为新的定价关卡并重新进行方程组求解；而所有关卡都服从定价时就确定了最终的材料定价。再通过定价结果计算各商店的兑换货币性价比，从而指导“在什么商店买什么”的问题。</p>
    </v-alert>

    <h2 id="references">参考资料</h2>
    <v-divider></v-divider>
    <ol>
      <li>ArkPlanner，<a href="https://github.com/penguin-statistics/ArkPlanner" target="_blank" rel="noopener noreferrer">https://github.com/penguin-statistics/ArkPlanner</a></li>
      <li>企鹅物流数据统计，<a href="https://penguin-stats.io/" target="_blank" rel="noopener noreferrer">https://penguin-stats.io/</a></li>
      <li>罗德岛物价局，<a href="https://github.com/Bidgecfah/Rhodes-Island-Bureau-of-Price" target="_blank" rel="noopener noreferrer">https://github.com/Bidgecfah/Rhodes-Island-Bureau-of-Price</a></li>
    </ol>
  </div>
</template>
