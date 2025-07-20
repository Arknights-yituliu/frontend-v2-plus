<script lang="js" setup>
import {MoreFilled, Warning} from '@element-plus/icons-vue'
import BOSS from '@/components/information/BOSS.vue'
</script>

<template>
  <!-- 水月与深蓝之树 -->
  <!-- 事件：https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
  <!-- 收藏品：https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E7%94%9F%E7%89%A9%E5%88%B6%E5%93%81%E9%99%88%E8%AE%BE -->
  <!-- 区域：https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91#%E5%8C%BA%E5%9F%9F -->
  <div>
    <el-timeline>
      <el-timeline-item placement="top" timestamp="第一结局">
        <el-card>
          <h3>平凡即是喜乐</h3>
          <el-timeline>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第5层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E8%AE%A4%E7%9F%A5%E5%8D%B3%E9%87%8D%E6%8B%85"
                         target="_blank" type="primary">
                  【ISW-DF 认知即重担】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第二结局">
        <el-card>
          <h3>静谧时代</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="在第3层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%8B%82%E5%BE%92%E5%A6%84%E5%BF%B5"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“狂徒妄念”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“愤怒”（-2希望）或“呼号”（投掷点数>1），获得
                <el-tooltip
                    content="可同时部署人数+1；获得后【猎潮的骑士】出现在战场，直至被击败"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【海潮的气息】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="Warning" type="warning">
              <div>
                <span class="optional warning">（注意）</span>若在抵达第5层之前
                <el-link
                    href="https://prts.wiki/w/%E7%8C%8E%E6%BD%AE%E7%9A%84%E9%AA%91%E5%A3%AB"
                    target="_blank"
                    type="primary"
                >
                  【猎潮的骑士】
                </el-link>
                被击败，会获得
                <el-tooltip
                    content="【猎潮的骑士】不再出现在战场"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【退行的罗辛南特】</el-text>
                </el-tooltip>
                ，导致无法再达成第二结局
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>在猎潮的骑士仍存活的情况下，可触发不期而遇
                <el-tooltip content="在持有【海潮的气息】时，在抵达第5层前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E9%AA%91%E5%A3%AB%E4%BB%8D%E5%9C%A8"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“骑士仍在”</el-text>
                  </el-link>
                </el-tooltip>
                ，并选择“反抗”获得
                <el-tooltip content="源石锭+10，钥匙+1" effect="light" placement="top"
                >
                  <el-text tag="ins">【荒诞命运】</el-text>
                </el-tooltip>
                ，或选择“挣脱”获得
                <el-tooltip
                    content="【猎潮的骑士】和【最后的骑士】的防御力-80%"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【骑士骨血】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第5层时，若猎潮的骑士仍存活，则最终关卡会变为
                <el-link
                    href="https://prts.wiki/w/ISW-DF_%E2%80%9C%E5%91%BD%E8%BF%90%E7%9A%84%E5%AE%A0%E5%84%BF%E2%80%9D"
                    target="_blank"
                    type="primary"
                >
                  <el-tooltip
                      content="挑战自然·12及以上，35%概率遭遇"
                      effect="light"
                      placement="top"
                  >
                    <el-text tag="ins" type="primary">【ISW-DF “命运的宠儿”】</el-text>
                  </el-tooltip>
                </el-link>
                ，通过此关卡达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第三结局">
        <el-card>
          <h3>息潮的代价</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="在第3层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BC%80%E7%AB%AF"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“开端”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“决定潜入深海”，获得
                <el-tooltip content="每次战斗结束后灯火额外-5" effect="light" placement="top"
                >
                  <el-text tag="ins">【主教的研究】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                持有主教的研究可触发不期而遇
                <el-tooltip content="灯火值不低于20时，在第5层末尾的【险路恶敌】前可能遭遇" effect="light"
                            placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%B7%B1%E8%93%9D%E4%B9%8B%E5%BF%83"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“深蓝之心”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“搜寻园林”，获得
                <el-tooltip
                    content="灯火-50，获得时立即使随机一名干员产生排异反应，让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【深蓝之心】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>持有深蓝之心，可触发不期而遇
                <el-tooltip content="第5层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%9E%E6%AD%8C"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“赞歌”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“亲吻猎人们的额头并取走遗物”，获得
                <el-tooltip content="获得时随机获得2个启示" effect="light" placement="top"
                >
                  <el-text tag="ins">【“绝唱”】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E5%A4%A7%E7%BE%A4%E6%89%80%E5%90%91" target="_blank"
                         type="primary">
                  【ISW-DF 大群所向】
                </el-link>
                达成结局
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-timeline-item>
      <el-timeline-item placement="top" timestamp="第四结局">
        <el-card>
          <h3>如星空般深蓝</h3>
          <el-timeline>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                进入不期而遇，触发事件
                <el-tooltip content="在第3层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BC%80%E7%AB%AF"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“开端”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“‘深蓝’？！”，获得
                <el-tooltip
                    content="灯火-100，获得时立即使随机一名干员产生排异反应"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【深蓝回忆】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                <span class="optional">（可选）</span>持有深蓝回忆，可触发不期而遇
                <el-tooltip content="在抵达第5层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%B7%B1%E8%93%9D%E4%BB%AA%E5%BC%8F"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“深蓝仪式”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择“关闭危险流程”，获得30灯火，或选择“不做任何改动”获得
                <el-tooltip
                    content="所有敌人攻击速度+15；每次作战若未损失目标生命，战斗结束后灯火+15"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【深蓝之树】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="MoreFilled" type="primary">
              <div>
                持有深蓝回忆，可触发不期而遇
                <el-tooltip content="在第4层开始至第5层末尾的【险路恶敌】前可能遭遇" effect="light" placement="top"
                >
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8D%87%E5%8D%8E"
                      target="_blank"
                      type="primary"
                  >
                    <el-text tag="ins" type="primary">“升华”</el-text>
                  </el-link>
                </el-tooltip>
                ，选择
                <el-tooltip content="灯火值不低于90时显示">
                  <el-text tag="ins">“‘我是水月，我会完成博士的请求’”</el-text>
                </el-tooltip>
                ，获得
                <el-tooltip
                    content="所有我方干员阻挡数+2，防御力和生命+120%，法术抗性+20，让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【“决心”】</el-text>
                </el-tooltip>
                ，或选择
                <el-tooltip content="灯火值不低于50时显示">
                  <el-text tag="ins">“‘让时间来解答吧’”</el-text>
                </el-tooltip>
                ，获得
                <el-tooltip
                    content="所有我方干员阻挡数+1，让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【“观望”】</el-text>
                </el-tooltip>
                ，或选择“‘大群非我，我即大群’”，获得
                <el-tooltip
                    content="所有我方干员阻挡数-1（不会低于1），让探索走向不同的结局"
                    effect="light"
                    placement="top"
                >
                  <el-text tag="ins">【“犹疑”】</el-text>
                </el-tooltip>
              </div>
            </el-timeline-item>
            <el-timeline-item :icon="BOSS" color="#8A0993">
              <div>
                抵达第6层，通过
                <el-link href="https://prts.wiki/w/ISW-DF_%E4%BA%BA%E4%B9%8B%E5%85%89%E8%BE%89" target="_blank"
                         type="primary">
                  【ISW-DF 人之光辉】
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