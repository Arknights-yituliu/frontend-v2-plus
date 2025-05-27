<script setup>
import itemWeightTable from '/docs/static/json/item-weight.json'
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {formatNumber} from "/src/utils/format.js";
import {ref} from "vue";
import StageDrop12_17 from  '/docs/static/json/drop_12-17.json'

const stageDropValue = ref(0)

function dropValueSum(){
  stageDropValue.value = 0
  for(const item of StageDrop12_17){
    stageDropValue.value+=item.itemValue*item.knockRating
  }
}
dropValueSum()
</script>


<template>

  <h1 id="set-initial-value">精英材料价值计算</h1>
  <v-divider ></v-divider>

  <h2 id="set-initial-value">1.设定初始值</h2>
  <v-divider ></v-divider>
  给蓝色品质材料（T3）和加工副产物期望价值设定一个初始价值
  <p>注1：初始值可随意写入，单位为理智，推荐用绿票商店的材料标价（可以直接/1.25,能更快得出结果)，写入其他值也可以</p>
  <p>注2：加工副产物期望价值不用很准确，仅作为初始值使用</p>
  <v-card>
    <v-table class="freeze-table-first-column">
      <thead>
      <tr>
        <th>材料等级</th>
        <th>加工期望产出</th>
      </tr>
      </thead>
      <tbody>
      <tr>
        <td>t4</td>
        <td>80.481941</td>
      </tr>
      <tr>
        <td>t3</td>
        <td>28.79127726</td>
      </tr>
      <tr>
        <td>t2</td>
        <td>6.057</td>
      </tr>
      <tr>
        <td>t1</td>
        <td>2.019</td>
      </tr>
      </tbody>
    </v-table>
  </v-card>


  <h2 id="calculate-value">2.计算材料价值</h2>
  <v-divider ></v-divider>
  通过蓝色品质材料（T3）获取其他品质（T1、T2、T4）材料的价值
  <h3 id="calculate-example-1">计算示例</h3>
  <span class="green">固源岩</span>的价值
  <p>已知<span class="blue">固源岩组</span>的合成公式为：
    5 * <span class="green">固源岩</span> + 合成消耗龙门币 = <span
        class="blue">固源岩组</span> + 加工副产物 * 加工爆率</p>
  <p><span class="green">固源岩</span>价值 = <span class="blue">固源岩组</span>价值
    ÷ 5 - 合成消耗龙门币 + 加工副产物 * 加工爆率 </p>
  <span class="purple">提纯源岩</span>的价值
  <p>已知<span class="purple">提纯源岩</span>的合成公式为 4 * <span
      class="blue">固源岩组</span> + 合成消耗龙门币 = <span
      class="purple">提纯源岩</span> + 加工副产物 * 加工爆率</p>
  <p><span class="purple">提纯源岩</span>价值 = <span
      class="blue">固源岩组</span>价值 * 4 + 合成消耗龙门币 - 加工副产物 * 加工爆率</p>

  <h2 id="calculate-stage-expected-output">3.计算关卡期望产出理智</h2>
  <v-divider ></v-divider>
  根据企鹅物流上每个材料关卡的材料掉率计算该关卡的期望产出理智
  <h3 id="calculate-example-2">计算示例</h3>
  <p>计算12-17的期望产出（数值仅为示例，非准确值）</p>
  <v-card>
    <v-table class="freeze-table-first-column">
      <thead>
      <tr>
        <th>材料</th>
        <th>名称</th>
        <th>价值</th>
        <th>爆率</th>
        <th>期望产出</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item in StageDrop12_17">
        <td><ItemImage :item-id="item.itemId"></ItemImage></td>
        <td>{{item.itemName}}</td>
        <td> {{formatNumber(item.itemValue,3) }}</td>
        <td> {{formatNumber(item.knockRating,3) }}</td>
        <td> {{formatNumber(item.itemValue*item.knockRating,3) }}</td>
      </tr>
      <tr>
        <td > </td>
        <td > </td>
        <td > </td>
        <td > 关卡期望总产出</td>
        <td>{{formatNumber(stageDropValue)}}</td>
      </tr>
      </tbody>
    </v-table>
  </v-card>

  <h2 id="calculate-processing-byproduct-expected-output">4.计算加工副产物期望产出</h2>
  <v-divider ></v-divider>
  计算各级材料的加工副产物期望产出
  <v-expansion-panels >
    <v-expansion-panel title="加工站副产物爆率表">
      <v-expansion-panel-text>
        <v-table class="freeze-table-first-column">
          <thead>
          <tr>
            <th>材料</th>
            <th>名称</th>
            <th>爆率</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in itemWeightTable">
            <td><ItemImage :item-id="item.itemId"></ItemImage></td>
            <td>{{item.itemName}}</td>
            <td> {{formatNumber(item.weight,3) }}</td>
          </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>

  <h2 id="iterate-material-value"> 5.平衡蓝色等级材料价值</h2>
  <v-divider ></v-divider>
  根据上面得到的关卡期望产出对蓝色等级材料的价值进行处理
  <p>认为关卡理智转化率不得大于1</p>
  <p>12-17消耗理智为21理智</p>
  <p>12-17期望产出为25.59理智</p>
  <p>12-17的理智转化率为1.218571</p>
  <p>将化合切削液的价值32/1.2366得到新的价值26.260</p>

  <h2 id="repeat-iterate-material-value"> 6.重复迭代材料价值</h2>
  <v-divider ></v-divider>
  将以上步骤2、3、4、5继续重新执行，直至所有蓝材料的理智转化率-1小于0.00001

  <h1 id="set-initial-value">精英材料价值计算</h1>
  <v-divider ></v-divider>
</template>