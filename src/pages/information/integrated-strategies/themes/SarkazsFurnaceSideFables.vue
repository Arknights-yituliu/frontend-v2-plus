<script lang="js" setup>
import {Flag, MoreFilled, Refresh, Search} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
import Battle from '@/components/information/Battle.vue'
</script>

<template>
  <!-- 萨卡兹的无终奇语 -->
  <!-- 事件：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E6%83%B3%E8%B1%A1%E5%AE%9E%E4%BD%93%E5%9B%BE%E9%89%B4 -->
  <!-- 区域：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD#%E5%8C%BA%E5%9F%9F -->
  <!-- 思绪：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BD%9A%E6%95%A3%E6%80%9D%E7%BB%B4%E8%BE%91%E5%BD%95 -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>憧憬未来</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                进入不期而遇，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%A1%A8%E8%BE%BE%E6%AC%B2"
                    target="_blank"
                    type="primary"
                >
                  “表达欲”
                </el-link>
                ，选择
                <el-tooltip content="消耗2缕构想">
                  <el-text tag="ins">“奋起反抗”</el-text>
                </el-tooltip>
                获得
                <el-tooltip
                    content="所有敌方单位的攻击速度+30，移动速度+30%，最大生命值+30%，可在虚实疆界中探索不同的险路恶敌"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【滚动先祖】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%B0%BE%E9%A1%B5"
                    target="_blank"
                    type="primary"
                >
                  “尾页”
                </el-link>
                ，选择“哎呀！”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E7%B4%A7%E6%80%A5%E6%8E%88%E8%AF%BE" target="_blank"
                         type="primary">
                  【ISW-DF 紧急授课】
                </el-link>
                或
                <el-link
                    :underline="false"
                    href="https://prts.wiki/w/ISW-DF_%E6%80%9D%E7%BB%B4%E7%9F%AB%E6%AD%A3"
                    target="_blank"
                    type="primary"
                >
                  <el-tooltip
                      content="持有【滚动先祖】，在“尾页”事件中选择“死魂灵从口中涌出”或“莲花瓣从口中飘落”遭遇"
                      effect="light"
                      placement="top"
                  >
                    <el-text tag="ins" type="primary">【ISW-DF 思维矫正】</el-text>
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
          <h3>双王记</h3>
          <el-timeline>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第2层的第一个节点（必定为命运所指）时，触发
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%88%B4%E5%86%A0%E5%BC%8F"
                    target="_blank"
                    type="primary"
                >
                  “戴冠式”
                </el-link>
                事件，选择“两人为对方带上冠冕”，获得
                <el-tooltip
                    content="与无字地契解读后获得巴别塔誓言"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">“纯白花瓣”</el-text>
                </el-tooltip>
                和
                <el-tooltip
                    content="与纯白花瓣解读后获得巴别塔誓言"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">“无字地契”</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Search" type="warning">
              <div>
                在任意一个去伪存真节点将纯白花瓣和无字地契组合成
                <el-tooltip
                    content="所有干员的费用+3，让探索开启不同的方向"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【巴别塔誓言】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                进入不期而遇，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%A1%A8%E8%BE%BE%E6%AC%B2"
                    target="_blank"
                    type="primary"
                >
                  “表达欲”
                </el-link>
                ，选择
                <el-tooltip content="消耗2缕构想">
                  <el-text tag="ins">“奋起反抗”</el-text>
                </el-tooltip>
                获得
                <el-tooltip
                    content="所有敌方单位的攻击速度+30，移动速度+30%，最大生命值+30%，可在虚实疆界中探索不同的险路恶敌"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【滚动先祖】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional">（可选）</span>
                持有巴别塔誓言可触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%A6%BB%E5%8E%BB%E8%80%85%E7%9A%84%E5%BA%AD%E9%99%A2"
                    target="_blank"
                    type="primary"
                >
                  “离去者的庭院”
                </el-link>
                ，选择“阿斯卡纶”（获得3希望）或“触痕”（回复6目标生命）或“菲茨罗伊”（获得5源石锭）或“埃里克森”（获得1缕较为稀有的思绪）或“阿米娅”（获得
                <el-tooltip
                    content="尊主的残影最大生命值下降50%"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【十戒】</el-text>
                </el-tooltip>
                ）
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，在险路恶敌的前一个命运所指节点中触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%B0%BE%E9%A1%B5"
                    target="_blank"
                    type="primary"
                >
                  “尾页”
                </el-link>
                ，选择“报出魔王的名讳”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%9C%9D%E8%B0%92" target="_blank" type="primary">
                  【ISW-DF 朝谒】
                </el-link>
                或
                <el-link
                    :underline="false"
                    href="https://prts.wiki/w/ISW-DF_%E9%AD%82%E7%81%B5%E6%9C%9D%E8%B0%92"
                    target="_blank"
                    type="primary"
                >
                  <el-tooltip
                      content="持有【滚动先祖】，在“尾页”事件中选择“你被捂住了嘴”或“一片寂静”遭遇"
                      effect="light"
                      placement="top"
                  >
                    <el-text tag="ins" type="primary">【ISW-DF 魂灵朝谒】</el-text>
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
          <h3>天使之城</h3>
          <el-timeline>
            <el-timeline-item :icon="Refresh" type="success">
              <div>
                进入任意一个失与得节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8E%9F%E5%88%9D%E5%BC%82%E9%80%94"
                    target="_blank"
                    type="primary"
                >
                  “原初异途”
                </el-link>
                ，选择“一个方盒”，获得
                <el-tooltip
                    content="刷新节点时出现命运所指，在诡谲断章中无法生效"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【先知长角】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                持有先知长角，
                <el-tooltip content="算上后续选项消耗，需至少准备3缕构想">
                  <el-text tag="ins">使用1缕构想刷新出命运所指节点</el-text>
                </el-tooltip>
                ，进入其中触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BE%85%E8%AF%89%E8%AF%B4%E7%9A%84%E7%9C%9F%E7%9B%B8"
                    target="_blank"
                    type="primary"
                >
                  “待诉说的真相”
                </el-link>
                ，选择
                <el-tooltip content="消耗2缕构想">
                  <el-text tag="ins">“用构想补足缺陷”</el-text>
                </el-tooltip>
                ，而后进入一个第三结局专属的诡谲断章
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                在诡谲断章中进入命运所指节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%89%A3%E5%93%8D%E5%BC%82%E9%9F%B3"
                    target="_blank"
                    type="primary"
                >
                  “扣响异音”
                </el-link>
                ，选择“扣动板机”，获得
                <el-tooltip
                    content="年代会更频繁地出现，思绪的负荷+1，让探索开启不同的方向"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【时与光】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E5%9C%A3%E5%9F%8E" target="_blank" type="primary">
                  【ISW-DF 圣城】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>遁入阇那</h3>
          <el-timeline>
            <el-timeline-item :icon="Refresh" type="success">
              <div>
                进入任意一个失与得节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8E%9F%E5%88%9D%E5%BC%82%E9%80%94"
                    target="_blank"
                    type="primary"
                >
                  “原初异途”
                </el-link>
                ，选择“一片莲瓣”，获得
                <el-tooltip
                    content="战斗获得的指挥经验与源石锭-50%，在狭路相逢中会有奇妙的效果"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【片瓣】</el-text>
                </el-tooltip>
                （此藏品削弱力度较大，建议发育至第4层再进行获取）
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                持有片瓣进入狭路相逢节点，选择
                <el-tooltip content="消耗2缕构想">
                  <el-text tag="ins">“将花瓣掷入故事”</el-text>
                </el-tooltip>
                ，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-NO_%E8%BD%BB%E8%88%9F%E5%85%B1%E6%B8%A1"
                    target="_blank"
                    type="primary"
                >
                  【轻舟共渡】
                </el-link>
                ，然后选择第三类敌人（2支
                <el-link
                    href="https://prts.wiki/w/%E6%89%98%E7%94%9F%E8%8E%B2%E5%BA%A7"
                    target="_blank"
                    type="primary"
                >
                  【托生莲座】
                </el-link>
                ），获胜后获得
                <el-tooltip
                    content="领袖与精英敌人最大生命值+50%，第5层中的【险路恶敌】出现额外的【托生莲座】，让探索开启不同的方向"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【阿纳萨羯磨】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                若挑战失败，可以在后续的【狭路相逢】中消耗2构想重复进行挑战
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%8E%88%E6%B3%95" target="_blank" type="primary">
                  【ISW-DF 授法】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第五结局">
        <el-card>
          <h3>无瑕之日</h3>
          <el-timeline>
            <el-timeline-item :icon="Refresh" type="success">
              <div>
                进入任意一个不期而遇节点，触发事件
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%A9%BA%E6%97%A0%E5%89%8D%E5%85%86"
                    target="_blank"
                    type="primary"
                >
                  “空无前兆”
                </el-link>
                ，选择“试着接受它”，获得
                <el-tooltip
                    content="终曲合声会在作战中出现"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【预言显像】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                于作战中击败
                <el-link href="https://prts.wiki/w/%E7%BB%88%E6%9B%B2%E5%90%88%E5%A3%B0" target="_blank" type="primary">
                  【终曲合声】
                </el-link>
                ，获得
                <el-tooltip
                    content="与构想解读获得拯救，可于不期而遇：孤注一掷中使用"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">“绝望”</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Search" type="warning">
              <div>
                <span class="optional">（可选）</span>
                在任意一个去伪存真节点中消耗1~2个构想将“绝望”逐步组合成
                <el-tooltip
                    content="与构想解读获得停止，可于不期而遇：孤注一掷中使用"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">“拯救”</el-text>
                </el-tooltip>
                或
                <el-tooltip
                    content="可于不期而遇：孤注一掷中使用"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">“停止”</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                可以尝试通过
                <el-tooltip content="立即获得上次探索遗留的最多5缕思绪" effect="light" placement="top">
                  <el-text tag="ins">【无主的回忆】</el-text>
                </el-tooltip>
                获取上次探索所遗留的“绝望”/“拯救”/“停止”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                持有（
                <el-tooltip content="对应【终结的骨架】">
                  <el-text tag="ins">绝望</el-text>
                </el-tooltip>
                /
                <el-tooltip content="对应【终结的躯体】">
                  <el-text tag="ins">拯救</el-text>
                </el-tooltip>
                /
                <el-tooltip content="对应【终结的实相】">
                  <el-text tag="ins">停止</el-text>
                </el-tooltip>
                ）可触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%AD%A4%E6%B3%A8%E4%B8%80%E6%8E%B7"
                    target="_blank"
                    type="primary"
                >
                  “孤注一掷”
                </el-link>
                ，选择
                <el-tooltip content="需要“绝望”">
                  <el-text tag="ins">“以开端铸造钥匙”</el-text>
                </el-tooltip>
                或
                <el-tooltip content="需要“拯救”">
                  <el-text tag="ins">“以转变铸造钥匙”</el-text>
                </el-tooltip>
                或
                <el-tooltip content="需要“停止”">
                  <el-text tag="ins">“以终点铸造钥匙”</el-text>
                </el-tooltip>
                ，获得（
                <el-tooltip content="所有干员的部署费用+2，所有敌人受到的物理与法术伤害降低20%" effect="light"
                            placement="top">
                  <el-text tag="ins">【终结的骨架】</el-text>
                </el-tooltip>
                /
                <el-tooltip content="所有干员的部署费用+2，所有敌人受到的物理与法术伤害降低20%，所有敌人攻击力+20%"
                            effect="light" placement="top">
                  <el-text tag="ins">【终结的躯体】</el-text>
                </el-tooltip>
                /
                <el-tooltip
                    content="所有干员的部署费用+2，所有敌人受到的物理与法术伤害降低20%，所有敌人攻击力+20%，最终战场上出现额外敌人（隐藏效果：持有此藏品在战斗失败后强制进入特殊的通向死亡的诡谲断章，与【“拱门”与“呼救”】冲突，最先获取的优先触发。特别地，当在诡谲断章的非最终战斗节点中战斗失败时，该效果会使探索继续。该效果全局生效一次）"
                    effect="light" placement="top">
                  <el-text tag="ins">【终结的实相】</el-text>
                </el-tooltip>
                ）和
                <el-tooltip
                    content="让探索开启不同的方向"
                    effect="light" placement="top">
                  <el-text tag="ins">【无终之钥】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E4%B8%8D%E5%AE%B9%E6%8B%92%E7%BB%9D" target="_blank"
                         type="primary">
                  【ISW-DF 不容拒绝】
                </el-link>
                达成结局
              </div>
              <div>
                <span class="optional warning">（注意）</span>该层只有这一个关卡，若有什么前置运营操作需要在前一层完成
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