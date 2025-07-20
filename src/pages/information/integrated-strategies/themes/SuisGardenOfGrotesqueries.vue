<script lang="js" setup>
import {Flag, MoreFilled} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
import Battle from '@/components/information/Battle.vue'
</script>

<template>
  <!-- 岁的界园志异 -->
  <!-- 事件：https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E7%8F%8D%E7%8E%A9%E9%9B%86%E5%86%8C -->
  <!-- 区域：https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82#%E5%8C%BA%E5%9F%9F -->
  <!-- 通宝：https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E8%97%8F%E9%92%B1%E6%9C%A8%E7%9B%92 -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>依律镇抚</h3>
          <el-timeline>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发事件
                <el-link
                    href="#"
                    target="_blank"
                    type="primary"
                >
                  “祠堂口”
                </el-link>
                ，选择“行仪”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E7%A0%B4%E5%B2%81%E9%98%B5%E7%A5%80" target="_blank"
                         type="primary">
                  【ISW-DF 破岁阵祀】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第二结局">
        <el-card>
          <h3>长卷留痕</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="warning">
              <div>
                进入岁兽残识，
                <el-tooltip
                    content="在距离探索中心更远的传说节点更可能遭遇此事件"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">在传说节点触发事件</el-text>
                </el-tooltip>
                <el-link
                    href="#"
                    target="_blank"
                    type="primary"
                >
                  “榆蝶”
                </el-link>
                事件，选择“出钱”（消耗30源石锭，稳定获得），或选择“先带她回去”（消耗所有源石锭，有概率获得），获得
                <el-tooltip
                    content="携带此收藏品时，作战会遭遇“岁躯”的袭击"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【隐蝶墨】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" type="warning">
              <div>
                在后继作战中，第5层险路恶敌的前一个命运所指节点前将
                <el-link
                    href="https://prts.wiki/w/%E2%80%9C%E5%B2%81%E8%BA%AF%E2%80%9D"
                    target="_blank"
                    type="primary"
                >
                  “岁躯”
                </el-link>
                的生命值削减至50%及以下，即可在达成触发条件的当次战斗结束后获得
                <el-tooltip
                    content="战斗开始时，随机选择一名干员，使该干员本场战斗的部署费用变为0，携带此收藏品时，可以在命运所指中让探索开启不同的方向"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【墨化残碑】</el-text>
                </el-tooltip>
                ，且在后继的战斗中，“岁躯”将不再出现
              </div>
              <div>
                <span class="optional warning">（注意）</span>“岁躯”在每一次作战中最多出现1次，且每次出现最长滞留20秒，需规划好输出时机与时间
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发事件
                <el-link
                    href="#"
                    target="_blank"
                    type="primary"
                >
                  “祠堂口”
                </el-link>
                ，选择“奉碑行仪”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%98%94%E5%AD%97%E5%A6%82%E7%83%9F" target="_blank"
                         type="primary">
                  【ISW-DF 昔字如烟】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第三结局">
        <el-card>
          <h3>黑白入玄</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="success">
              <div>
                进入岁兽残识，在杂疑节点触发事件
                <el-link
                    href="#"
                    target="_blank"
                    type="primary"
                >
                  “执棋”
                </el-link>
                ，选择“掀翻棋盘”（需至少5名干员成为伺烛客），并“取走棋盘”，获得
                <el-tooltip
                    content="干员部署后损失50%的技力值；携带此收藏品时，指点迷津中会出现一场特殊的作战"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【忘生玲珑】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" type="success">
              <div>
                进入指点迷津，触发事件
                <el-link
                    href="#"
                    target="_blank"
                    type="primary"
                >
                  “烛堂”
                </el-link>
                ，选择“棋盘对火，字盘对光”，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-NO_%E5%88%86%E6%98%8E"
                    target="_blank"
                    type="primary"
                >
                  【ISW-NO 分明】
                </el-link>
                ，获胜后获得
                <el-tooltip content="干员部署后60s内，每秒流失2%的最大生命值，让探索开启不同的方向" effect="light"
                            placement="top"
                >
                  <el-text tag="ins">【云与漆】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E8%B0%8B%E5%B2%81%E8%80%85" target="_blank" type="primary">
                  【ISW-DF 谋岁者】
                </el-link>
                达成结局
              </div>
              <div>
                <span class="optional warning">（注意）</span>本场险路恶敌作战仅可使用伺烛客干员作战，需提前规划好干员燃烛方案
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="未完待续"/>
    </el-timeline>
  </div>
</template>

<style scoped>
@import "@/assets/css/information/integratedStrategies.scss";
</style>