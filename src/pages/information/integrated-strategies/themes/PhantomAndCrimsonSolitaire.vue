<script lang="js" setup>
import {MoreFilled} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
import Battle from '@/components/information/Battle.vue'
</script>

<template>
  <!-- 傀影与猩红孤钻 -->
  <!-- 事件：https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E9%95%BF%E7%94%9F%E8%80%85%E5%AE%9D%E7%9B%92 -->
  <!-- 区域：https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB#%E5%8C%BA%E5%9F%9F -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>舞会终场</h3>
          <el-timeline>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第5层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E8%A6%86%E6%B0%B4%E9%9A%BE%E6%94%B6" target="_blank"
                         type="primary">
                  【ISW-DF 覆水难收】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第二结局">
        <el-card>
          <h3>滑稽喜剧</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="第4层末尾的【古堡馈赠】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%A7%A3%E8%84%B1%EF%BC%9F"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“解脱？”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择
                <el-tooltip content="消耗1希望">
                  <el-text tag="ins">“太可怜了，仔细观赏”</el-text>
                </el-tooltip>
                获得
                <el-tooltip content="让探索走向不同的结局" effect="light" placement="top"
                >
                  <el-text tag="ins">【残破的玩偶】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                持有玩偶可触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%96%AF%E7%8B%82%E7%8E%A9%E5%81%B6"
                    target="_blank"
                    type="primary"
                >
                  “疯狂玩偶”
                </el-link>
                ，连续选择3次
                <el-tooltip content="总共消耗3目标生命">
                  <el-text tag="ins">“护住玩偶”</el-text>
                </el-tooltip>
                获得
                <el-tooltip content="立即获得源石锭+11，希望+3" effect="light" placement="top"
                >
                  <el-text tag="ins">【无用的剪刀】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>
                持有剪刀可触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%A7%A3%E8%84%B1"
                    target="_blank"
                    type="primary"
                >
                  “解脱”
                </el-link>
                ，选择“询问对方姓名”获得
                <el-tooltip content="使【伤心的大锁】自愈能力失效" effect="light" placement="top"
                >
                  <el-text tag="ins">【空白遗书】</el-text>
                </el-tooltip>
                ，以剥夺大锁的自愈能力
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第5层，通过
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E5%88%AB%E6%97%A0%E6%89%80%E6%B1%82"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 别无所求】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第三结局">
        <el-card>
          <h3>盛大揭幕</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="第3层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B4%E5%AE%B4"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“赴宴”</el-text>
                  </el-link>
                </el-tooltip>
                选“白得一套衣服”获得
                <el-tooltip content="所有我方单位的部署费用+2" effect="light" placement="top"
                >
                  <el-text tag="ins">【替罪领巾】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                击败第3层BOSS后选择
                <el-tooltip
                    content="所有我方单位的攻击力、防御力、生命+3%"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【替补演员】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                持替补演员可在第5层触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%BF%BD%E9%9A%8F%E8%80%85%E9%9B%86%E4%BC%9A"
                    target="_blank"
                    type="primary"
                >
                  “追随者集会”
                </el-link>
                ，选择“推门而入”获得
                <el-tooltip
                    content="所有我方单位的部署费用-3，攻击力、防御力、生命+5%，让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【恍悟】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E8%AF%B8%E4%BA%8B%E4%B8%8D%E9%A1%BA"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 诸事不顺】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>沉默之章</h3>
          <el-timeline>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="通过第1层后，在第3层末尾的【险路恶敌】前可能遭遇" effect="light"
                            placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%88%AB%E6%89%93%E6%89%B0%E4%BB%96%E4%BB%AC"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“别打扰他们”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“靠近听听他们在说什么”，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-SP_%E8%87%AA%E7%BC%9A"
                    target="_blank"
                    type="primary"
                >
                  【ISW-SP 自缚】
                </el-link>
                ，获胜后获得
                <el-tooltip
                    content="所有干员的再部署时间-10%"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【死囚之舞】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Battle" color="#5EDFD6">
              <div>
                持有死囚之舞可触发不期而遇
                <el-link
                    href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%A4%8D%E4%BB%87%E5%89%A7"
                    target="_blank"
                    type="primary"
                >
                  “复仇剧”
                </el-link>
                ，选择“看看对方在写什么”，进入特殊战斗
                <el-link
                    href="https://prts.wiki/w/ISW-SP_%E8%A7%82%E5%AF%9F"
                    target="_blank"
                    type="primary"
                >
                  【ISW-SP 观察】
                </el-link>
                ，获胜后获得
                <el-tooltip
                    content="希望+3，让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【初幕】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E5%86%8D%E5%90%AF%E6%96%B0%E7%AF%87"
                    target="_blank"
                    type="primary"
                >
                  【ISW-DF 再启新篇】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="完结"/>
      <!-- 不要删除末尾时间线节点，因组件自身样式特性，删除该节点会导致最后一个时间线节点内部的时间线组件样式显示异常 -->
    </el-timeline>
  </div>
</template>

<style scoped>
@import "@/assets/css/information/integratedStrategies.scss";
</style>