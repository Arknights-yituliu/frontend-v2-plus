<script lang="js" setup>
import { Coin, Flag, MoreFilled, Refresh, Right, Warning } from "@element-plus/icons-vue";
import BOSS from "@/components/information/BOSS.vue";
import Battle from "@/components/information/Battle.vue";
</script>

<template>
  <!-- 沉沦者的黑流树海 -->
  <!-- 事件：https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E6%8B%9F%E9%80%A0%E7%89%A9%E8%B4%A8%E7%BC%96%E7%9B%AE -->
  <!-- 区域：https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7#%E5%8C%BA%E5%9F%9F -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>强制重启</h3>
          <el-timeline>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第5层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%B0%B8%E6%97%A0%E5%AE%89%E5%AE%81" target="_blank" type="primary"> 【ISW-DF 永无安宁】 </el-link>
                或
                <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E7%97%9B%E8%8B%A6%E5%B0%86%E6%81%AF" target="_blank" type="primary">
                  <el-tooltip content="触发“追猎”事件遭遇" effect="light" placement="top">
                    <el-text tag="ins" type="primary">【ISW-DF 痛苦将息】</el-text>
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
          <h3>维度重构</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <b>方式一：</b>
                进入不期而遇，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%BA%BF%E4%BA%BA"
                  target="_blank"
                  type="primary"
                >
                  “线人”
                </el-link>
                ，选择“我受雇于梅兰德”，获得
                <el-tooltip content="我方单位部署费用+2，让探索开启不同的方向，同时持有【沙盘β】可以揭示源阶方的所在位置" effect="light" placement="top">
                  <el-text tag="ins">【沙盘α】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                含有二结局关键藏品的不期而遇在地图上会有特殊标识“线人与线索”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Coin" type="success">
              <div>
                <b>方式二：</b>
                进入诡意行商，购买
                <el-tooltip content="我方单位部署费用+3，让探索开启不同的方向，同时持有【沙盘α】可以揭示源阶方的所在位置" effect="light" placement="top">
                  <el-text tag="ins">【沙盘β】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第5层，若持有【沙盘α】或【沙盘β】，地图上会刷新出3个命运所指节点，进入包含二结局最终关卡的命运所指节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%AA%A5%E8%A7%86%E7%AE%B1%E4%B8%AD"
                  target="_blank"
                  type="primary"
                >
                  “窥视箱中”
                </el-link>
                ，选择“保护证据，查缴那些机器！”使该节点变为二结局最终关卡
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                若同时持有【沙盘α】和【沙盘β】，包含二结局最终关卡的命运所指节点上会有特殊标识“谜题与谜底”
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Warning" type="danger">
              <div>
                <span class="optional warning">（注意）</span>
                若进入没有包含二结局最终关卡的命运所指节点，会遭遇事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%A5%BD%E5%A5%87%E5%BF%83%E4%B8%8E%E6%AD%BB"
                  target="_blank"
                  type="primary"
                >
                  “好奇心与死”
                </el-link>
                ，选择“修正结果，必须找到目标”（消耗50源石锭），可为正确节点添加“谜题与谜底”特殊标识
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Warning" type="danger">
              <div>
                <span class="optional warning">（注意）</span>
                不要攻克第5层一开始就能看见的险路恶敌节点——那是第一结局的最终关卡
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E6%B7%B7%E6%B2%8C%E6%BA%90%E9%98%B6%E7%90%86%E8%AE%BA" target="_blank" type="primary">
                  【ISW-DF 混沌源阶理论】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第三结局">
        <el-card>
          <h3>纠缠，调和</h3>
          <el-timeline>
            <el-timeline-item :icon="Right" type="primary">
              <div>
                进入先行一步节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%9C%AA%E6%B6%89%E8%B6%B3%E4%B9%8B%E6%A0%91"
                  target="_blank"
                  type="primary"
                >
                  “未涉足之树”
                </el-link>
                ，选择“尝试探索树的源头”，干员回归时会携带2希望和
                <el-tooltip content="所有敌人的生命+20%，我方单位的生命-40%，让探索开启不同的方向" effect="light" placement="top">
                  <el-text tag="ins">【怦然信标】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                进入带有“神明之殇”特殊标识的不期而遇节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%B3%AA%E4%B9%8B%E8%81%9A%E8%90%BD"
                  target="_blank"
                  type="primary"
                >
                  “泪之聚落”
                </el-link>
                ，选择“倾囊资助”（消耗全部源石锭） ，获得
                <el-tooltip
                  content="可以在第6层位于门口附近的命运所指节点中，使“玻利瓦尔，症结之核”首次释放“灾厄之口”时不摧毁“危朽”"
                  effect="light"
                  placement="top"
                >
                  <el-text tag="ins">【击坠“神明”】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Refresh" type="success">
              <div>
                <span class="optional">（可选）</span>
                进入带有“文明之尽”特殊标识的失与得节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%9B%9E%E6%BB%9A%E6%96%87%E6%98%8E"
                  target="_blank"
                  type="primary"
                >
                  “回滚文明”
                </el-link>
                ，选择‘复原“文明”’（消耗随机2件自然物），获得
                <el-tooltip
                  content="可以在第6层位于门口附近的命运所指节点中，使“玻利瓦尔，症结之核”的“灾厄之口”无法封锁待部署区"
                  effect="light"
                  placement="top"
                >
                  <el-text tag="ins">【焚毁“文明”】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                <span class="optional">（可选）</span>
                进入带有“光明之末”特殊标识的战斗节点，通过
                <el-link href="https://prts.wiki/w/ISW-NO_%E6%97%A0%E6%95%88%E9%AA%8C%E5%B0%B8" target="_blank" type="primary"> 【ISW-NO 无效验尸】 </el-link>
                ，获得
                <el-tooltip content="可以在第6层位于门口附近的命运所指节点中，使“玻利瓦尔，症结之核”的“灾厄之口”伤害降低" effect="light" placement="top">
                  <el-text tag="ins">【湮没“光明”】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                装载加工品
                <el-tooltip content="装载并使用后会被随机传送至任意非作战节点，无需行动力，无法被携带至下一区域（可移动1次）" effect="light" placement="top">
                  <el-text tag="ins">【小八界】</el-text>
                </el-tooltip>
                进行随机传送，有极低概率触发<b>稀有</b>事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%AE%89%E7%9C%A0%E4%B8%80%E9%9A%85"
                  target="_blank"
                  type="primary"
                >
                  “安眠一隅”
                </el-link>
                ，选择“进入神秘空间”，获得
                <el-tooltip content="立刻获得99源石锭，可代替【击坠“神明”】/【焚毁“文明”】/【湮没“光明”】生效一次" effect="light" placement="top">
                  <el-text tag="ins">【源私钥】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Flag" type="warning">
              <div>
                抵达第6层，进入门口的命运所指节点，视上述的收藏品持有情况对
                <el-link
                  href="https://prts.wiki/w/%E7%8E%BB%E5%88%A9%E7%93%A6%E5%B0%94%EF%BC%8C%E7%97%87%E7%BB%93%E4%B9%8B%E6%A0%B8"
                  target="_blank"
                  type="primary"
                >
                  【玻利瓦尔，症结之核】 </el-link
                >施加削弱影响
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E7%95%B8%E7%97%87" target="_blank" type="primary"> 【ISW-DF 畸症】 </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>旧日重燃</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                在第1层或第2层进入险路尽头节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E9%99%A9%E8%B7%AF%E5%B0%BD%E5%A4%B4"
                  target="_blank"
                  type="primary"
                >
                  “险路尽头”
                </el-link>
                ，选择“帮助倒下的探险家同伴”（消耗10源石锭），获得
                <el-tooltip
                  content="区域III血色空脉及后续区域中出现熄日余径，探险者会出现在熄日余径的战斗中，血色空脉中的险路恶敌变得更加艰难"
                  effect="light"
                  placement="top"
                >
                  <el-text tag="ins">【谒日之祈】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional tip">（提示）</span>
                只有险路尽头节点会出现“帮助倒下的探险家同伴”选项，险路小径节点不会出现
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                获得【谒日之祈】后，先行一步事件“未涉足之树”中的“尝试探索树的源头”选项将不再出现，本次探索无法再完成第三结局
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                持有【谒日之祈】后，从第3层“血色空脉”起，后续区域的地图右侧会出现总节点数量为7的
                <el-tooltip content="第5层的熄日余径的总节点数量为9" effect="light" placement="top">
                  <el-text tag="ins">熄日余径</el-text>
                </el-tooltip>
                ；其距离主要区域具有2的最短节点距离且不与主要区域连通，无法通过徒步的方式进入；探险者会出现在其中的战斗中，血色空脉中的险路恶敌也会变得更加艰难
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入熄日余径中的命运所指节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%A4%A7%E7%BA%A2%E6%8C%89%E9%92%AE"
                  target="_blank"
                  type="primary"
                >
                  “大红按钮”
                </el-link>
                ，选择“这个按钮是做什么用的？”，再选择“这下有麻烦了”，进入特殊战斗
                <el-link href="https://prts.wiki/w/ISW-NO_%E7%81%B0%E5%9D%91" target="_blank" type="primary"> 【ISW-NO 灰坑】 </el-link>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                保护战斗中的“沉沦探险者”，使其发动“太阳渴望鲜血！”（需240技力），强制结束关卡并让探索开启不同的方向，获得
                <el-tooltip
                  content="不再出现熄日余径，所有干员再部署时间+50%，使用加工品移动后使其损毁（不会触发复得之轮）；让探索开启不同的方向"
                  effect="light"
                  placement="top"
                >
                  <el-text tag="ins">【祭日之契】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                若“沉沦探险者”在战斗中倒下，可在3~5层数中进入不期而遇节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%89%8B%E6%9C%AF%E7%A5%AD%E5%9D%9B"
                  target="_blank"
                  type="primary"
                >
                  “手术祭坛”
                </el-link>
                ，选择“小心地移除电极”（失去一半目标生命上限），获得
                <el-tooltip content="探险者重新出现在熄日余径的战斗中" effect="light" placement="top">
                  <el-text tag="ins">【破碎噩兆】</el-text>
                </el-tooltip>
              </div>
              <div>
                <span class="optional warning">（注意）</span>
                该补救事件只会触发一次，若沉沦探险者在第二次的守护战中仍被击倒，则本次探索无法再获得【祭日之契】，也无法达成第四结局
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                进入不期而遇节点，触发事件
                <el-link
                  href="https://prts.wiki/w/%E6%B2%89%E6%B2%A6%E8%80%85%E7%9A%84%E9%BB%91%E6%B5%81%E6%A0%91%E6%B5%B7/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%88%B6%E5%9B%BE%E6%A1%8C"
                  target="_blank"
                  type="primary"
                >
                  “制图桌”
                </el-link>
                ，选择“端详那册精致的图纸”，获得
                <el-tooltip
                  content="敌方单位攻击、移速+30%，最大生命值+50%，精英和领袖敌人登场30秒内受到的物理和法术伤害-50%，盲目者所见中的险路恶敌出现额外敌人"
                  effect="light"
                  placement="top"
                >
                  <el-text tag="ins">【生命蓝图】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E7%86%84%E6%97%A5" target="_blank" type="primary"> 【ISW-DF 熄日】 </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="未完待续" />
      <!-- 不要删除末尾时间线节点，因组件自身样式特性，删除该节点会导致最后一个时间线节点内部的时间线组件样式显示异常 -->
    </el-timeline>
  </div>
</template>

<style scoped>
@import "@/assets/css/information/integratedStrategies.scss";
</style>
