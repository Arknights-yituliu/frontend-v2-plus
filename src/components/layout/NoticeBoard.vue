<script setup >
import StageLegend from "@/components/material/StageLegend.vue";
import ModuleHeader from "@/components/layout/ModuleHeader.vue";

const props = defineProps(["modelValue","module"]);

</script>

<template>
  <module-header title="常见问题" title-en="FAQ" />
  <v-card>
    <v-card-text>
      <v-expansion-panels>

        <!--      <v-expansion-panel>-->
        <!--        <template v-slot:title>-->
        <!--          <v-icon icon="mdi-copyright"></v-icon>-->
        <!--          <span class="m-0-4">版权声明与许可协议</span>-->
        <!--        </template>-->
        <!--        <v-expansion-panel-text>-->
        <!--        </v-expansion-panel-text>-->
        <!--      </v-expansion-panel>-->

        <!--      <v-expansion-panel>-->
        <!--        <template v-slot:title>-->
        <!--          <v-icon icon="mdi-copyright"></v-icon>-->
        <!--          <span class="m-0-4">版权声明与许可协议</span>-->
        <!--        </template>-->
        <!--        <v-expansion-panel-text>-->
        <!--        </v-expansion-panel-text>-->
        <!--      </v-expansion-panel>-->

  <!--      <v-expansion-panel>-->
  <!--        <template v-slot:title>-->
  <!--          <v-icon icon="mdi-copyright"></v-icon>-->
  <!--          <span class="m-0-4">版权声明与许可协议</span>-->
  <!--        </template>-->
  <!--        <v-expansion-panel-text>-->
  <!--        </v-expansion-panel-text>-->
  <!--      </v-expansion-panel>-->

  <!--      <v-expansion-panel>-->
  <!--        <template v-slot:title>-->
  <!--          <v-icon icon="mdi-copyright"></v-icon>-->
  <!--          <span class="m-0-4">版权声明与许可协议</span>-->
  <!--        </template>-->
  <!--        <v-expansion-panel-text>-->
  <!--        </v-expansion-panel-text>-->
  <!--      </v-expansion-panel>-->

        <v-expansion-panel v-show="props.module==='item'">
          <template v-slot:title>
            <v-icon icon="mdi-calculator-variant-outline"></v-icon>
            <span class="m-0-4">计算细节</span>
          </template>
          <v-expansion-panel-text>
            <p>物品价值算法：<a href="/docs/item-value-algorithm">文档</a></p>
            <p><b>FAQ</b></p>
            <hr/>
            <ul style="padding-left: 2em">
              <li>Q：你怎么知道数列是收敛的？</li>
              <li><b>A：如果不收敛网站就崩了，你也看不到这句话了。</b></li>
              <li>Q：为什么不用线性规划进行计算？</li>
              <li>
                <b>A：人无法两次踏进同一条河流，线性规划的目标时刻都在变动，随活动UP起伏的价值你喜欢吗？</b>
              </li>
              <li>Q：你这结果有问题啊，XX关的x材料期望明显更低，为什么XX关不是效率最高？</li>
              <li>
                <b>A：大部分关卡都掉落多种材料，单一材料的期望只能说明短期最优，长期最优是要计算副产物的。</b>
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-show="props.module==='pack'">
          <template v-slot:title>
            <v-icon icon="mdi-calculator-variant-outline"></v-icon>
            <span class="m-0-4">计算方式</span>
          </template>
          <v-expansion-panel-text>
            <ul style="padding-left: 2em">
              <li>仅计抽卡：仅计算礼包内的抽卡资源</li>
              <li>材料折合源石：将所有材料折算成源石再计算性价比</li>
              <li>性价比的基准为可无限购买的648源石，材料价值取自<a href="/material/value">物品价值表</a></li>
              <li>每月芯片自选包和每月材料自选包都用价值最高的材料进行计价</li>
              <li>精二券暂以平均价值计价，详情可查阅<a href="/material/elite">精英化与专精性价比</a></li>
              <li>模组块暂以120红票计价，模组条无法计价，请自行权衡</li>
              <li>标准寻访是258黄票38抽，中坚寻访是216黄票38抽，因此价值暂定为216/258=0.837抽</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-show="props.module==='store'">
          <template v-slot:title>
            <v-icon icon="mdi-calculator-variant-outline"></v-icon>
            <span class="m-0-4">计算方式</span>
          </template>
          <v-expansion-panel-text>
            <ul style="padding-left: 2em">
              <li>性价比 = 理智价值 / 商店售价</li>
              <li>物品理智价值算法：<a href="/docs/item-value-algorithm">文档</a></li>
              <li>各商店之间货币不同，故<b>不可跨店对比数值</b>。</li>
              <li>信用交易所的性价比按照<b>原价</b>计算，货币单位为 100 信用。</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-show="props.module==='stage'">
          <template v-slot:title>
            <v-icon icon="mdi-map-legend"></v-icon>
            <span class="m-0-4">算法简述与图例</span>
          </template>
          <v-expansion-panel-text>
            <b>通过[物品价值表]中的物品价值和[企鹅物流数据统计]中的材料掉率计算各个关卡的效率</b>
            <hr/>
            <ul style="padding-left: 2em">
              <li>只有多于300样本的关卡才会被收录。</li>
              <li>仅收录由自动刷图软件上报的掉落数据。</li>
              <li>活动关卡只在活动期间出现。</li>
              <li>插曲和别传常驻后重新计算效率，该效率与活动时无关。</li>
            </ul>
            <b>图例</b>
            <hr/>
            <StageLegend ></StageLegend>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel>
        <template v-slot:title>
          <v-icon icon="mdi-copyright"></v-icon>
          <span class="m-0-4">版权声明与许可协议</span>
        </template>
          <v-expansion-panel-text>
            网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
            Arknights/上海鹰角网络科技有限公司。<br>
            除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享
            署名-非商业性使用 4.0 国际
            许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和直接指向被引用页面的链接；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
            本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a
              href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>

</template>

<style scoped >
.notice-board-table{
  border-collapse: collapse;
  td{
    padding: 12px;

  }
}


</style>
