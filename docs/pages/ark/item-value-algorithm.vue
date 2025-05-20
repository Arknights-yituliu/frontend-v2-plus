<script setup>

</script>


<template>

  <h1>1.给蓝色品质材料（T3）设定一个初始价值</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <p>注：初始值可随意写入，单位为理智，推荐用绿票商店的材料标价，因为能更快得出结果，写入其他值也可以</p>
  <h1>2.通过蓝色品质材料（T3）获取其他品质（T1、T2、T4）材料的价值</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <h2>以下为计算示例：</h2>
  <h3><span style="color:green;font-weight: bolder">固源岩</span>的价值</h3>
  <p>已知<span style="color:#0096e6;font-weight: bolder">固源岩组</span>的合成公式为：
    5 * <span style="color:green;font-weight: bolder">固源岩</span> + 合成消耗龙门币 = <span style="color:#0096e6;font-weight: bolder">固源岩组</span> + 加工副产物 * 加工爆率</p>
  <p><span style="color:green;font-weight: bolder">固源岩</span>价值 = <span style="color:#0096e6;font-weight: bolder">固源岩组</span>价值 ÷ 5 - 合成消耗龙门币 + 加工副产物 * 加工爆率 </p>
  <h3><span style="color:#bf63ff;font-weight: bolder">提纯源岩</span>的价值</h3>
  <p>已知<span style="color:#bf63ff;font-weight: bolder">提纯源岩</span>的合成公式为 4 * <span style="color:#0096e6;font-weight: bolder">固源岩组</span> + 合成消耗龙门币 = <span style="color:#bf63ff;font-weight: bolder">提纯源岩</span> + 加工副产物 * 加工爆率</p>
  <p><span style="color:#bf63ff;font-weight: bolder">提纯源岩</span>价值 = <span style="color:#0096e6;font-weight: bolder">固源岩组</span>价值 * 4 + 合成消耗龙门币 - 加工副产物 * 加工爆率</p>
  <h1>3.计算企鹅物流上每个材料关卡的期望产出理智</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <h2>以下为计算示例：</h2>
  <p>计算12-17的期望产出</p>
   <v-table>

   </v-table>
</template>