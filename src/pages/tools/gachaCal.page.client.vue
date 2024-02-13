<template>
  <div id="gacha">
    <el-row :gutter="12" justify="center" class="gacha-row">
      <el-col :xs="24" :sm="16" :md="12" class="col-1">
        <el-collapse v-model="checkBox1" @change="handleChange" class="top-collapse">
          <!-- 总计 -->
          <el-collapse-item name="total-table" id="totalTable" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon" style="background: chocolate"></div>
              <span class="collapse-item_title">
                共计{{ toFixedByAcc(gachaTimes_total, 0) }}抽，氪金{{ sellsCount }}元
              </span>
            </template>
            <div class="gacha_unit" id="total">
              <!-- 如果有4个选项则修改为 style="width:98%;margin:0 1%;"，子项宽度25% -->

              <div class="el-radio-group-wrap">
                <el-radio-group v-model="timeSelector" @change="checkEndDate(timeSelector)">
                  <el-radio-button v-for="(schedule, name) in schedules" v-show="schedule.display" :key="name"
                                   :label="name">
                  </el-radio-button>
                </el-radio-group>
              </div>

              <!--              <div class="gacha_unit_info">彩六联动二期的排期尚不明确，3.26的可能性较大，请自行斟酌</div>-->
              <!-- <el-divider></el-divider> -->
              <div id="gacha_total_chart">
                <div id="gacha_total_pie" ref="gacha_total_pie"
                     style="vertical-align: top; height: 200px; width: 280px; display: inline-block; top: 10px"></div>
                <table id="gacha_total_table">
                  <tbody>
                  <tr class="gacha_total_table_tr">
                    <td>现有</td>
                    <td>{{ toFixedByAcc(calcResult.gachaTimes_exist, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  <tr class="gacha_total_table_tr">
                    <td>日常</td>
                    <td>{{ toFixedByAcc(calcResult.gachaTimes_daily, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  <tr class="gacha_total_table_tr">
                    <td>潜在</td>
                    <td>
                      {{ toFixedByAcc(calcResult.gachaTimes_potential, 0) }}
                    </td>
                    <td>抽</td>
                  </tr>
                  <tr class="gacha_total_table_tr">
                    <td>氪金</td>
                    <td>{{ toFixedByAcc(calcResult.gachaTimes_gacha, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  <tr class="gacha_total_table_tr">
                    <td>活动(估算)</td>
                    <td>{{ toFixedByAcc(calcResult.gachaTimes_act, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  <tr class="gacha_total_table_tr">
                    <td>其它(估算)</td>
                    <td>{{ toFixedByAcc(calcResult.gachaTimes_other, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <el-divider></el-divider>
              <div class="gacha_unit_child" style="display: flex">
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('4003icon')"></div>
                    {{ toFixedByAcc(orundum, 0) }}
                    <span style="font-size: 14px"> &nbsp;({{ (toFixedByAcc(orundum, 0) / 600).toFixed(2) }}) </span>
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('4002icon')"></div>
                    {{ toFixedByAcc(originium, 0) }}
                    <span style="font-size: 14px"> &nbsp;({{ gachaTimes_originium.toFixed(2) }}) </span>
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('7003icon')"></div>
                    {{ toFixedByAcc(permit, 0) }}
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('7004icon')"></div>
                    {{ toFixedByAcc(permit10, 0) }}
                    <span style="font-size: 14px"> &nbsp;({{ toFixedByAcc(permit10, 0) * 10 }}) </span>
                  </div>
                </div>
              </div>
<!--              <el-divider></el-divider>-->
              <!--              <div class="gacha_unit_child" style="display: flex;margin-top: 4px;margin-bottom: 4px;">-->
              <!--                <a href="https://www.skland.com/act/vote-campaign"-->
              <!--                   style="font-size: 16px;text-decoration: none;margin: 0px auto;text-align: center;">在森空岛投票支持'罗德岛基建BETA'，助力计算器的开发工作！</a>-->
              <!--              </div>-->

            </div>
          </el-collapse-item>
        </el-collapse>
      </el-col>
      <el-col :xs="24" :sm="16" :md="12">
        <el-collapse v-model="checkBox">
          <!-- 现有库存 -->
          <el-collapse-item name="exist" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">库存/预留/搓玉 {{
                  toFixedByAcc(calcResult.gachaTimes_exist, 0)
                }}抽</span>
            </template>
            <!-- 内容区 -->
            <div class="gacha_unit" id="wallet">
              <!-- 现有资源 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                当前库存
              </div>
              <div class="gacha_unit_child" style="display: flex">
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('4003icon')"></div>
                    <input type="text" @change="compute()" class="gacha_unit_child_inputbox"
                           v-model.number="calcResult.orundum_exist" oninput="value=value.replace(/[^\d]/g, '')"/>
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('4002icon')"></div>
                    <input type="text" @change="compute()" class="gacha_unit_child_inputbox"
                           v-model.number="calcResult.originium_exist" oninput="value=value.replace(/[^\d]/g, '')"/>
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('7003icon')"></div>
                    <input type="text" @change="compute()" class="gacha_unit_child_inputbox"
                           v-model.number="calcResult.permit_exist" oninput="value=value.replace(/[^\d]/g, '')"/>
                  </div>
                </div>
                <div class="gacha_unit_child_title">
                  <div style="display: flex">
                    <div :class="getSpriteImg('7004icon')"></div>
                    <input type="text" @change="compute()" class="gacha_unit_child_inputbox"
                           v-model.number="calcResult.permit10_exist" oninput="value=value.replace(/[^\d]/g, '')"/>
                  </div>
                </div>
              </div>
              <!-- 源石是否抽卡 -->
              <div class="gacha_unit_child" style="display: flex">
                <div @click="compute()">
                  <el-switch v-model="originiumFlag" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
                  源石是否用于抽卡
                </div>
              </div>

              <!-- <el-divider></el-divider> -->
              <!-- 自定义修正值 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                预留、自定义修正
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="customValue"
                       oninput="value=value.replace(/[^0-9-]+/g, '')"/>
                <div class="gacha_unit_child_title" style="width: 220px">自定义修正值(合成玉)</div>
                <div class="gacha_resources_unit" style="width: 125px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  {{ customValue }}
                </div>
              </div>
              <div class="gacha_unit_info">例如给轮换池预留、其它来源等，可填负数</div>

              <div class="gacha_unit_child" style="display: flex">
                <div class="gacha_unit_child_title">预留皮肤(18石/件)</div>
                <client-only>
                  <el-slider v-model="skinNumValue" :step="1" :min="0" :max="10" show-stops show-input
                             @change="compute()"
                             style="flex-grow: 1; flex-shrink: 5"></el-slider>
                </client-only>
              </div>
              <!-- 搓玉计算 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                搓玉计算
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="orundum_ap"
                       oninput="value=value.replace(/[^0-9-]+/g, '')"/>
                用于搓玉的理智 X
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="orundum_rate"
                       oninput="value=value.replace(/[^0-9.]+/g, '')" style="width: 45px"/>
                搓玉系数 =
                <div class="gacha_resources_unit">
                  <div :class="getSpriteImg('4003icon')"></div>
                  {{ toFixedByAcc(orundum_ap * orundum_rate, 2) }}
                </div>
              </div>
              <div class="gacha_unit_info">搓玉系数：1-7(1.09)</div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="item_30012"
                       oninput="value=value.replace(/[^0-9]+/g, '')"/>
                个固源岩 +
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="item_30062"
                       oninput="value=value.replace(/[^0-9]+/g, '')" style="width: 45px"/>
                个装置 + {{ LMDCost }} 龙门币=
                <div class="gacha_resources_unit">
                  <div :class="getSpriteImg('4003icon')"></div>
                  {{ toFixedByAcc(orundumByManufacture, 2) }}
                </div>
              </div>
              <div class="gacha_unit_child">
                <a href="/?item=Orundum" style="margin: 0px 24px 0px 0">查看其它可搓玉关卡</a>
                <!-- <a href="https://www.bilibili.com/video/BV1v54y1T7u5" style="display: inline-block">
                  搓玉教程<img class="gacha_img_small" src="/image/icon/el.png"
                /></a> -->
              </div>
              <!-- 绿票计算 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                绿票商店第三层
              </div>
              <div class="gacha_unit_child">
                现有绿票数<input class="gacha_unit_child_inputbox" type="text" @change="compute()"
                                 v-model.number="orundum_green_x"
                                 oninput="value=value.replace(/[^0-9-]+/g, '')"/>，有{{ orundum_green_y }}绿票可换
                <div class="gacha_resources_unit" style="width: 174px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  <div style="width: 75px">{{ orundum_green }}</div>
                </div>
              </div>
              <div class="gacha_unit_info">现有绿票数 - 第一层共需1490绿票 - 第二层共需10100绿票 = 可用于换玉的绿票数
              </div>
              <div class="gacha_unit_info">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</div>
            </div>
          </el-collapse-item>
          <!-- 日常积累 -->
          <el-collapse-item class="collapse-item" name="daily" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">日常积累 {{ toFixedByAcc(calcResult.gachaTimes_daily, 0) }}抽</span>
            </template>
            <div class="gacha_unit" id="daily">
              <div class="gacha_unit_child">
                <div class="gacha_unit_child_title" style="width: 150px">日常 {{ remainingDays }} 天</div>
                <div class="gacha_resources_unit" style="width: 174px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  <div style="width: 75px">{{ dailyRewards }}</div>
                </div>
              </div>
              <!-- 日常周常分界线 -->
              <el-divider></el-divider>

              <div class="gacha_unit_child">
                <div class="gacha_unit_child_title" style="width: 150px">周常 {{ remainingWeeks + weeklyTaskValue }}
                  周
                </div>
                <div class="gacha_resources_unit" style="width: 192px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  <div style="width: 75px">
                    {{ weeklyTaskRewards + weeklyTaskValue * 500 }}
                  </div>
                </div>
                <div @click="compute()" class="gacha_unit_child_title" style="width: 150px; line-height: 32px">
                  <el-switch v-model="weeklyTaskFlag" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
                  本周已完成
                </div>
              </div>

              <div class="gacha_unit_child">
                <div class="gacha_unit_child_title" style="width: 150px">剿灭 {{ remainingWeeks + annihilationValue }}
                  周
                </div>
                <div class="gacha_resources_unit" style="width: 192px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  <div style="width: 75px">
                    {{ annihilationRewards + annihilationValue * 1800 }}
                  </div>
                </div>
                <div @click="compute()" class="gacha_unit_child_title" style="width: 150px; line-height: 32px">
                  <el-switch v-model="annihilationFlag" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
                  本周已完成
                </div>
              </div>
              <!-- 周常月常分界线 -->
              <el-divider></el-divider>
              <div class="gacha_unit_child">
                <div class="gacha_unit_child_title" style="width: 150px">绿票商店 {{ remainingMonths - storeValue }}
                  月
                </div>
                <div class="gacha_resources_unit" style="width: 192px">
                  <div style="width: 40px" :class="getSpriteImg('4003icon')"></div>
                  <div style="width: 66px">
                    {{ (remainingMonths - storeValue) * 600 }}
                  </div>
                  <div style="width: 40px" :class="getSpriteImg('7003icon')"></div>
                  <div style="width: 28px">
                    {{ (remainingMonths - storeValue) * 4 }}
                  </div>
                </div>
                <div @click="compute()" class="gacha_unit_child_title" style="width: 150px; line-height: 32px">
                  <el-switch v-model="storeFlag" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
                  本月已换
                </div>
              </div>
              <div class="gacha_unit_child">
                <div class="gacha_unit_child_title" style="width: 150px">每月签到 {{ remainingCheckinTimes }} 月</div>
                <div class="gacha_resources_unit" style="width: 174px">
                  <div :class="getSpriteImg('7003icon')"></div>
                  <div style="width: 32px">{{ remainingCheckinTimes }}</div>
                </div>
              </div>
              <!-- 258分界线 -->
              <el-divider></el-divider>
              <el-checkbox-group v-model="selectedStore258List" class="">
                <div v-for="(store258, index) in store258List" :key="index"
                     v-show="checkExpiration(store258.start, store258.end, store258.rewardType)"
                     class="gacha_unit_child"
                     @change="compute(store258.packName)">
                  <el-checkbox-button :label="index">
                    <div class="gacha_unit_child_title" style="width: 150px">
                      {{ store258.name }}
                    </div>
                    <div class="gacha_resources_unit">
                      <div style="width: 40px" :class="getSpriteImg('7004icon')"></div>
                      <div style="width: 32px">{{ store258.ticketGacha10 }}</div>
                      <div style="width: 40px" :class="getSpriteImg('7003icon')"></div>
                      <div style="width: 32px">{{ store258.ticketGacha }}</div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
            </div>
          </el-collapse-item>
          <!-- 潜在资源 -->
          <el-collapse-item class="collapse-item" name="potential" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">潜在资源 {{ toFixedByAcc(calcResult.gachaTimes_potential, 0) }}抽</span>
            </template>

            <div class="gacha_unit" id="potential">
              <!-- 悖论模拟 剿灭战模拟-->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                悖论模拟/剿灭战模拟
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="paradox"
                       oninput="value=value.replace(/[^\d]/g, '')"/>
                <div class="gacha_unit_child_title" style="width: 120px">个悖论模拟</div>
                <div class="gacha_resources_unit" style="width: 105px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  {{ paradox * 200 }}
                </div>
              </div>
              <!-- 剿灭战模拟 -->
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="annihilation"
                       oninput="value=value.replace(/[^\d]/g, '')"/>
                <div class="gacha_unit_child_title" style="width: 120px">个剿灭战模拟</div>
                <div class="gacha_resources_unit" style="width: 105px">
                  <div :class="getSpriteImg('4003icon')"></div>
                  {{ annihilation * 1500 }}
                </div>
              </div>
              <div class="gacha_unit_info">
                剿灭战模拟并非常驻，可前往prts.wiki查看开放历史
                <a href="https://prts.wiki/w/%E5%85%B3%E5%8D%A1%E4%B8%80%E8%A7%88/%E5%B8%B8%E6%80%81%E4%BA%8B%E5%8A%A1"
                   style="display: inline-block">
                  点我跳转<img class="gacha_img_small" src="/image/icon/el.png" alt=""/>
                </a>
              </div>
              <!-- 主线 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                主线、突袭、绝境
              </div>
              <el-checkbox-group v-model="selectedPotentialList" class="main-stages">
                <div v-for="(singlePack, index) in potentialList" :key="index" v-show="singlePack.packType === 'main'"
                     class="gacha_unit_child" style="display: inline-block" @change="compute(singlePack.packName)">
                  <el-checkbox-button :label="index" size="small">
                    <div class="gacha_unit_child_title" :style="getChapterWidth(index)" style="padding-left: 4px">
                      {{ singlePack.packName }}
                    </div>
                    <div class="gacha_resources_unit">
                      <div :class="getSpriteImg('4002icon')"></div>
                      <div style="width: 36px">{{ singlePack.gachaOriginium }}</div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <!-- Sidestory -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                支线、别传
              </div>
              <el-checkbox-group v-model="selectedPotentialList" class="">
                <div v-for="(singlePack, index) in potentialList" :key="index"
                     v-show="singlePack.packType === 'activity'" class="gacha_unit_child" style="display: inline-block"
                     @change="compute(singlePack.packName)">
                  <el-checkbox-button :label="index" size="small">
                    <div class="gacha_unit_child_title" style="width: 144px">
                      {{ singlePack.packName }}
                    </div>
                    <div class="gacha_resources_unit">
                      <div :class="getSpriteImg('4002icon')"></div>
                      <div style="width: 36px">{{ singlePack.gachaOriginium }}</div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
            </div>
          </el-collapse-item>
          <!-- 氪金资源 -->
          <el-collapse-item class="collapse-item" name="pack" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">氪金资源 {{ toFixedByAcc(calcResult.gachaTimes_gacha, 0) }}抽</span>
            </template>

            <div class="gacha_unit" id="charge">
              <div class="gacha_unit_child_instruction" style="padding: 4px 16px; font-size: 18px;">
                标签内为每抽价格(元)，颜色用于区分性价比<br/>
                仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡<br/>
                <a href="https://ark.yituliu.cn/material/pack">点击跳转礼包完整性价比</a>
              </div>
              <!-- 月常礼包 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                月常礼包
              </div>
              <div class="gacha_unit_child" style="display: flex">
                <div @click="compute()">
                  <el-switch v-model="monthlyFlag" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
                  本月月卡已买（选中该选项则-6源石）
                </div>
              </div>
              <div class="el-input_wrap">
                <div class="el-input_text">额外购买</div>
                <el-input-number v-model="monthlyCardExtra" @change="compute()" :min="0" :max="3"
                                 label="描述文字"></el-input-number>
                <div class="el-input_text">张月卡</div>
                （每张月卡可预支6石）
              </div>
              <el-checkbox-group v-model="selectedPacks">
                <div v-for="(singlePack, index) in monthlyPackList" :key="index" :id="singlePack.name"
                     v-show="checkExpiration(singlePack.start,singlePack.end,'公共',singlePack.name)"
                     class="gacha_unit_child" @change="compute(singlePack.name)">
                  <el-checkbox-button :label="singlePack.parentIndex">
                    <div class="gacha_packPpr" :class="getPprLabel(singlePack.eachDrawPrice)">
                      {{ toFixedByAcc(singlePack.eachDrawPrice, 2) }}
                    </div>
                    <div class="gacha_unit_child_title" style="width: 168px">
                      {{ singlePack.name }}
                    </div>
                    <div class="gacha_resources_unit" style="width: 192px">
                      <div style="width: 40px" v-show="singlePack.orundum !== 0" :class="getSpriteImg('4003icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.orundum !== 0">
                        {{ singlePack.orundum }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.originium !== 0"
                           :class="getSpriteImg('4002icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.originium !== 0">
                        {{ singlePack.originium }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha !== 0" :class="getSpriteImg('7003icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.ticketGacha !== 0">
                        {{ singlePack.ticketGacha }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha10 !== 0"
                           :class="getSpriteImg('7004icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.ticketGacha10 !== 0">
                        {{ singlePack.ticketGacha10 }}
                      </div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <!-- 限时礼包 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                限时礼包
              </div>
              <el-checkbox-group v-model="selectedPacks" class="">
                <div v-for="(singlePack, index) in limitedPackList" :key="index"
                     class="gacha_unit_child" @change="compute(singlePack.name)">
                  <el-checkbox-button :label="singlePack.parentIndex">
                    <div class="gacha_packPpr" :class="getPprLabel(singlePack.eachDrawPrice)">
                      {{ toFixedByAcc(singlePack.eachDrawPrice, 2) }}
                    </div>
                    <div class="gacha_unit_child_title" style="width: 168px">
                      {{ singlePack.displayName }}
                    </div>
                    <!-- 一个通用的资源显示模块 -->
                    <div class="gacha_resources_unit" style="width: 279px">
                      <div style="width: 40px" v-show="singlePack.orundum > 0.1" :class="getSpriteImg('4003icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.orundum > 0.1">
                        {{ singlePack.orundum }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.originium > 0.1"
                           :class="getSpriteImg('4002icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.originium > 0.1">
                        {{ singlePack.originium }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha > 0.1" :class="getSpriteImg('7003icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.ticketGacha > 0.1">
                        {{ singlePack.ticketGacha }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha10 > 0.1"
                           :class="getSpriteImg('7004icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.ticketGacha10 > 0.1">
                        {{ singlePack.ticketGacha10 }}
                      </div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <!-- 新人礼包 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                新人礼包
              </div>
              <el-checkbox-group v-model="selectedPacks" class="">
                <div v-for="(singlePack, index) in disposablePackList" :key="index"
                     class="gacha_unit_child" @change="compute(singlePack.name)">
                  <el-checkbox-button :label="singlePack.parentIndex">
                    <div class="gacha_packPpr" :class="getPprLabel(singlePack.eachDrawPrice)">
                      {{ toFixedByAcc(singlePack.eachDrawPrice, 2) }}
                    </div>
                    <div class="gacha_unit_child_title" style="width: 168px">
                      {{ singlePack.name }}
                    </div>
                    <!-- 一个通用的资源显示模块 -->
                    <div class="gacha_resources_unit" style="width: 279px">
                      <div style="width: 40px" v-show="singlePack.orundum > 0.1"
                           :class="getSpriteImg('4003icon')"/>
                      <div style="width: 54px" v-show="singlePack.orundum > 0.1">
                        {{ singlePack.orundum }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.originium > 0.1"
                           :class="getSpriteImg('4002icon')"/>
                      <div style="width: 54px" v-show="singlePack.originium > 0.1">
                        {{ singlePack.originium }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha > 0.1" :class="getSpriteImg('7003icon')"/>
                      <div style="width: 54px" v-show="singlePack.ticketGacha > 0.1">
                        {{ singlePack.ticketGacha }}
                      </div>
                      <div style="width: 40px" v-show="singlePack.ticketGacha10 > 0.1"
                           :class="getSpriteImg('7004icon')"/>
                      <div style="width: 54px" v-show="singlePack.ticketGacha10 > 0.1">
                        {{ singlePack.ticketGacha10 }}
                      </div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <div id="newbie_info" style="font-size: 12px; padding: 0 8px;">
                *[新人进阶组合包]内置了一张月卡，这导致攒抽计算需要根据自身情况进行修正<br/>
                非月卡党：直接选择“新人进阶组合包”，但需减去池子结束前领不到的玉<br/>
                月卡党：选择“进阶包不含月卡”，如果[当前月卡有效期>池子关闭日期]，需加上提前获得的6源石
              </div>
              <!-- 首充 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                源石首充
              </div>
              <el-checkbox-group v-model="selectedPacks" class="">
                <div v-for="(singlePack, index) in doubleOriginiumList" :key="index" @change="compute">
                  <el-checkbox-button :label="singlePack.parentIndex" style="margin: 4px">
                    <div class="gacha_packPpr" :class="getPprLabel(singlePack.eachDrawPrice)">
                      {{ toFixedByAcc(singlePack.eachDrawPrice, 2) }}
                    </div>
                    <div class="gacha_unit_child_title" style="width: 168px">
                      {{ singlePack.displayName }}
                    </div>
                    <div class="gacha_resources_unit" style="width: 102px">
                      <div style="width: 40px" v-show="singlePack.oiginium !== 0"
                           :class="getSpriteImg('4002icon')">
                      </div>
                      <div style="width: 54px" v-show="singlePack.originium !== 0">
                        {{ singlePack.originium }}
                      </div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <!-- 非首充 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                非首充
              </div>

              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()"
                       v-model.number="originium_648"/>
                <div class="gacha_packPpr" :class="getPprLabel(11.68)">11.68</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石648元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_648 * 185, 0) }}
                  </div>
                </div>
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()"
                       v-model.number="originium_328"/>
                <div class="gacha_packPpr" :class="getPprLabel(12.15)">12.15</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石328元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_328 * 90, 0) }}
                  </div>
                </div>
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()"
                       v-model.number="originium_198"/>
                <div class="gacha_packPpr" :class="getPprLabel(13.2)">13.20</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石198元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_198 * 50, 0) }}
                  </div>
                </div>
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="originium_98"/>
                <div class="gacha_packPpr" :class="getPprLabel(13.61)">13.61</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石98元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_98 * 24, 0) }}
                  </div>
                </div>
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="originium_30"/>
                <div class="gacha_packPpr" :class="getPprLabel(14.29)">14.29</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石30元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_30 * 7, 0) }}
                  </div>
                </div>
              </div>
              <div class="gacha_unit_child">
                <input class="gacha_unit_child_inputbox" type="text" @change="compute()" v-model.number="originium_6"/>
                <div class="gacha_packPpr" :class="getPprLabel(20.0)">20.00</div>
                <div class="gacha_unit_child_title" style="width: 225px">普通源石6元</div>
                <div class="gacha_resources_unit" style="width: 126px">
                  <div style="width: 40px" :class="getSpriteImg('4002icon')"></div>
                  <div style="width: 54px">
                    {{ toFixedByAcc(originium_6, 0) }}
                  </div>
                </div>
              </div>

              <!-- 复选模块End -->
            </div>
          </el-collapse-item>
          <!-- 活动获得（估算） -->
          <el-collapse-item class="collapse-item" name="activity" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">活动获得（估算）{{ toFixedByAcc(calcResult.gachaTimes_act, 0) }}抽</span>
            </template>

            <div class="gacha_unit" id="activity">
              <!-- 复刻活动 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                复刻活动
              </div>
              <el-checkbox-group v-model="selectedActivityReList" class="">
                <div v-for="(actRe, key) in activityByHoneyCake" :key="key" class="gacha_unit_child"
                     @change="compute(key)">
                  <el-checkbox-button :label="key"
                                      v-show="checkExpiration(actRe.start, actRe.end, actRe.rewardType) && 'actRe' === actRe.module">
                    <div class="gacha_unit_child_title" style="width: 200px">
                      {{ key }}
                    </div>
                    <div class="gacha_resources_unit" style="width: 192px">
                      <div style="width: 40px" v-show="actRe.orundum !== 0" :class="getSpriteImg('4003icon')"></div>
                      <div style="width: 54px" v-show="actRe.orundum !== 0">
                        {{ actRe.orundum }}
                      </div>
                      <div style="width: 40px" v-show="actRe.originium !== 0" :class="getSpriteImg('4002icon')"></div>
                      <div style="width: 54px" v-show="actRe.originium !== 0">
                        {{ actRe.originium }}
                      </div>
                      <div style="width: 40px" v-show="actRe.permit !== 0" :class="getSpriteImg('7003icon')"></div>
                      <div style="width: 54px" v-show="actRe.permit !== 0">
                        {{ actRe.permit }}
                      </div>
                      <div style="width: 40px" v-show="actRe.permit10 !== 0" :class="getSpriteImg('7004icon')"></div>
                      <div style="width: 54px" v-show="actRe.permit10 !== 0">
                        {{ actRe.permit10 }}
                      </div>
                    </div>
                  </el-checkbox-button>
                </div>
              </el-checkbox-group>
              <!-- 固定内容 -->
              <div class="gacha_unit_fold">
                <div class="triangle"></div>
                其它活动
              </div>
              <div v-for="(act, key) in activityByHoneyCake" :key="key">
                <div class="gacha_unit_child"
                     v-show="checkExpiration(act.start, act.end, act.rewardType) && 'act' === act.module">
                  <div class="gacha_unit_child_title">{{ key }}</div>
                  <!-- 一个通用的资源显示模块 -->
                  <div class="gacha_resources_unit" style="width: 234px">
                    <div style="width: 40px" v-show="act.orundum !== 0" :class="getSpriteImg('4003icon')"></div>
                    <div style="width: 54px" v-show="act.orundum !== 0">
                      {{ act.orundum }}
                    </div>
                    <div style="width: 40px" v-show="act.originium !== 0" :class="getSpriteImg('4002icon')"></div>
                    <div style="width: 54px" v-show="act.originium !== 0">
                      {{ act.originium }}
                    </div>
                    <div style="width: 40px" v-show="act.permit !== 0" :class="getSpriteImg('7003icon')"></div>
                    <div style="width: 54px" v-show="act.permit !== 0">
                      {{ act.permit }}
                    </div>
                    <div style="width: 40px" v-show="act.permit10 !== 0" :class="getSpriteImg('7004icon')"></div>
                    <div style="width: 54px" v-show="act.permit10 !== 0">
                      {{ act.permit10 }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- 其它资源（估算） -->
          <el-collapse-item class="collapse-item" name="other" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon"></div>
              <span class="collapse-item_title">其它资源（估算）{{
                  toFixedByAcc(calcResult.gachaTimes_other, 0)
                }}抽</span>
            </template>
            <!-- 夏活专用滑块 -->
            <!-- <template v-if="timeSelector === '夏活(以8.3计)'">
              <div class="gacha_unit_child" style="display: flex">
                <div class="gacha_unit_child_title">未知奖励</div>
                <client-only>
                  <el-slider
                    v-model="customValue_slider"
                    :step="1000"
                    :min="2000"
                    :max="10000"
                    show-stops
                    show-input
                    @change="compute()"
                    style="flex-grow: 1; flex-shrink: 5"
                  >
                  </el-slider>
                </client-only>
              </div>
              <div class="gacha_unit_info">修bug，突发维护等。左边保守估计，右边乐观估计</div>
              <div class="gacha_unit_info">数据参考自 <a href="https://www.bilibili.com/read/cv22112499">雷界一渣@B站</a> 的个人统计</div>
            </template> -->
            <!-- 其他资源 -->
            <div class="gacha_unit" id="otherRes">
              <div v-for="(other, key) in activityByHoneyCake" :key="key">
                <!-- 只显示当前选择的时间段内的奖励&&(公共的奖励||只可当期使用的奖励) -->
                <div class="gacha_unit_child"
                     v-show="checkExpiration(other.start, other.end, other.rewardType) && 'honeyCake' === other.module">
                  <div class="gacha_unit_child_title" style="width: 240px">
                    {{ key }}
                  </div>
                  <div class="gacha_resources_unit" style="width: 234px">
                    <div style="width: 40px" v-show="other.orundum !== 0" :class="getSpriteImg('4003icon')"></div>
                    <div style="width: 54px" v-show="other.orundum !== 0 && key !== '红包墙'">
                      {{ other.orundum }}
                    </div>
                    <div style="width: 54px" v-show="other.orundum !== 0 && key === '红包墙'">
                      {{ other.orundum - poolCountDown * 600 }}
                    </div>
                    <div style="width: 40px" v-show="other.originium !== 0" :class="getSpriteImg('4002icon')"></div>
                    <div style="width: 54px" v-show="other.originium !== 0">
                      {{ other.originium }}
                    </div>
                    <div style="width: 40px" v-show="other.permit !== 0" :class="getSpriteImg('7003icon')"></div>
                    <div style="width: 54px"
                         v-show="other.permit !== 0 && key.indexOf('春节池') <0">
                      {{ other.permit }}
                    </div>
                    <div style="width: 54px"
                         v-show="other.permit !== 0 && key.indexOf('春节池') >-1">
                      {{ other.permit - poolCountDown }}
                    </div>
                    <div style="width: 40px" v-show="other.permit10 !== 0" :class="getSpriteImg('7004icon')"></div>
                    <div style="width: 54px" v-show="other.permit10 !== 0">
                      {{ other.permit10 }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>
          <!-- 致谢 -->
          <el-collapse-item class="collapse-item" name="develop" style="margin:8px">
            <template #title>
              <div class="g-calc-collpase-title-icon" style="background: #337fcb"></div>
              <span class="collapse-item_title">开发信息</span>
            </template>
            <div id="extra" style="max-width: 1080px; margin: auto">
              <div id="foot_main">
                <!-- <div id="foot_left"> -->
                <div class="foot_unit">
                  <p class="foot_unit_title">-开发信息-</p>
                  <a href="https://github.com/Arknights-yituliu/frontend-v2-plus">
                    <div class="foot_unit_button uni_shadow_2" id="foot_frontEnd">
                      <img class="foot_unit_pic" src="/image/website/GitHub.webp" alt=""/>
                      前端
                    </div>
                  </a>
                  <a href="https://github.com/yamasakura/yituliuBackEnd">
                    <div class="foot_unit_button uni_shadow_2" id="foot_backEnd">
                      <img class="foot_unit_pic" src="/image/website/GitHub.webp" alt=""/>
                      后端
                    </div>
                  </a>
                  <a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">
                    <div class="foot_unit_button uni_shadow_2" style="width: 198px">
                      <img class="foot_unit_pic" src="/image/website/qq.webp" alt=""/>
                      开发群 938710832
                    </div>
                  </a>
                  <a href="https://shimo.im/sheets/dPkpKP1zQmc1PvqO/7mSBe">
                    <div class="foot_unit_button uni_shadow_2" style="width: 198px">
                      <img class="foot_unit_pic" src="/image/icon/图标_源石.png" alt=""/>
                      本站财政状况
                    </div>
                  </a>
                </div>
                <div class="foot_unit">
                  <p class="foot_unit_title">-本页开发-</p>
                  <a href="https://space.bilibili.com/39109412">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/84258011?v=4" alt=""/>
                      山桜
                    </div>
                  </a>
                  <a href="https://space.bilibili.com/10057492">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/84625349?v=4" alt=""/>
                      Zirunwang
                    </div>
                  </a>
                  <a href="https://github.com/Yanstory">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/5153875?v=4" alt=""/>
                      Yanstory
                    </div>
                  </a>
                  <a href="https://github.com/DSLM">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="https://avatars.githubusercontent.com/u/12635058?v=4" alt=""/>
                      DSLM
                    </div>
                  </a>
                  <a href="https://zhaozuohong.vip">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="https://zhaozuohong.vip/avatar.png" alt=""/>
                      ZhaoZuohong
                    </div>
                  </a>
                </div>
                <!-- </div> -->
                <!-- <div id="foot_right"> -->
                <div class="foot_unit">
                  <p class="foot_unit_title">-数据支持-</p>
                  <a href="https://space.bilibili.com/8412516">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: rgb(128,128,128)">
                      <img class="foot_unit_pic" src="/image/website/honeycake.webp" alt=""/>罗德岛蜜饼工坊
                    </div>
                  </a>
                  <a href="https://prts.wiki/w/%E9%A6%96%E9%A1%B5">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: rgb(128,128,128)">
                      <img class="foot_unit_pic" src="/image/website/prts.webp" alt=""/>PRTS
                    </div>
                  </a>
                  <a href="https://ark.yituliu.cn/">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: rgb(128,128,128)">
                      <img class="foot_unit_pic" src="/image/website/ico64.png" alt=""/>一图流主站
                    </div>
                  </a>
                  <!-- <a href="https://space.bilibili.com/22606843">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle; color: gray">
                      <img class="foot_unit_pic" src="/image/website/公孙长乐.webp" />公孙长乐
                    </div>
                  </a> -->
                </div>
                <div class="foot_unit">
                  <p class="foot_unit_title">-B站发布-</p>
                  <a href="https://space.bilibili.com/688411531">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="/image/website/bilibili.webp" alt=""/>
                      罗德岛基建BETA
                    </div>
                  </a>
                  <p class="foot_unit_title">-粉丝群/反馈-</p>
                  <a href="https://jq.qq.com/?_wv=1027&k=q1z3p9Yj">
                    <div class="foot_unit_button uni_shadow_2" style="vertical-align: middle">
                      <img class="foot_unit_pic" src="/image/website/qq.webp" alt=""/>
                      阿戈尔数据文献馆
                    </div>
                  </a>
                </div>
                <!-- </div> -->
              </div>
              <div style="padding: 8px 16px 8px 16px; max-width: 1080px; margin: auto">
                本页采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享 署名-非商业性使用 4.0
                国际
                许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接；且未经许可，不得将本站内容或由其衍生作品用于商业目的。<br/>
                本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来开发群一叙。
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        <!-- <foot></foot> -->
      </el-col>
    </el-row>
  </div>
</template>

<script>
import gacha_potentialJson from "/src/static/json/tools/potentialGachaResources.json"; //常驻活动和主线数据
import gacha_honeyCakeJson from "/src/static/json/tools/activityScheduleByHoneycake.json"; //其他奖励数据
import "/src/assets/css/sprite_gacha.css";
import "/src/assets/css/gacha.css";
import cookie from "js-cookie";
import * as echarts from "echarts";
import storeAPI from '/src/api/store'

let myChart = "";
import {ClientOnly} from "/src/components/ClientOnly";
import {ElMessage} from "element-plus";

export default {
  components: {ClientOnly},

  data() {
    return {
      itemList: [],
      checkBox1: ["total-table"],
      checkBox: ["exist", "daily", "activity", "other", 'develop'], //折叠栏绑定数组
      rewardType: "限定", //奖励的类型
      startTime: "", //开始时间
      endTime: "", //结束时间
      startTimestamp: "", //开始时间戳
      endTimestamp: "", //结束时间戳
      timeSelector: "春节(2.17)", //活动时间节点选择框的绑定对象
      potentialList: gacha_potentialJson, //常驻活动和主线
      selectedPotentialList: [],
      // gacha_storePacks: gacha_storePacksJson.data,
      storePackList: [], //商店礼包
      selectedPacks: [], //用户选中的礼包
      store258List: [], //黄票兑换38抽
      selectedStore258List: [],
      activityByHoneyCake: gacha_honeyCakeJson, //其他奖励数据
      selectedActivityReList: [],
      monthlyPackList: [],
      selectedMonthlyPackList: [],
      limitedPackList: [],
      selectedLimitedPackList: [],
      disposablePackList: [],
      selectedDisposablePackList: [],
      doubleOriginiumList: [],
      selectedDoubleOriginiumList: [],

      originium: 0, //源石
      orundum: 0, //合成玉
      permit: 0, //寻访
      permit10: 0, //十连寻访
      sellsCount: 0, //总氪金总和
      gachaTimes_total: 0, //总抽卡次数

      calcResult: {}, //攒抽计算的各种结果

      paradox: 0, //悖论模拟
      annihilation: 0, //未通过剿灭个数
      orundum_ap: 0, //用于搓玉的理智数量
      orundum_rate: 1.09, //搓玉系数
      orundum_green: 0, //现有绿票数
      orundum_green_x: 0, //可用于换玉的绿票数 
      orundum_green_y: 0, //绿票换出的玉
      item_30012: 0,
      item_30062: 0,
      orundumByManufacture: 0,

      remainingDays: 0, //剩余天数
      remainingWeeks: 0, //剩余周数
      remainingMonths: 0, //剩余月数
      remainingCheckinTimes: 0, // 剩余签到次数

      gachaTimes_originium: 0,

      originium_648: 0, //普通源石648
      originium_328: 0, //普通源石328
      originium_198: 0, //普通源石198
      originium_98: 0, //普通源石98
      originium_30: 0, //普通源石30
      originium_6: 0, //普通源石6
      poolCountDown: 0, //限定池每日送抽倒计时
      permitCountDown: true, //限定池每日送抽倒计时
      orundumCountDown: true, //限定池每日送抽倒计时

      monthlyFlag: true, //本月月卡是否已买
      monthlyCardExtra: 0, //额外月卡

      dailyRewards: 100, //每日奖励
      weeklyTaskRewards: 500, //周常奖励
      annihilationRewards: 1800, //剿灭奖励
      originiumFlag: true, //是否源石抽卡
      annihilationFlag: true, //是否完成剿灭
      weeklyTaskFlag: true, //是否完成周常
      storeFlag: false, //是否兑换绿票商店
      annihilationValue: true, //当周的剿灭合成玉奖励
      weeklyTaskValue: true, //当周的周常合成玉奖励
      storeValue: 0, //绿票商店抽数
      skinNumValue: 0, //皮肤消耗源石数量
      customValue: 0, //自定义值
      customValue_slider: 3000, //夏活前自定义滑块
      cookieInit: 0, //cookie是否获取标志
      moreOptions: true,
      LMDCost: 0,
      pieData: [],
      current_pool_end_time: '',
      schedules: {
        '春节(2.15)': {
          display: true,
          endTime: '2024/02/15 03:58:00',
          rewardType: "春节限定",
          permitCountDown: true,
          orundumCountDown: true
        },
        '彩六二期(4.4)': {
          display: true,
          endTime: '2024/04/04 03:58:00',
          rewardType: "联动限定",
          permitCountDown: false,
          orundumCountDown: true
        },
        '周年(5.15)': {
          display: true,
          endTime: '2024/05/15 04:01:00',
          rewardType: "周年限定",
          permitCountDown: false,
          orundumCountDown: true
        }
      }
      // pack_data: this.pageContext.pageProps.pack_data,
    };
  },

  mounted() {
    this.TimeStampFormat();
    this.timeSelector = '春节(2.15)'
    this.getPackDataList()
    this.checkEndDate();


    myChart = echarts.init(document.getElementById("gacha_total_pie"));
    this.pieChart(this.pieData);
    this.openNotification();

    const url_path = window.location.pathname.split("/")[1];
    if (url_path === "gachaCal") {
      ElMessage({
        dangerouslyUseHTMLString: true,
        message: '此页面已迁移至<a href="/tools/gachaCal">https://ark.yituliu.cn/tools/gachaCal</a>',
        type: "warning",
      });
    }
  },
  methods: {

    getPackDataList() {
      storeAPI.findPackStore().then(response => {
        this.storePackList = [];
        let index = 0;
        for (let pack of response.data) {
          if (!(pack.eachDrawPrice > 0)) {
            continue;
          }
          if (pack.name === '每月寻访组合包' || pack.name.indexOf('普通源石') > -1) {
            continue
          }

          pack.parentIndex = index
          this.storePackList.push(pack)

          if (pack.type === 'once') {
            this.disposablePackList.push(pack)
          }

          if (pack.type === 'year') {
            this.doubleOriginiumList.push(pack)
          }

          if (pack.type === 'monthly') {
            this.monthlyPackList.push(pack)
          }

          if (pack.type === 'limited') {
            this.limitedPackList.push(pack)
          }

          index++

        }

        this.setPackData();
        // this.setDdoubleOriginium();

        console.log(this.storePackList)
      })
    },

    //公告通知
    openNotification() {
      this.$notify({
        title: "2024.01.27更新",
        dangerouslyUseHTMLString: true,
        message: "<strong>1.更新了彩六联动二期攒抽<br></strong>",
        // message: "<strong>1.更新了彩六联动二期攒抽<br>2.请在森空岛投票支持一下'罗德岛基建BETA'!'谢谢大家!</strong>",
        duration: 6000,
      });
    },
    // 选择攒计算的时间节点
    checkEndDate() {
      if (this.schedules[this.timeSelector]) {
        const schedule = this.schedules[this.timeSelector]
        this.endTime = schedule.endTime;
        //这里是切换奖励类型，具体看下面的注释，搜索 奖励类型
        this.rewardType = schedule.rewardType;
        console.log(schedule)
        //是否要计算限定池倒计时（主要用于计算每日赠送合成玉和单抽）
        this.permitCountDown = schedule.permitCountDown;
        //是否要计算限定池倒计时（主要用于计算每日赠送合成玉和单抽）
        this.orundumCountDown = schedule.orundumCountDown;

        this.getTodayDate();
        this.getInterval();
        this.getEveryreWard();
        this.compute();
      }
    },

    //获取当天日期
    getTodayDate() {
      const date = new Date();
      const y = date.getFullYear(); //年
      const m = (date.getMonth() + 1).toString().padStart(2, "0"); //月
      const d = date.getDate().toString().padStart(2, "0"); //日
      const h = date.getHours().toString().padStart(2, "0"); //时
      const mm = date.getMinutes().toString().padStart(2, "0"); //分
      const s = date.getSeconds().toString().padStart(2, "0"); //秒
      this.startTime = `${y}/${m}/${d} ${h}:${mm}:${s}`;
      // this.startTime = "2023/08/14 04:00:00";
      this.startTimestamp = Date.parse(this.startTime); //今日日期的时间戳
      this.endTimestamp = Date.parse(this.endTime); //结束日期的时间戳
      this.getPoolCountDown();
    },

    //日期转为时间戳
    TimeStampFormat() {
      Object.entries(this.activityByHoneyCake).forEach((list) => {
        list[1].start = Date.parse(new Date(list[1].start).toString());
        list[1].end = Date.parse(new Date(list[1].end).toString());
      });
      this.storePackList.forEach((element) => {
        element.start = Date.parse(new Date(element.start).toString());
        element.end = Date.parse(new Date(element.end).toString());
      });
    },

    //获取还有多少天
    getInterval() {
      console.log("今天是", this.startTime);
      this.remainingWeeks = 0; //剩余周数
      this.remainingCheckinTimes = 0; //剩余签到次数
      this.remainingMonths = 1; //剩余月数

      this.endTimestamp = Date.parse(this.endTime); //结束日期的时间戳
      const timeInterval = parseInt((this.endTimestamp - this.startTimestamp) / 86400000) //计算剩余天数

      let month = new Date(this.startTime).getMonth();

      const endDate = new Date(Date.parse(this.endTime));
      if (endDate.getDay() === 1) this.remainingWeeks--;

      for (let i = 1; this.startTimestamp + 86400000 * i <= this.endTimestamp; i++) {
        const date = new Date(this.startTimestamp + 86400000 * i);
        // console.log(this.start_TimeStamp + 86400000 * i)
        if (date.getDay() === 1) this.remainingWeeks++; //判断接下来还有多少个星期一
        if (date.getDate() === 17) this.remainingCheckinTimes++; //判断接下来还有17号，17号签到有抽卡券
        if (month != new Date(date).getMonth()) {
          // 通过保存的月份!=当前获取的月份，判断是否到了下个月，是则月数+1
          month = new Date(date).getMonth();
          this.remainingMonths++;
        }
      }

      if (this.remainingWeeks < 0) this.remainingWeeks = 0;

      this.remainingDays = timeInterval; //赋值剩余天数
      // console.log("距离活动还有：", this.remainingMonths + "月，", this.remainingWeeks + "周，", this.remainingDays + "天");
    },

    // 设置258黄票商店兑换抽卡券
    setPackData() {
      let currentMonth = new Date().getMonth() + 1; //月

      let currentYear = new Date().getFullYear();
      let nextYear = currentYear;
      this.store258List = [];

      let index = this.storePackList.length
      for (let i = 0; i <= 12; i++) {
        const currentMonthText = currentMonth.toString().padStart(2, "0");

        let nextMonth = currentMonth + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
        }

        const nextMoonText = nextMonth.toString().padStart(2, "0");

        this.store258List.push({
          name: currentMonth + "月黄票换抽",
          price: 0,
          originium: 0,
          orundum: 0,
          ticketGacha: 8,
          ticketGacha10: 3,
          type: "store",
          start: Date.parse(new Date(currentYear + "/" + currentMonthText + "/01 00:00:00").toString()),
          end: Date.parse(new Date(nextYear + "/" + nextMoonText + "/01 04:00:00").toString()),
          rewardType: "公共",
        });


        const monthlyPack = {
          name: currentMonth + "月大月卡",
          price: 168,
          originium: 42,
          orundum: 0,
          ticketGacha: 0,
          ticketGacha10: 1,
          type: "monthly",
          eachDrawPrice: 7.4,
          parentIndex: index,
          start: Date.parse(new Date(currentYear + "/" + currentMonthText + "/01 00:00:00").toString()),
          end: Date.parse(new Date(nextYear + "/" + nextMoonText + "/01 04:00:00").toString()),
          rewardType: "公共",
        }

        this.storePackList.push(monthlyPack);
        this.monthlyPackList.push(monthlyPack)

        index++

        // console.log('start——', year_now + "/" + moon_now_str + "/01 00:00:00");
        // console.log('end——',year_next + "/" + moon_next_str + "/01 04:00:00");

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    },


    //判断奖励是否在时间段内
    checkExpiration(start, end, rewardType, packName) {

      if (end < this.startTimestamp) return false;
      if (start <= this.endTimestamp && ("公共" === rewardType || this.rewardType === rewardType)) return true;

      return false;
    },

    //获取限定池和红包倒计时
    getPoolCountDown() {
      const num = parseInt((this.endTimestamp - this.startTimestamp) / 86400000); //计算距离限定池还有多少天
      if (num < 14) {
        //少于14天扣除每日赠送抽卡资源
        this.poolCountDown = 14 - num;
      }
      console.log("限定池还有" + num + "天,结束");
    },

    //  计算日常奖励
    getEveryreWard() {
      this.dailyRewards = 100 * this.remainingDays;
      this.weeklyTaskRewards = 500 * this.remainingWeeks;
      this.annihilationRewards = 1800 * this.remainingWeeks;
    },

    compute() {
      //初始化各种对象
      this.valueInit();

      //判断是否用源石抽卡
      var flag_originium = 0;
      if (this.originiumFlag) {
        flag_originium = 1;
      }

      //判断是否完成周常日常
      this.weeklyTaskValue = 1;
      if (this.weeklyTaskFlag) {
        this.weeklyTaskValue = 0;
      }

      //判断是否完成剿灭
      this.annihilationValue = 1;
      if (this.annihilationFlag) {
        this.annihilationValue = 0;
      }

      this.storeValue = 0;
      // 这个值可能是从cookie拿到,要转换一下类型
      if (typeof this.storeFlag === "string") {
        if (this.storeFlag === "false") this.storeFlag = false;
        if (this.storeFlag === "true") this.storeFlag = true;
      }

      //判断是否兑换完本月绿票商店
      if (this.storeFlag) {
        this.storeValue = 1;
      }
      //计算绿票商店
      if (this.orundum_green_x > 11590) {
        this.orundum_green_y = this.orundum_green_x - 11590;
      } else {
        this.orundum_green_y = 0;
      }
      this.orundum_green = parseInt(this.orundum_green_y / 50) * 30;

      //  计算自定义合成玉和搓玉
      let custom_exist = this.customValue + this.orundum_ap * this.orundum_rate + this.item_30012 * 5 + this.item_30062 * 10 + this.orundum_green_y;
      this.orundumByManufacture = this.item_30012 * 5 + this.item_30062 * 10;
      this.LMDCost = this.item_30012 * 800 + this.item_30062 * 1000;

      //库存抽卡次数（单项）
      this.calcResult.gachaTimes_exist =
          this.calcResult.originium_exist * 0.3 * flag_originium +
          this.calcResult.orundum_exist / 600 +
          custom_exist / 600 +
          this.calcResult.permit_exist +
          this.calcResult.permit10_exist * 10;

      //xxxx_daily格式的属性   日常奖励的各项奖励数量，下同
      this.calcResult.orundum_daily +=
          parseInt(this.dailyRewards) + //日常奖励
          parseInt(this.weeklyTaskRewards) + //周常奖励
          parseInt(this.annihilationRewards) + //剿灭奖励
          parseInt(this.remainingMonths - this.storeValue) * 600 + //绿票商店合成玉
          this.weeklyTaskValue * 500 + //当周周常是否已经完成
          this.annihilationValue * 1800; //当周剿灭是否已经完成

      this.calcResult.permit_daily +=
          parseInt(this.remainingMonths - this.storeValue) * 4 + //绿票商店凭证
          parseInt(this.remainingCheckinTimes); //每月签到

      //黄票商店38抽计算
      for (let i = 0; i < this.selectedStore258List.length; i++) {
        const store258 = this.store258List[this.selectedStore258List[i]];
        if (this.checkExpiration(store258.start, store258.end, store258.rewardType, store258.packName)) {
          this.calcResult.permit_daily += parseInt(store258.ticketGacha);
          this.calcResult.permit10_daily += parseInt(store258.ticketGacha10);
        }
      }

      //gachaTimes_daily    日常奖励的抽卡次数
      this.calcResult.gachaTimes_daily =
          parseInt(this.calcResult.originium_daily) * 0.3 * parseInt(flag_originium) +
          parseInt(this.calcResult.orundum_daily) / 600 +
          parseInt(this.calcResult.permit_daily) +
          parseInt(this.calcResult.permit10_daily) * 10;

      //主线和常驻活动计算（共计）
      this.selectedPotentialList.forEach((index) => {
        this.calcResult.originium_potential += parseInt(this.potentialList[index].gachaOriginium);
        this.calcResult.orundum_potential += parseInt(this.potentialList[index].gachaOrundum);
      });

      //悖论模拟
      this.calcResult.orundum_potential += parseInt(this.paradox) * 200 + this.annihilation * 1500;

      //主线和常驻活动抽卡次数（单项）
      this.calcResult.gachaTimes_potential = this.calcResult.originium_potential * 0.3 * flag_originium + this.calcResult.orundum_potential / 600;

      // index是被选中的商店礼包json的索引
      this.selectedPacks.forEach((index) => {
        //月卡单独判断
        let packItem = this.storePackList[index];
        console.log('选中的礼包：', packItem.name)
        const start = Date.parse(new Date(packItem.start).toString())
        const end = Date.parse(new Date(packItem.end).toString())
        if (this.checkExpiration(start, end, '公共', packItem.name)) {

          if ("月卡" === packItem.name) {
            // console.log("买的月卡个数", Math.ceil(this.remainingDays / 30));
            packItem.orundum = parseInt(this.remainingDays) * 200; //重新给商店礼包json的月卡的相关属性赋值
            packItem.originium = Math.ceil(this.remainingDays / 30) * 6; //重新给商店礼包json的月卡的相关属性赋值

            this.sellsCount += Math.ceil(this.remainingDays / 30) * 30; //计算售价
            this.calcResult.orundum_gacha += parseInt(this.remainingDays) * 200; //根据天数计算月卡的合成玉
            console.log(parseInt(this.remainingDays) * 200)
            this.calcResult.originium_gacha += Math.ceil(this.remainingDays / 30) * 6; //根据天数/30 计算月卡的源石
            if (this.monthlyFlag) {
              packItem.originium = packItem.originium - 6;
              this.calcResult.originium_gacha -= 6;
            }

            if (this.monthlyCardExtra > 2) {
              this.$message.error("月卡限制最多购买90天");
              packItem.originium += 12;
              this.calcResult.originium_gacha += 12;
              this.sellsCount += 60; //计算售价
            } else {
              packItem.originium += parseInt(this.monthlyCardExtra) * 6;
              this.calcResult.originium_gacha += parseInt(this.monthlyCardExtra) * 6;
              this.sellsCount += parseInt(this.monthlyCardExtra) * 30; //计算售价
            }
          } else {
            this.sellsCount += parseInt(packItem.price); //计算售价
            this.calcResult.orundum_gacha += parseInt(packItem.orundum);
            this.calcResult.originium_gacha += parseInt(packItem.originium);
            this.calcResult.permit_gacha += parseInt(packItem.ticketGacha);
            this.calcResult.permit10_gacha += parseInt(packItem.ticketGacha10);
          }
        }
      });

      // for(const index of this.selectedLimitedPackList){
      //   const pack =  this.limitedPackList[index]
      //   this.sellsCount += parseInt(pack.price); //计算售价
      //   this.calcResult.orundum_gacha += parseInt(pack.orundum);
      //   this.calcResult.originium_gacha += parseInt(pack.originium);
      //   this.calcResult.permit_gacha += parseInt(pack.ticketGacha);
      //   this.calcResult.permit10_gacha += parseInt(pack.ticketGacha10);
      // }

      //普通源石购买数量
      this.calcResult.originium_gacha +=
          this.originium_648 * 185 + this.originium_328 * 90 + this.originium_198 * 50 + this.originium_98 * 24 + this.originium_30 * 7 + this.originium_6;

      //氪金项目抽卡次数（单项）
      this.calcResult.gachaTimes_gacha =
          this.calcResult.originium_gacha * 0.3 * flag_originium +
          this.calcResult.orundum_gacha / 600 +
          this.calcResult.permit_gacha +
          this.calcResult.permit10_gacha * 10;

      // 计算购买的普通源石的价格
      this.sellsCount +=
          648 * this.originium_648 + 328 * this.originium_328 + 198 * this.originium_198 + 98 * this.originium_98 + 30 * this.originium_30 + 6 * this.originium_6;

      /*
      gacha_honeyCake的数据格式是
            {"奖励名称":{
                    "originium": 1,   源石
                    "orundum": 200,      合成玉
                    "permit": 0,    单抽
                    "permit10": 0,   十连
                    "start": "2023/03/07 16:00:00",      开始时间(暂时无用)
                    "end": "2023/03/21 03:59:00",        结束时间
                    "rewardType": "公共",             奖励类型  一般为公共，但是有些奖励是只有当期活动才能使用
                    "module": "honeyCake"        判断奖励是哪个模块,
               }
            }*/

      Object.entries(this.activityByHoneyCake) //转为一个list[list]   结构为[[奖励名称,奖励内容],[奖励名称,奖励内容]]
          .filter((list) => this.checkExpiration(list[1].start, list[1].end, list[1].rewardType, list[0])) //只计算当前选择的时间段内的奖励&&(公共的奖励||只可当期使用的奖励)
          .forEach((list) => {
            //循环list<list>， list为[奖励名称,奖励内容]
            if ("honeyCake" === list[1].module) {
              //这里是计算其他奖励
              console.log(list[0], "源石:", list[1].originium, "合成玉:", list[1].orundum, "寻访凭证:", list[1].permit, "十连凭证:", list[1].permit10);

              this.calcResult.originium_other += list[1].originium; //xxxxx_other格式的属性  其他奖励的的各项奖励数量，下同
              this.calcResult.orundum_other += list[1].orundum;
              this.calcResult.permit_other += list[1].permit;
              this.calcResult.permit10_other += list[1].permit10;
            } else if ("act" === list[1].module) {
              //这里是计算活动奖励
              console.log(list[0], "源石:", list[1].originium, "合成玉:", list[1].orundum, "寻访凭证:", list[1].permit, "十连凭证:", list[1].permit10);
              this.calcResult.originium_act += list[1].originium; //xxxx_act格式的属性 活动奖励的各项奖励数量，下同
              this.calcResult.orundum_act += list[1].orundum;
              this.calcResult.permit_act += list[1].permit;
              this.calcResult.permit10_act += list[1].permit10;
            }
          });


      this.selectedActivityReList.forEach((key) => {
        //循环UI上绑定的复刻多选框的选项集合，集合内为[奖励名称,奖励名称,奖励名称], key为奖励名称
        //这里是计算活动复刻奖励,通过key获得gacha_honeyCake内的奖励内容
        if (this.checkExpiration(this.activityByHoneyCake[key].start, this.activityByHoneyCake[key].end, this.activityByHoneyCake[key].rewardType, key)) {
          this.calcResult.originium_act += this.activityByHoneyCake[key].originium;
          this.calcResult.orundum_act += this.activityByHoneyCake[key].orundum;
          this.calcResult.permit_act += this.activityByHoneyCake[key].permit;
          this.calcResult.permit10_act += this.activityByHoneyCake[key].permit10;
        }
      });

      this.calcResult.gachaTimes_act =
          parseInt(this.calcResult.originium_act) * 0.3 * parseInt(flag_originium) +
          parseInt(this.calcResult.orundum_act) / 600 +
          parseInt(this.calcResult.permit_act) +
          parseInt(this.calcResult.permit10_act) * 10;

      //自动扣除部分 ↓
      //减去红包墙/矿区已经赠送过的合成玉
      console.log(this.orundumCountDown, this.permitCountDown)
      if (this.orundumCountDown) {
        console.log('合成玉扣除', parseInt(this.poolCountDown) * 600)
        this.calcResult.orundum_other -= parseInt(this.poolCountDown) * 600;
      }

      //减去限定池已经赠送过的单抽
      if (this.permitCountDown) {
        console.log('单抽扣除', parseInt(this.poolCountDown))
        this.calcResult.permit_other -= parseInt(this.poolCountDown);
      }


      console.log(
          "预测资源，",
          "源石:",
          this.calcResult.originium_other,
          "合成玉:",
          this.calcResult.orundum_other,
          "寻访凭证:",
          this.calcResult.permit_other,
          "十连凭证:",
          this.calcResult.permit10_other
      );

      // if (this.timeSelector === "夏活(8.15)") {
      //   this.calResults.orundum_other += parseInt(this.customValue_slider);
      // }

      //其他抽卡次数
      this.calcResult.gachaTimes_other =
          parseInt(this.calcResult.originium_other) * 0.3 * parseInt(flag_originium) +
          parseInt(this.calcResult.orundum_other) / 600 +
          parseInt(this.calcResult.permit_other) +
          parseInt(this.calcResult.permit10_other) * 10;

      // 所有模块相加-源石
      this.originium +=
          this.calcResult.originium_other +
          this.calcResult.originium_act +
          this.calcResult.originium_potential +
          this.calcResult.originium_daily +
          this.calcResult.originium_exist +
          this.calcResult.originium_gacha;
      // 所有模块相加-合成玉
      this.orundum +=
          this.calcResult.orundum_other +
          this.calcResult.orundum_act +
          this.calcResult.orundum_potential +
          this.calcResult.orundum_daily +
          this.calcResult.orundum_exist +
          this.calcResult.orundum_gacha +
          custom_exist;
      // 所有模块相加-单抽
      this.permit +=
          this.calcResult.permit_other +
          this.calcResult.permit_act +
          this.calcResult.permit_potential +
          this.calcResult.permit_daily +
          this.calcResult.permit_exist +
          this.calcResult.permit_gacha;
      // 所有模块相加-十连
      this.permit10 +=
          this.calcResult.permit10_other +
          this.calcResult.permit10_act +
          this.calcResult.permit10_potential +
          this.calcResult.permit10_daily +
          this.calcResult.permit10_exist +
          this.calcResult.permit10_gacha;

      //计算皮肤消耗
      if (parseInt(this.originium - parseInt(this.skinNumValue) * 18) < 0) this.$message.error("源石不足");
      this.originium = parseInt(this.originium) - parseInt(this.skinNumValue) * 18;
      this.originium = parseInt(this.originium) * parseInt(flag_originium);

      //源石抽卡次数
      this.gachaTimes_originium = this.originium * 0.3 * parseInt(flag_originium);

      //总抽卡次数
      this.gachaTimes_total =
          parseInt(this.originium) * 0.3 * parseInt(flag_originium) + parseInt(this.orundum) / 600 + parseInt(this.permit) + parseInt(this.permit10) * 10;

      // 设置饼图的数据内容
      this.pieData = [];
      this.setPieData(this.calcResult.gachaTimes_exist, "现有");
      this.setPieData(this.calcResult.gachaTimes_potential, "潜在");
      this.setPieData(this.calcResult.gachaTimes_daily, "日常");
      this.setPieData(this.calcResult.gachaTimes_gacha, "氪金");
      this.setPieData(this.calcResult.gachaTimes_act, "活动");
      this.setPieData(this.calcResult.gachaTimes_other, "其它");
      // console.log(this.calResults);
      if (this.cookieInit > 1) {
        this.pieChart(this.pieData);
      }
    },

    resourceCalculation(originium, orundum, permit, permit10) {
      this.originium += originium
      this.orundum += orundum
      this.permit += permit
      this.permit10 += permit10
    },

    setPieData(gachaTimes, describption) {
      let chartFan = {};
      if (gachaTimes > 0) {
        chartFan.value = parseInt(gachaTimes);
        chartFan.name = describption;
        this.pieData.push(chartFan);
      }
    },

    //初始化信息
    valueInit() {
      //首次打开页面读取cookie
      if (this.cookieInit === 0) {
        this.calcResult.originium_exist = cookie.get("originium_exist");
        this.calcResult.orundum_exist = cookie.get("orundum_exist");
        this.calcResult.permit_exist = cookie.get("permit_exist");
        this.calcResult.permit10_exist = cookie.get("permit10_exist");
        this.paradox = cookie.get("paradox");
        this.annihilation = cookie.get("annihilation");
        this.storeFlag = cookie.get("storeFlag");
      }

      // console.log(this.calResults.originium_exist ===undefined||this.calResults.originium_exist == "undefined");

      //没有cookie记录值强制赋值0
      if (this.calcResult.originium_exist === "" || this.calcResult.originium_exist === void 0 || this.calcResult.originium_exist === "undefined")
        this.calcResult.originium_exist = 0;
      if (this.calcResult.orundum_exist === "" || this.calcResult.orundum_exist === void 0 || this.calcResult.orundum_exist === "undefined")
        this.calcResult.orundum_exist = 0;
      if (this.calcResult.permit_exist === "" || this.calcResult.permit_exist === void 0 || this.calcResult.permit_exist === "undefined")
        this.calcResult.permit_exist = 0;
      if (this.calcResult.permit10_exist === "" || this.calcResult.permit10_exist === void 0 || this.calcResult.permit10_exist === "undefined")
        this.calcResult.permit10_exist = 0;
      if (this.paradox === "" || this.paradox === undefined || this.paradox === "undefined") this.paradox = 0;
      if (this.annihilation === "" || this.annihilation === undefined || this.annihilation === "undefined") this.annihilation = 0;
      if (this.storeFlag === undefined || this.storeFlag === "undefined") this.storeFlag = true;

      //保存cookie
      cookie.set("originium_exist", this.calcResult.originium_exist, {
        expires: 30,
      });
      cookie.set("orundum_exist", this.calcResult.orundum_exist, {
        expires: 30,
      });
      cookie.set("permit_exist", this.calcResult.permit_exist, {expires: 30});
      cookie.set("permit10_exist", this.calcResult.permit10_exist, {
        expires: 30,
      });
      cookie.set("paradox", this.paradox, {expires: 30});
      cookie.set("annihilation", this.annihilation, {expires: 30});
      cookie.set("storeFlag", this.storeFlag, {expires: 30});

      this.cookieInit++;

      if (this.originium_648 === "") this.originium_648 = 0;
      if (this.originium_328 === "") this.originium_328 = 0;
      if (this.originium_198 === "") this.originium_198 = 0;
      if (this.originium_98 === "") this.originium_98 = 0;
      if (this.originium_30 === "") this.originium_30 = 0;
      if (this.originium_6 === "") this.originium_6 = 0;
      if (this.customValue === "") this.customValue = 0;
      if (this.orundum_ap === "") this.orundum_ap = 0;
      if (this.orundum_green === "") this.orundum_green = 0;
      if (this.orundum_green_x === "") this.orundum_green_x = 0;
      if (this.orundum_green_y === "") this.orundum_green_y = 0;
      if (this.orundum_rate === "") this.orundum_rate = 0;

      this.paradox = parseInt(this.paradox);
      this.annihilation = parseInt(this.annihilation);
      this.originium_648 = parseInt(this.originium_648);
      this.originium_328 = parseInt(this.originium_328);
      this.originium_198 = parseInt(this.originium_198);
      this.originium_98 = parseInt(this.originium_98);
      this.originium_30 = parseInt(this.originium_30);
      this.originium_6 = parseInt(this.originium_6);
      this.customValue = parseInt(this.customValue);
      this.orundum_ap = parseInt(this.orundum_ap);
      this.orundum_green = parseInt(this.orundum_green);
      this.orundum_green_x = parseInt(this.orundum_green_x);
      this.orundum_green_y = parseInt(this.orundum_green_y);

      this.orundum_rate = parseFloat(this.orundum_rate);

      this.calcResult.originium_exist = parseInt(this.calcResult.originium_exist);
      this.calcResult.orundum_exist = parseInt(this.calcResult.orundum_exist);
      this.calcResult.permit_exist = parseInt(this.calcResult.permit_exist);
      this.calcResult.permit10_exist = parseInt(this.calcResult.permit10_exist);

      this.originium = 0;
      this.orundum = 0;
      this.permit = 0;
      this.permit10 = 0;
      this.sellsCount = 0;

      this.calcResult.originium_potential = 0;
      this.calcResult.orundum_potential = 0;
      this.calcResult.permit_potential = 0;
      this.calcResult.permit10_potential = 0;

      this.calcResult.originium_daily = 0;
      this.calcResult.orundum_daily = 0;
      this.calcResult.permit_daily = 0;
      this.calcResult.permit10_daily = 0;

      this.calcResult.originium_gacha = 0;
      this.calcResult.orundum_gacha = 0;
      this.calcResult.permit_gacha = 0;
      this.calcResult.permit10_gacha = 0;

      this.calcResult.originium_act = 0;
      this.calcResult.orundum_act = 0;
      this.calcResult.permit_act = 0;
      this.calcResult.permit10_act = 0;

      this.calcResult.originium_other = 0;
      this.calcResult.orundum_other = 0;
      this.calcResult.permit_other = 0;
      this.calcResult.permit10_other = 0;
    },

    toFixedByAcc(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },

    //获取雪碧图
    getSpriteImg(packName) {
      return "bg-" + packName + " sprite_gacha";
      // return "bg-" + packName;
    },

    getChapterWidth(index) {
      if (index % 2 === 0) return "width:200px;";
      else return "width:60px;";
    },

    getPprLabel(ppr) {
      if (ppr < 7.5) return "gacha_packPpr_t1";
      if (ppr < 11.7) return "gacha_packPpr_t2";
      return "gacha_packPpr_t3";
    },

    pieChart(data) {
      let option = {
        tooltip: {
          formatter: "{a} {b} : {c}抽,占 ({d}%)",
          position: "inner",
        },

        series: [
          {
            name: "攒抽占比",
            type: "pie",
            radius: "70%",
            center: ["50%", "50%"],
            data: data,
            itemStyle: {},
            label: {
              show: true,
              textStyle: {color: "rgb(255,69,0)", fontSize: "16"},
            },
            labelLine: {
              length: 6,
              length2: 6,
            },

            emphasis: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        ],
      };
      // console.log(option);
      myChart.setOption(option);
    },

    handleChange(val) {
      // console.log(val);
    },

    setDdoubleOriginium() {
      let index = this.storePackList.length
      this.doubleOriginiumList.push({
        packName: "双倍源石6元",
        packPrice: 6,
        gachaOriginium: 3,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        packRmbPerDraw: 6.67,
        parentIndex: index,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
      this.doubleOriginiumList.push({
        packName: "双倍源石30元",
        packPrice: 30,
        gachaOriginium: 12,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        packRmbPerDraw: 8.33,
        parentIndex: index + 1,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
      this.doubleOriginiumList.push({
        packName: "双倍源石98元",
        packPrice: 98,
        gachaOriginium: 40,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        packRmbPerDraw: 8.23,
        parentIndex: index + 2,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
      this.doubleOriginiumList.push({
        packName: "双倍源石198元",
        packPrice: 198,
        gachaOriginium: 80,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        packRmbPerDraw: 8.25,
        parentIndex: index + 3,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
      this.doubleOriginiumList.push({
        packName: "双倍源石328元",
        packPrice: 328,
        gachaOriginium: 132,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        packRmbPerDraw: 8.28,
        parentIndex: index + 4,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
      this.doubleOriginiumList.push({
        packName: "双倍源石648元",
        packPrice: 648,
        gachaOriginium: 260,
        gachaOrundum: 0,
        gachaPermit: 0,
        gachaPermit10: 0,
        packType: "year",
        parentIndex: index + 5,
        packRmbPerDraw: 8.31,
        start: Date.parse(new Date("2022/05/01 00:00:00").toString()),
        end: Date.parse(new Date("2099/04/30 00:00:00").toString()),
        rewardType: "公共",
      });
    },
  },
};

export const documentProps = {
  title: "一图流 - 攒抽规划",
  description: "明日方舟一图流，攒抽规划，氪金规划，攒抽计算器",
};
</script>

<style scoped>

.el-radio-group-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
  margin:8px 0;
  :deep(.el-radio-button__inner) {
    min-width: 160px;
    line-height: 20px;
  }
}

#gacha {
  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }

  :deep(.el-input_wrap) {
    display: flex;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  :deep(.el-input_text ) {
    height: 32px;
    line-height: 32px;
    margin-left: 16px;
    margin-right: 12px;
  }

  :deep(.el-collapse-item__wrap) {
    vertical-align: middle;
    will-change: height;
    border-bottom: 0;
    border-radius: 0 0 10px 10px;
    border-top: 1px solid #dfdfdf;
  }

  :deep(.el-collapse-item__header) {
    border-bottom: 0;
  }

  :deep(el-switch__core) {
    margin-bottom: 2px
  }

  :deep(.el-checkbox-button__inner) {
    padding: 2px;
  }

  :deep(.el-checkbox-button:last-child .el-checkbox-button__inner) {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
  }
  :deep(.el-checkbox-button:first-child .el-checkbox-button__inner) {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
  }

}

.foot_unit {
  font-size: 16px;
}

.foot_unit_title {
  margin: 4px 0px;
}

.collapse-item_title {
  font-size: 24px;
  padding: 8px 0px;
  font-weight: 600;
}

.el-divider--horizontal {
  margin: 2px 6px;
  width: calc(100% - 12px);
}

/* .el-switch__core{
    position: static;
      } */

#foot_main {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0px 12px 0px 12px;
  max-width: 1200px;
  margin: auto;
  background-color: var(--c-background-color);
}

.foot_unit {
  display: inline;
  top: 4px;
  width: 210px;
  float: left;
  margin: 4px 8px;
  white-space: nowrap;
  /* background-color: #bbbbbbdd; */
  border-radius: 8px;
}

#foot_main_dev {
  width: 100%;
  background-color: rgba(187, 187, 187, 0.86667);
  padding: 0px 16px 16px 16px;
  /* padding-bottom: 16px; */
}

#foot_main_dev > div {
  display: inline-block;
}

.foot_unit_title {
  font-size: 15px;
  font-weight: 600;
  color: #444444;
  margin: 14px 0px;
}

.foot_unit_content {
  color: gray;
  font-size: 16px;
  padding-left: 5px;
}

.foot_unit_pic {
  height: 30px;
  width: 30px;
  margin: 2px 3px 3px 3px;
  display: inline-block;
  vertical-align: middle;
  border-radius: 6px;
}

#foot_frontEnd {
  display: inline-block;
  margin-right: -2px;
  width: 100px;
  border-bottom-right-radius: 0px;
  border-top-right-radius: 0px;
  box-shadow: 0px 2px 2px 0px rgb(0 0 0 / 20%);
  border-right-width: 0px;
}

#foot_backEnd {
  display: inline-block;
  margin-left: -2px;
  width: 100px;
  border-bottom-left-radius: 0px;
  border-top-left-radius: 0px;
  border-left: 1px solid #808080;
}

.footlist {
  display: inline;
  top: 5px;
  height: 80px;
  width: 180px;
  margin: auto;
  float: left;
  margin-top: 10px;
  margin-left: 10px;
  margin-bottom: 10px;
}

#foot_warning {
  border-top: 1px solid #dddddd;
  overflow-x: hidden;
  padding-left: 12px;
}

#foot_warning_text {
  font-size: 12px;
  /* display: inline; */
  /* top: 5px; */
  /* float: left; */
  padding: 10px;
  text-align: center;
}

.foot_unit_button {
  border: 1px solid #808080;
  background-color: rgba(255, 253, 253, 0.6);
  height: 38px;
  width: 178px;
  border-radius: 8px;
  margin: 4px;
  color: gray;
  line-height: 36px;
}

.foot_unit a {
  text-decoration: none;
}

#extra {
  background-color: #dededede;
  margin-top: -2px;
  /* padding: 12px 0px; */
  color: gray;
}

.triangle {
  border-left: 12px solid transparent;
  border-top: 16px solid rgb(255, 255, 255);
  border-bottom: 4px solid transparent;
  border-right: 12px solid transparent;
  display: inline-block;
  vertical-align: middle;
  margin-right: 2px;
}

.el-collapse {
  border: none;
}

.col-1 {
  position: sticky;
  top: 0;
  z-index: 99;
  min-width: 520px;
}

@media (min-width: 992px) {
  .col-1 {
    height: 420px;
  }
}

@media (max-width: 820px) {
  .col-1 {
    top: 0;
  }
}

.main-stages {
  max-width: 700px;
}

#gacha {
  display: flex;
  justify-content: center;
  background-color: var(--c-background-color);
}

.gacha-row {
  max-width: 1300px;
  width: 100%;
}

#totalTable {
  margin-bottom: 0 !important;
}

#gacha_total_chart {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

#gacha_total_table {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  display: inline-block;
  position: relative;
  top: 10px;
  min-width: 150px;
  width: 36%;
}

.el-collapse-item {
  box-shadow: var(--c-box-shadow);
  background-color: var(--c-background-white-transparent);
}

.el-collapse-item__content {
  padding-bottom: 0;
}

.el-input_wrap {
  display: flex;
  margin-top: 12px;
  flex-wrap: wrap;
}

.el-input_text {
  height: 32px;
  line-height: 32px;
  margin-left: 16px;
  margin-right: 12px;
}


</style>

