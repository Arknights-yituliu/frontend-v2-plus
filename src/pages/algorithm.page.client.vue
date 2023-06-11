<template>
  <div class="alg_page">
    <div class="alg_page_title_1">动态平衡算法简述</div>
    <div class="alg_title">
      <p>算法核心思路为“掉率越高，则价值越低”且“物品价值仅受获取成本影响” 第1步：取所有常驻关卡的掉率，以材料价格计算关卡效率 第2步：以关卡效率修正材料价格</p>
    </div>
    <div class="alg_content">
      <ul>
        <li>
          <p>第1步：取所有常驻关卡的掉率，以材料价格计算关卡效率</p>
        </li>
        <li>
          <p>第2步：以关卡效率修正材料价格</p>
        </li>
        <li>
          <p>第3步：重复操作(1)(2)，直至材料价格和关卡效率收敛于误差小于万分之一，实现动态平衡，此时得出关卡效率和材料价值</p>
        </li>
        <li>
          <p>第4步：根据商店售价和物品价值，计算常驻商店和活动商店性价比 FAQ Q：你怎么知道数列是收敛的？ A：如果不收敛网站就崩了，你也看不到这句话了。</p>
        </li>
      </ul>
    </div>
    <div class="alg_title">
      <p>FAQ</p>
    </div>
    <div class="alg_content">
      <ul>
        <li><p>Q：你怎么知道数列是收敛的？</p></li>
        <li><p>A：如果不收敛网站就崩了，你也看不到这句话了。</p></li>
        <li>
          <p>Q：为什么不用线性规划进行计算？</p>
        </li>
        <li>
          <p>A：人无法两次踏进同一条河流，线性规划的目标时刻都在变动，随活动UP起伏的价值你喜欢吗？</p>
        </li>
        <li>
          <p>Q：你这结果有问题啊，XX关的x材料期望明显更低，为什么XX关不是效率最高？</p>
        </li>
        <li>
          <p>A：大部分关卡都掉落多种材料，单一材料的期望只能说明短期最优，长期最优是要计算副产物的。</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.alg_page {
  font-family: "Microsoft YaHei", 微软雅黑, "MicrosoftJhengHei", 华文细黑, STHeiti, MingLiu;
}

.alg_page_title_1 {
  margin-top: 30px;
  margin-left: 20px;
  margin-bottom: 10px;
  font-size: 32px;
  font-weight: 800;
}

.alg_page_content {
  margin-left: 20px;
  margin-bottom: 20px;
}

.alg_page_title_2 {
  margin-top: 30px;
  margin-left: 20px;
  margin-bottom: 10px;
  font-size: 24px;
  font-weight: 800;
}

.alg_title {
  margin-left: 20px;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 800;
  border-bottom: 1px black solid;
}

.alg_content {
  margin-left: 30px;
  margin-bottom: 10px;
}
</style>
