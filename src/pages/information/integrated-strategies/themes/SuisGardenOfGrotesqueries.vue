<script lang="js" setup>
import {Coin, Flag, MoreFilled} from '@element-plus/icons-vue'
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
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%A5%A0%E5%A0%82%E5%8F%A3"
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
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入岁兽残识（是非境），
                <el-tooltip
                    content="在距离探索中心更远的位置更可能碰到此节点"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">在抉择节点触发事件</el-text>
                </el-tooltip>
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%A6%86%E8%9D%B6"
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
            <el-timeline-item :icon="Battle" color="#5EDFD6">
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
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%A5%A0%E5%A0%82%E5%8F%A3"
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
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入岁兽残识（是非境），在杂疑节点触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%89%A7%E6%A3%8B"
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
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                进入指点迷津节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%83%9B%E5%A0%82"
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
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>无中生有</h3>
          <el-timeline>
            <el-timeline-item :icon="Coin" type="success">
              <div>
                进入岁兽残识（是非境），在
                <el-tooltip
                    content="每个易与节点大概率出售此藏品"
                >
                  <el-text tag="ins">易与</el-text>
                </el-tooltip>
                节点购买藏品
                <el-tooltip
                    content="领袖与精英敌人的防御力+30%，攻击速度+20，且每个存活的雕伥将扣除1点目标生命值（不会低于1），在先行一步中有奇妙的作用"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【无封长盒】</el-text>
                </el-tooltip>
                （消耗5目标生命值，购买时需至少拥有6目标生命值）
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入先行一步节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%8E%8C%E7%81%AF%E4%B8%8E%E5%BC%95%E7%83%9B"
                    target="_blank"
                    type="primary"
                >
                  “掌灯与引烛”
                </el-link>
                ，选择“提请起盒”，令一名干员<b>入卷</b>
              </div>
              <div>
                <span
                    class="optional warning">（注意）</span><b>入卷的干员将无法参与所有后续战斗，直至在第四结局最终关前一个命运所指节点中回归</b>；该干员回归时也可获得进阶嘉奖，但无法燃烛
              </div>
              <div>
                <span class="optional warning">（注意）</span>首次令干员入卷后将获得收藏品
                <el-tooltip
                    content="希望+3，使见字祠（第5层）中的险路恶敌更加艰难，让探索开启不同的方向"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【无墨长卷】</el-text>
                </el-tooltip>
                ，这会使第5层的第一结局最终关变化为
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E5%A4%A9%E6%95%B0%E5%B0%86%E6%98%93"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 天数将易】
                </el-link>
                ，第二结局最终关变化为
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E5%BE%80%E6%98%94%E9%9A%BE%E5%BF%86"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 往昔难忆】
                </el-link>
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                只要仍持有无墨长卷，在之后的先行一步节点中就可以继续令干员入卷
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E6%9C%AB%E7%8B%A9"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 末狩】
                </el-link>
                达成结局
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                本层的误入奇境节点必定触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8F%A4%E4%BB%8A%E4%BA%A4%E6%B1%87"
                    target="_blank"
                    type="primary"
                >
                  “古今交汇”
                </el-link>
                ，可选择“融入残识”（获得7点烛火）或“焚香点烛”（燃烛1名干员后获得6烛火），并进入一个全新的岁兽残识（今昔境）。<b>仅在这个全新的岁兽残识中，进入杂疑节点可触发事件</b>
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8F%AA%E4%B8%BA%E6%98%8E%E6%97%A5"
                    target="_blank"
                    type="primary"
                >
                  “只为明日”
                </el-link>
                ，选择“展开侦察”，以获得额外的令干员入卷的机会
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                本层的命运所指节点必定触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%A4%A7%E7%8B%A9%E7%BB%B4%E5%A4%A9"
                    target="_blank"
                    type="primary"
                >
                  “大狩维天”
                </el-link>
                ，通过该节点后，所有的非入卷干员将被禁用，而先前入卷的干员将全部回归可供调遣，因此请确保游园期间运送足够多的干员入卷
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第五结局">
        <el-card>
          <h3>落子无悔</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入岁兽残识（是非境），在故肆节点触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%82%B9%E7%9D%9B"
                    target="_blank"
                    type="primary"
                >
                  “点睛”
                </el-link>
                ，选择
                <el-tooltip content="消耗5目标生命上限（不会使目标生命上限低于1）">
                  <el-text tag="ins">“点墨生器”</el-text>
                </el-tooltip>
                ，获得
                <el-tooltip
                    content="获得该收藏品将失去全部源石锭和剩余希望，且此后的战斗中获得的指挥经验和源石锭-50%"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【追忆仪】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                进入误入奇境节点，触发
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%9C%B0%E9%95%87"
                    target="_blank"
                    type="primary"
                >
                  “地镇”
                </el-link>
                选择"凝视仪器"，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E5%BD%95%E5%BF%86"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 录忆】
                </el-link>
                ，获胜后获得
                <el-tooltip
                    content="持有该收藏品时，费用自然回复速度-50%；在这场战斗中，您将遭遇【朔壳】"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【"小磨唧"】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                在指点迷津节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%83%9B%E5%A0%82"
                    target="_blank"
                    type="primary"
                >
                  “烛堂”
                </el-link>
                ，选择“拆解岁护”，获得
                <el-tooltip
                    content="持有该收藏品时，所有敌人的攻击力+30%，且【伺烛客】将在界园中随拿取后的层数提升失去攻击力与最大生命值，直至进入最后一层后失去大部分战斗能力"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【不息】</el-text>
                </el-tooltip>
                与9票券
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                进入岁兽残识（是非境），在故肆节点再次触发“点睛”事件，选择“拆解岁护”，获得
                <el-tooltip
                    content="持有该收藏品时，所有敌人的生命值和防御力+50%，并使最后一层的作战中出现被召唤的敌人"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【不赦】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E5%AE%9A%E4%B9%BE%E5%9D%A4" target="_blank" type="primary">
                  【ISW-DF 定乾坤】
                </el-link>
                或
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%AD%A2%E5%8F%98" target="_blank" type="primary">
                  【ISW-DF 止变】
                </el-link>
                达成结局
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                若在此之前触发过事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%94%B6%E7%AC%94"
                    target="_blank"
                    type="primary"
                >
                  “收笔”
                </el-link>
                或
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%A4%A7%E7%8B%A9%E7%BB%B4%E5%A4%A9"
                    target="_blank"
                    type="primary"
                >
                  “大狩维天”
                </el-link>
                ，则先前被禁用的干员将在进入本层时回归
              </div>
              <div>
                <span class="optional warning">（注意）</span>本层仅有2个节点，需提前规划好资源备战方案
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                在本层的命运所指节点中会触发事件
                <el-link
                    href="https://prts.wiki/w/%E5%B2%81%E7%9A%84%E7%95%8C%E5%9B%AD%E5%BF%97%E5%BC%82/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B0%8B%E5%AE%9A"
                    target="_blank"
                    type="primary"
                >
                  “谋定”
                </el-link>
                ，可以选择“朔的身影逐渐清晰”：进入普通难度的战斗，可以选择"望向阴影"，根据当前持有的其它结局/不利收藏品，选择并进入不同的，更加艰难的战斗分支：
              </div>
              <div>
                <ol>
                  <li>
                    溯承形（需持有【墨化残碑】）：“岁”将出现在战场中，妄躯在一段时间后才会出现，
                    <el-link class="li-link" href="https://prts.wiki/w/%E8%BA%AB%E5%BD%A2" target="_blank" type="primary">
                      【身形】
                    </el-link>
                    将反弹部分受到的伤害
                  </li>
                  <li>
                    改对弈（需持有【云与漆】）：“望”将出现在战场中，身形将反弹部分受到的伤害
                  </li>
                  <li>
                    塑旧历（需持有【无墨长卷】）：雕伥将出现在战场中，身形将反弹部分受到的伤害
                  </li>
                  <li>
                    定本源（需持有【不赦】与【不息】）：朔壳和妄躯同时出现在战场中，身形将反弹更多受到的伤害
                  </li>
                  <li>
                    役群兽（需持有【不赦】与【不息】）：易、“岁”、“望”、朔壳和妄躯将全部出现在战场中，身形将反弹更多受到的伤害
                  </li>
                </ol>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="完结"/>
    </el-timeline>
  </div>
</template>

<style scoped>
@import "@/assets/css/information/integratedStrategies.scss";
</style>