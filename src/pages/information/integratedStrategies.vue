<template>
  <div class="container">
    <div class="segmented-controls">
      <el-segmented v-model="selectedOption" :options="options" size="large"/>
    </div>

    <!-- 肉鸽结局触发方式展示切换 -->
    <transition mode="out-in" name="fade">

      <!-- 傀影与猩红孤钻 -->
      <!-- 事件：https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
      <!-- 收藏品：https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E9%95%BF%E7%94%9F%E8%80%85%E5%AE%9D%E7%9B%92 -->
      <el-timeline v-if="selectedOption === '傀影与猩红孤钻'">
        <el-timeline-item placement="top" timestamp="第一结局">
          <el-card>
            <h3>舞会终场</h3>
            <el-timeline>
              <el-timeline-item :icon="BOSS" color="#8A0993">
                <div>
                  抵达第5层，通过
                  <el-link href="https://prts.wiki/w/ISW-DF_%E8%A6%86%E6%B0%B4%E9%9A%BE%E6%94%B6" type="primary">
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
                  <el-link
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%A7%A3%E8%84%B1%EF%BC%9F"
                      type="primary"
                  >
                    “解脱？”
                  </el-link>
                  选择
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
                      type="primary"
                  >
                    “解脱”
                  </el-link>
                  选择“询问对方姓名”获得
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
                  <el-link
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B4%E5%AE%B4"
                      type="primary"
                  >
                    “赴宴”
                  </el-link>
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
                  持替补演员可触发不期而遇
                  <el-link
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%BF%BD%E9%9A%8F%E8%80%85%E9%9B%86%E4%BC%9A"
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
                  <el-link
                      href="https://prts.wiki/w/%E5%82%80%E5%BD%B1%E4%B8%8E%E7%8C%A9%E7%BA%A2%E5%AD%A4%E9%92%BB/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%88%AB%E6%89%93%E6%89%B0%E4%BB%96%E4%BB%AC"
                      type="primary"
                  >
                    “别打扰他们”
                  </el-link>
                  ，选择“靠近听听他们在说什么”，进入特殊战斗
                  <el-link
                      href="https://prts.wiki/w/ISW-SP_%E8%87%AA%E7%BC%9A"
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
                      type="primary"
                  >
                    “复仇剧”
                  </el-link>
                  ，选择“看看对方在写什么”，进入特殊战斗
                  <el-link
                      href="https://prts.wiki/w/ISW-SP_%E8%A7%82%E5%AF%9F"
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

      <!-- 水月与深蓝之树 -->
      <!-- 事件：https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
      <!-- 收藏品：https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E7%94%9F%E7%89%A9%E5%88%B6%E5%93%81%E9%99%88%E8%AE%BE -->
      <el-timeline v-else-if="selectedOption === '水月与深蓝之树'">
        <el-timeline-item placement="top" timestamp="第一结局">
          <el-card>
            <h3>平凡即是喜乐</h3>
            <el-timeline>
              <el-timeline-item :icon="BOSS" color="#8A0993">
                <div>
                  抵达第5层，通过
                  <el-link href="https://prts.wiki/w/ISW-DF_%E8%AE%A4%E7%9F%A5%E5%8D%B3%E9%87%8D%E6%8B%85"
                           type="primary">
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E7%8B%82%E5%BE%92%E5%A6%84%E5%BF%B5"
                      type="primary"
                  >
                    “狂徒妄念”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E9%AA%91%E5%A3%AB%E4%BB%8D%E5%9C%A8"
                      type="primary"
                  >
                    “骑士仍在”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BC%80%E7%AB%AF"
                      type="primary"
                  >
                    “开端”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%B7%B1%E8%93%9D%E4%B9%8B%E5%BF%83"
                      type="primary"
                  >
                    “深蓝之心”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%9E%E6%AD%8C"
                      type="primary"
                  >
                    “赞歌”
                  </el-link>
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E5%A4%A7%E7%BE%A4%E6%89%80%E5%90%91" type="primary">
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BC%80%E7%AB%AF"
                      type="primary"
                  >
                    “开端”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%B7%B1%E8%93%9D%E4%BB%AA%E5%BC%8F"
                      type="primary"
                  >
                    “深蓝仪式”
                  </el-link>
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
                  <el-link
                      href="https://prts.wiki/w/%E6%B0%B4%E6%9C%88%E4%B8%8E%E6%B7%B1%E8%93%9D%E4%B9%8B%E6%A0%91/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8D%87%E5%8D%8E"
                      type="primary"
                  >
                    “升华”
                  </el-link>
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E4%BA%BA%E4%B9%8B%E5%85%89%E8%BE%89" type="primary">
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

      <!-- 探索者的银凇止境 -->
      <!-- 事件：https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
      <!-- 收藏品：https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BB%AA%E5%BC%8F%E7%94%A8%E5%93%81%E7%B4%A2%E5%BC%95 -->
      <el-timeline v-else-if="selectedOption === '探索者的银凇止境'">
        <el-timeline-item placement="top" timestamp="第一结局">
          <el-card>
            <h3>越过群山</h3>
            <el-timeline>
              <el-timeline-item :icon="Flag" type="warning">
                <div>
                  抵达第5层，在险路恶敌的前一个命运所指节点中触发
                  <el-link
                      href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E8%B5%B0%E8%BF%87%E8%90%A8%E7%B1%B3%E7%9A%84%E8%87%82%E8%86%80"
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E5%B7%8D%E5%B3%A8%E9%93%B6%E5%87%87" type="primary">
                    【ISW-DF 巍峨银凇】
                  </el-link>
                  或
                  <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E6%B7%B1%E5%AF%92%E9%80%A0%E5%83%8F"
                           type="primary">
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E8%90%A8%E7%B1%B3%E4%B9%8B%E7%86%B5" type="primary">
                    【ISW-DF 萨米之熵】
                  </el-link>
                  或
                  <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E8%99%9A%E6%97%A0%E4%B9%8B%E5%81%B6"
                           type="primary">
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
                      type="primary"
                  >
                    “探寻前路”
                  </el-link>
                  事件，选择“征求凛视的意见”，获得
                  <el-tooltip content="战斗出现额外敌人，让探索开启不同的方向" effect="light" placement="top"
                  >
                    <el-text tag="ins">【路网】</el-text>
                  </el-tooltip>
                </div>
              </el-timeline-item>
              <el-timeline-item :icon="Flag" type="warning">
                <div>
                  寻找并进入任意一个非第5层的，非险路恶敌前一个的命运所指节点，触发
                  <el-link
                      href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E6%82%B2%E8%A7%82%E8%80%85%E5%9B%9A%E7%AC%BC"
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
              </el-timeline-item>
              <el-timeline-item :icon="BOSS" color="#8A0993">
                <div>
                  抵达第6层，通过
                  <el-link href="https://prts.wiki/w/ISW-DF_%E5%9B%AD%E4%B8%81" type="primary">
                    【ISW-DF 园丁】
                  </el-link>
                  或
                  <el-link :underline="false" href="https://prts.wiki/w/ISW-DF_%E5%93%A8%E5%85%B5" type="primary">
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
                  <el-link
                      href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%8F%98%E5%8C%96"
                      type="primary"
                  >
                    “变化”
                  </el-link>
                  ，选择“出示视界邀约“，进入特殊战斗
                  <el-link
                      href="https://prts.wiki/w/ISW-SP_%E9%BB%84%E6%B2%99%E5%B9%BB%E5%A2%83"
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
                  <el-tooltip content="希望+3，让探索开启不同的方向" effect="light" placement="top"
                  >
                    <el-text tag="ins">【安玛的爱】</el-text>
                  </el-tooltip>
                  、
                  <el-tooltip
                      content="所有我方单位的生命、攻击力、防御力+1%；有时会发挥奇妙的效果（奇妙的效果：持有此收藏品时进入部分事件将出现能够获得更多收益/不需要支付代价的隐藏选项，此类选项会要求失去该收藏品）"
                      effect="light" placement="top"
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
                  抵达第6层，在所遇到的第一个命运所指节点触发
                  <el-link
                      href="https://prts.wiki/w/%E6%8E%A2%E7%B4%A2%E8%80%85%E7%9A%84%E9%93%B6%E5%87%87%E6%AD%A2%E5%A2%83/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E9%87%8D%E6%9E%84"
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E6%97%B6%E5%85%89%E4%B9%8B%E6%B2%99" type="primary">
                    【ISW-DF 时光之沙】
                  </el-link>
                  或
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/ISW-DF_%E8%BF%88%E5%85%A5%E6%B0%B8%E6%81%92"
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

      <!-- 萨卡兹的无终奇语 -->
      <!-- 事件：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88 -->
      <!-- 收藏品：https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E6%83%B3%E8%B1%A1%E5%AE%9E%E4%BD%93%E5%9B%BE%E9%89%B4 -->
      <el-timeline v-else-if="selectedOption === '萨卡兹的无终奇语'">
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
                      type="primary"
                  >
                    “表达欲”
                  </el-link>
                  选择
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E7%B4%A7%E6%80%A5%E6%8E%88%E8%AF%BE" type="primary">
                    【ISW-DF 紧急授课】
                  </el-link>
                  或
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/ISW-DF_%E6%80%9D%E7%BB%B4%E7%9F%AB%E6%AD%A3"
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
                      type="primary"
                  >
                    “表达欲”
                  </el-link>
                  选择
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E6%9C%9D%E8%B0%92" type="primary">
                    【ISW-DF 朝谒】
                  </el-link>
                  或
                  <el-link
                      :underline="false"
                      href="https://prts.wiki/w/ISW-DF_%E9%AD%82%E7%81%B5%E6%9C%9D%E8%B0%92"
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
                  持有先知长角刷新节点直到出现命运所指，进入其中触发事件
                  <el-link
                      href="https://prts.wiki/w/%E8%90%A8%E5%8D%A1%E5%85%B9%E7%9A%84%E6%97%A0%E7%BB%88%E5%A5%87%E8%AF%AD/%E4%BA%8B%E4%BB%B6%E4%B8%80%E8%A7%88#%E5%BE%85%E8%AF%89%E8%AF%B4%E7%9A%84%E7%9C%9F%E7%9B%B8"
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
                  <el-link href="https://prts.wiki/w/ISW-DF_%E5%9C%A3%E5%9F%8E" type="primary">
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
                      type="primary"
                  >
                    “原初异途”
                  </el-link>
                  选择“一片莲瓣”，获得
                  <el-tooltip
                      content="战斗获得的指挥经验与源石锭-50%，在狭路相逢中会有奇妙的效果"
                      effect="light"
                      placement="top"
                  >
                    <el-text tag="ins">【片瓣】</el-text>
                  </el-tooltip>
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
                      type="primary"
                  >
                    【轻舟共渡】
                  </el-link>
                  ，然后选择第三类敌人（2支
                  <el-link
                      href="https://prts.wiki/w/%E6%89%98%E7%94%9F%E8%8E%B2%E5%BA%A7"
                      type="primary"
                  >
                    【托生莲座】
                  </el-link>
                  ），获胜后获得
                  <el-tooltip
                      content="领袖与精英敌人最大生命值+50%，使虚实疆界中的险路恶敌更加艰难，让探索开启不同的方向"
                      effect="light"
                      placement="top"
                  >
                    <el-text tag="ins">【阿纳萨羯磨】</el-text>
                  </el-tooltip>
                </div>
              </el-timeline-item>
              <el-timeline-item :icon="BOSS" color="#8A0993">
                <div>
                  抵达第6层，通过
                  <el-link href="https://prts.wiki/w/ISW-DF_%E6%8E%88%E6%B3%95" type="primary">
                    【ISW-DF 授法】
                  </el-link>
                  达成结局
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-timeline-item>
        <el-timeline-item placement="top" timestamp="尚待更新"/>
      </el-timeline>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import {ref} from "vue";
import {Coin, Flag, MoreFilled, Refresh, Right, Search, Warning} from '@element-plus/icons-vue'
import BOSS from '@/custom/icon/BOSS.vue'
import Battle from '@/custom/icon/Battle.vue'

const options = [
  '傀影与猩红孤钻',
  '水月与深蓝之树',
  '探索者的银凇止境',
  '萨卡兹的无终奇语'
]

const selectedOption = ref(options[0])
</script>

<style lang="scss" scoped>
.container {
  padding: 20px;

  h3 {
    padding-bottom: 20px;
  }

  .optional {
    font-weight: bold;
    margin-right: 5px;
  }

  .optional.warning {
    color: #e6a23c;
  }

  :deep(li.el-timeline-item:last-child) {
    padding-bottom: 0;
  }

  :deep(.el-timeline-item__content > div) {
    display: flex;
    flex-wrap: wrap;
  }

  :deep(li.el-timeline-item > div) {
    flex-grow: 1;
  }

  .el-timeline-item .el-card:not(:first-child) {
    margin-top: 20px;
  }
}

/* 分段控制器样式调整 */
.segmented-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

/* Transition 动画样式 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.fade-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
