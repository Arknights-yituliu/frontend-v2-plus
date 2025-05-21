<script setup>
import ItemImage from "/src/components/sprite/ItemImage.vue";
</script>

<template>

<!--  <div class="recommendation-table-wrap" style="display: none">-->
<!--    <h1>活动期间刷图推荐</h1>-->

<!--    <table class="recommendation-table">-->
<!--      <tbody>-->
<!--      <tr>-->
<!--        <td>材料</td>-->
<!--        <td>推荐关卡</td>-->
<!--        <td>关卡效率</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td>全新装置</td>-->
<!--        <td>14-16、14-8、14-12、14-19</td>-->
<!--        <td>125%(副本掉率提升+理智小样)</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td>酮凝集组</td>-->
<!--        <td>14-20、14-14、14-6、14-9、14-17</td>-->
<!--        <td>125%(副本掉率提升+理智小样)</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td>化合切削液</td>-->
<!--        <td>12-17</td>-->
<!--        <td>112%(仅理智小样)</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td>固源岩系</td>-->
<!--        <td>1-7</td>-->
<!--        <td>112%(仅理智小样)</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td> 其他精英材料</td>-->
<!--        <td>对应的主线最优关</td>-->
<!--        <td>112%(仅理智小样)</td>-->
<!--      </tr>-->
<!--      <tr>-->
<!--        <td>资源本<br>龙门币/芯片/红票等</td>-->
<!--        <td>对应的最高级资源关</td>-->
<!--        <td> 112%(仅理智小样)</td>-->
<!--      </tr>-->
<!--      </tbody>-->
<!--    </table>-->
<!--    <span>*关卡效率：关卡掉落物品的总价值 / 关卡理智消耗，数值越大越推荐刷。<br>图上数据非最终结论，仅供参考，其他材料up关卡未必差。后续可查看一图流网站实时更新的材料一图流</span>-->
<!--    <span>代币仅在第14章掉落，优先搬空商店。<br>效率计算：明日方舟一图流 https://ark.yituliu.cn<br>掉落数据：企鹅物流数据统计 https://penguin-stats.cn<br></span>-->

<!--    &lt;!&ndash;      <span style="text-align: right;">制图：&emsp;B站@逻辑元LogicalByte</span>&ndash;&gt;-->
<!--    <span style="text-align: right;">数据收集时间：&emsp;2024.5.3 09:00</span>-->
<!--  </div>-->

  <v-card class="stage-legend-card">
    <table class="stage-legend-table">
      <tbody>
      <tr>
        <td>
          <ItemImage :item-id="'AP_GAMEPLAY'" ></ItemImage>
        </td>
        <td class="stage-legend-text-1">
          <span>需要所有材料→</span>
        </td>
        <td class="stage-legend-text-2">
          <span>14-17</span>
        </td>
        <td class="stage-legend-text-3">
          <span class="stage-legend-text-bold" >[综合效率]</span>
          <br>
          <span class="stage-legend-text-underline">
                所有掉落物的价值之和
            </span>
          <br>
          <span>理智消耗</span>
        </td>
        <td class="stage-legend-text-4">
          <span class="stage-legend-text-bold">[综合效率]</span>
        </td>
      </tr>

      <tr>
        <td>
          <ItemImage :item-id="'30024'"></ItemImage>
        </td>
        <td class="stage-legend-text-1">
            <span>
              需要<span style="color: #c01dd7;font-weight: bold">紫材料→</span>
              </span>
        </td>
        <td class="stage-legend-text-2">
          <span>14-17</span>
        </td>
        <td class="stage-legend-text-3">
          <span class="stage-legend-text-bold" style="color: #c01dd7;">[T4效率]</span>
          <br>
          <span class="stage-legend-text-underline">
              <span style="color: #c01dd7;font-weight: bold">紫</span>
              <span style="color: #0276f8;font-weight: bold">蓝</span>
              <span style="color: #01c028;font-weight: bold">绿</span>
              <span>白[糖]价值之和 </span>
            </span>
          <br>
          <span>理智消耗</span>

        </td>
        <td class="stage-legend-text-4">
          <span class="stage-legend-text-bold">[综合效率]</span>
        </td>
      </tr>

      <tr>
        <td>
          <ItemImage :item-id="'30023'"></ItemImage>
        </td>
        <td class="stage-legend-text-1">
            <span>
              需要<span style="color: #0276f8;font-weight: bold;">蓝材料→</span>
              </span>
        </td>
        <td class="stage-legend-text-2">
          <span>MB-6</span>
        </td>
        <td class="stage-legend-text-3">
          <span class="stage-legend-text-bold" style="color: #0276f8;">[T3效率]</span>
          <br>
          <span class="stage-legend-text-underline">
              <span style="color: #0276f8;font-weight: bold">蓝</span>
              <span style="color: #01c028;font-weight: bold">绿</span>
              <span>白[糖]价值之和 </span>
            </span>
          <br>
          <span>理智消耗</span>
        </td>
        <td class="stage-legend-text-4">
          <span class="stage-legend-text-bold">[综合效率]</span>
        </td>
      </tr>
      </tbody>
    </table>
  </v-card>
</template>