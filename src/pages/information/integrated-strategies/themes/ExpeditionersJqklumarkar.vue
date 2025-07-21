<script lang="js" setup>
import {Coin, Flag, MoreFilled, Refresh, Right} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
import Battle from '@/components/information/Battle.vue'
</script>

<template>
  <!-- 探索者的银凇止境 -->
  <!-- 事件：https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BB%AA%E5%BC%8F%E7%94%A8%E5%93%81%E7%B4%A2%E5%BC%95 -->
  <!-- 区域：https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83#%E5%8C%BA%E5%9F%9F -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>越过群山</h3>
          <el-timeline>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B0%E8%BF%87%E8%90%A8%E7%B1%B3%E7%9A%84%E8%87%82%E8%86%80"
                    target="_blank"
                    type="primary"
                >
                  “走过萨米的臂膀”
                </el-link>
                事件，选择“前进”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E5%B7%8D%E5%B3%A8%E9%93%B6%E5%87%87" target="_blank"
                         type="primary">
                  【ISW-DF 巍峨银凇】
                </el-link>
                或
                <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E6%B7%B1%E5%AF%92%E9%80%A0%E5%83%8F"
                         target="_blank" type="primary">
                  <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
                    <el-text tag="ins" type="primary">【ISW-DF 深寒造像】</el-text>
                  </el-tooltip>
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第二结局">
        <el-card>
          <h3>直至冬夜降临</h3>
          <el-timeline>
            <el-timeline-item :icon="Refresh" type="success">
              <div>
                进入任意一个失与得节点，选择“提升4坍缩值，获得一组特别的密文板”选项，获得
                <el-tooltip content="变为木裂前兆，只能和“伤痕”组合" effect="light" placement="top"
                >
                  <el-text tag="ins">“空无”</el-text>
                </el-tooltip>
                和
                <el-tooltip content="变为木裂前兆，只能和“空无”组合" effect="light" placement="top"
                >
                  <el-text tag="ins">“伤痕”</el-text>
                </el-tooltip>
                密文版
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                使用空无和伤痕组合，宣告任意一个非命运所指或险路恶敌节点，使之转换为包含
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%9C%A8%E8%A3%82%E5%89%8D%E5%85%86"
                    target="_blank"
                    type="primary"
                >
                  “木裂前兆”
                </el-link>
                事件的命运所指节点，进入其中遭遇事件，并选择“搜索营地”，获得
                <el-tooltip content="希望+3，让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【树痕之盔】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B0%E8%BF%87%E8%90%A8%E7%B1%B3%E7%9A%84%E8%87%82%E8%86%80"
                    target="_blank"
                    type="primary"
                >
                  “走过萨米的臂膀”
                </el-link>
                事件，选择“戴上头盔”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E8%90%A8%E7%B1%B3%E4%B9%8B%E7%86%B5" target="_blank"
                         type="primary">
                  【ISW-DF 萨米之熵】
                </el-link>
                或
                <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E8%99%9A%E6%97%A0%E4%B9%8B%E5%81%B6"
                         target="_blank" type="primary">
                  <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
                    <el-text tag="ins" type="primary">【ISW-DF 虚无之偶】</el-text>
                  </el-tooltip>
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第三结局">
        <el-card>
          <h3>自深处的一瞥</h3>
          <el-timeline>
            <el-timeline-item :icon="Right" type="primary">
              <div>
                进入任意一个先行一步节点，触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%8E%A2%E5%AF%BB%E5%89%8D%E8%B7%AF"
                    target="_blank"
                    type="primary"
                >
                  “探寻前路”
                </el-link>
                事件，选择“征求凛视的意见”，获得
                <el-tooltip content="除第6层外的所有普通战斗和紧急战斗将出现额外的敌人，让探索开启不同的方向"
                            effect="light" placement="top"
                >
                  <el-text tag="ins">【路网】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                <el-tooltip content="命运所指节点前必定为无纵向通路的紧急作战" effect="light" placement="top"
                >
                  <el-text tag="ins">在下一层的最下方通路处进入命运所指节点</el-text>
                </el-tooltip>
                ，触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%82%B2%E8%A7%82%E8%80%85%E5%9B%9A%E7%AC%BC"
                    target="_blank"
                    type="primary"
                >
                  “悲观者囚笼”
                </el-link>
                事件，选择“捧起祭坛上的花”，获得
                <el-tooltip content="坍缩值+3，让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【无垠赠礼】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                若路网对应的命运所指节点刷新在了第5层，则有可能会覆盖掉事件为
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B0%E8%BF%87%E8%90%A8%E7%B1%B3%E7%9A%84%E8%87%82%E8%86%80"
                    target="_blank"
                    type="primary"
                >
                  “走过萨米的臂膀”
                </el-link>
                的命运所指节点
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E5%9B%AD%E4%B8%81" target="_blank" type="primary">
                  【ISW-DF 园丁】
                </el-link>
                或
                <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E5%93%A8%E5%85%B5" target="_blank"
                         type="primary">
                  <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
                    <el-text tag="ins" type="primary">【ISW-DF 哨兵】</el-text>
                  </el-tooltip>
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>终始</h3>
          <el-timeline>
            <el-timeline-item :icon="Coin" type="success">
              <div>
                进入任意一个诡意行商节点，寻找并购买
                <el-tooltip content="让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【视界邀约】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                持有视界邀约可触发不期而遇
                <el-tooltip
                    content="进入【深埋迷境】外的不期而遇时大概率遭遇，不期而遇节点没有处于全面勘察状态时更有可能遭遇"
                    effect="light" placement="top"
                >
                  <el-link
                      href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8F%98%E5%8C%96"
                      target="_blank"
                      type="primary"
                  >
                    “变化”
                  </el-link>
                </el-tooltip>
                ，选择“出示视界邀约“，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-SP_%E9%BB%84%E6%B2%99%E5%B9%BB%E5%A2%83"
                    target="_blank"
                    type="primary"
                >
                  【ISW-SP 黄沙幻境】
                </el-link>
                ，获胜后获得
                <el-tooltip content="让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【维度流质】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                在路途上收集
                <el-tooltip
                    content="所有我方单位的生命、攻击力、防御力+1%；有时会发挥奇妙的效果（奇妙的效果：持有此收藏品时进入部分事件将出现能够获得更多收益/不需要支付代价的隐藏选项，此类选项会要求失去该收藏品）"
                    effect="light" placement="top"
                >
                  <el-text tag="ins">【安玛的爱】</el-text>
                </el-tooltip>
                、
                <el-tooltip content="希望+3，让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【树痕之盔】</el-text>
                </el-tooltip>
                、
                <el-tooltip content="坍缩值+3，让探索开启不同的方向" effect="light" placement="top"
                >
                  <el-text tag="ins">【无垠赠礼】</el-text>
                </el-tooltip>
                以逐步减小重构事件的削弱力度
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                <el-tooltip content="若是在第6层获得的【维度流质】，则会在第7层遭遇第四结局对应的关卡" effect="light"
                            placement="top"
                >
                  <el-text tag="ins">抵达第6层</el-text>
                </el-tooltip>
                ，在所遇到的第一个命运所指节点触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E9%87%8D%E6%9E%84"
                    target="_blank"
                    type="primary"
                >
                  “重构”
                </el-link>
                事件，视情况做出选择，而后通过该节点
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                在所遇到的第二个命运所指节点触发
                <el-link
                    href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E4%B8%80%E5%B0%8F%E6%AD%A5"
                    target="_blank"
                    type="primary"
                >
                  “探索者的一小步”
                </el-link>
                事件，随后通过该节点
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%97%B6%E5%85%89%E4%B9%8B%E6%B2%99" target="_blank"
                         type="primary">
                  【ISW-DF 时光之沙】
                </el-link>
                或
                <el-link
                    :underline="false"
                    href="https://prts.wiki/w/ISW-DF_%E8%BF%88%E5%85%A5%E6%B0%B8%E6%81%92"
                    target="_blank"
                    type="primary"
                >
                  <el-tooltip content="挑战自然·12及以上，35%概率遭遇" effect="light" placement="top">
                    <el-text tag="ins" type="primary">【ISW-DF 迈入永恒】</el-text>
                  </el-tooltip>
                </el-link>
                达成结局
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