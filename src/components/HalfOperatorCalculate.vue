<script setup>
import {reactive, ref, onMounted} from "vue"
import {
  convertToSeconds,
  secondsToTimeString,
  getSecondsSinceMidnight,
} from "/src/utils/DataHanding"
import {Clock} from "@element-plus/icons-vue";

const algorithmVisible = ref(false) //算法标识
const usageGuideVisible = ref(false) //使用指南

// 换减半干员专精
const halfOperatorParams = reactive({
  efficiency: null, //当前专精助手干员提供的效率
  isFit: false, //是否享受职业专精效率加成
  halfOperatorAddition: 0.3, //减半干员专精效率加成
  hasAscalon: false, //控制中枢入驻阿斯卡纶
  remainder: null, //当前显示的剩余时间
  leadTime: 5, //默认提前五分钟提醒
  textShowType: null //提醒文字展示类型
})
let nowEfficiency = ref(0) //当前效率
let extraEfficiency = 0 //额外效率
let state = ref("info") /*倒计时提醒状态标签*/
let remainSeconds //当前显示剩余的总秒数
let zeroEffRemainSeconds //实际剩余总秒数
let zeroEffNeedTime //零效率下，减半干员的减半效果触发所需秒数
let halfOperatorEfficiency = ref(0) //减半干员的实际效率
let timeDifference //极限触发时差，当前显示剩余时间等价秒数 和 到换减半干员专精时间点时显示时间等价秒数 的差
let ampleTime //余裕时间
let remindTime //提醒时间字符串
let remindText = ref('') //提醒文本

onMounted(() => {
  calculateTime() //先触发一次
})

function calculateTime() {
  //额外效率，已包含训练室基础效率、阿斯卡纶中枢效率
  extraEfficiency = 0.05 + (halfOperatorParams.hasAscalon ? 0.05 : 0)
  //当前效率
  nowEfficiency.value = 1 + halfOperatorParams.efficiency + extraEfficiency
  //减半干员效率
  halfOperatorEfficiency.value = halfOperatorParams.isFit ? 1 + halfOperatorParams.halfOperatorAddition + extraEfficiency : 1 + extraEfficiency;
  if (halfOperatorParams.efficiency != null && halfOperatorParams.remainder != null) {
    remainSeconds = convertToSeconds(halfOperatorParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * nowEfficiency.value //计算零效率下，当前剩余的秒数，考虑额外加成
    zeroEffNeedTime = halfOperatorEfficiency.value * 5 * 60 * 60 //零效率下减半干员需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= nowEfficiency.value //补上已有的效率加成条件
    ampleTime = timeDifference - halfOperatorParams.leadTime * 60 //计算余裕时间秒数
    if (ampleTime > 0) {
      //早于余裕时间点
      state.value = "success" //还有余裕时间，正常定闹钟
      //有可能需要定隔天的闹钟
      remindTime = secondsToTimeString(getSecondsSinceMidnight() + ampleTime > 86400 ?
          Math.floor(getSecondsSinceMidnight() + ampleTime - 86400) :
          Math.floor(getSecondsSinceMidnight() + ampleTime))
      remindText.value = `减半干员的专精减半效果将在${Math.floor(timeDifference / 60)}分钟后迎来临界触发点，可以制定${remindTime}时间点的闹钟(〃'▽'〃)`
    } else if (timeDifference > 0) {
      //已晚于余裕时间点，但早于极限触发时间点
      state.value = "warning" //余裕时差不足，需要立即换减半干员，临近极限触发点了
      remindText.value = "立，刻，换，减，半，干，员！！！(╬◣д◢)"
    } else {
      //已晚于极限触发时间点
      state.value = "danger" //已无法触发减半干员减半
      remindText.value = "已经...已经触发不了了...o(╥﹏╥)o"
    }
  } else {
    state.value = "info"
    remindText.value = "得先输入数据才会有结果哦(￣▽￣)"
  }
}

//使用指南作者彩蛋
function revealAuthor(){
  window.open('https://space.bilibili.com/22606843?spm_id_from=333.337.0.0', '_blank');
}

</script>

<template>
  <el-collapse-item name="HalfOperatorCalculate">
    <template #title>
      <Clock style="width: 13px;margin-inline: 8px"/>
      <el-text tag="b" size="large">换专精时间减半干员的专精时间点计算</el-text>
    </template>
    <el-form :model="halfOperatorParams">
      <transition-group name="list" tag="ul">
        <li :key="1">
          <el-form-item label="当前已入驻的专精助手干员提供的效率">
            <el-input-number
                v-model="halfOperatorParams.efficiency"
                :min="0"
                :max="10"
                :precision="2"
                :step="0.01"
                :value-on-clear="0"
                controls-position="right"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li :key="2">
          <el-form-item label="阿斯卡纶是否入驻控制中枢">
            <el-switch
                v-model="halfOperatorParams.hasAscalon"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li :key="3">
          <el-form-item label="减半干员是否可对专精干员触发职业效率加成">
            <el-switch
                v-model="halfOperatorParams.isFit"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li :key="4" v-if="halfOperatorParams.isFit" style="display: inline-block">
          <el-tooltip
              effect="light"
              content="示例数据：艾丽妮-30% 覆盖近卫/狙击职业；逻各斯-30% 覆盖术师/辅助职业"
              placement="right"
          >
            <el-form-item label="减半干员提供的职业效率加成">
              <el-input-number
                  v-model="halfOperatorParams.halfOperatorAddition"
                  :min="0"
                  :step="0.01"
                  :value-on-clear="0"
                  controls-position="right"
                  @change="calculateTime"
              />
            </el-form-item>
          </el-tooltip>
        </li>
        <li :key="5">
          <el-form-item label="当前显示的专精剩余时间">
            <el-time-picker
                v-model="halfOperatorParams.remainder"
                format="HH:mm:ss"
                placeholder="点此选择"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li :key="6">
          <el-form-item label="提前提醒（分钟）">
            <el-input-number
                v-model="halfOperatorParams.leadTime"
                :min="1"
                :step="1"
                controls-position="right"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li :key="7">
          <el-text :type="state">{{ remindText }}</el-text>
        </li>
        <li :key="8">
          <el-link type="primary" :underline="false" style="float: right; color: blue;margin-right: 10px"
                   @click="algorithmVisible = true">算法标注
          </el-link>
          <el-link type="primary" :underline="false" style="float: right; color: blue;margin-right: 10px"
                   @click="usageGuideVisible = true">使用指南
          </el-link>
        </li>
      </transition-group>
    </el-form>
    <el-drawer
        title="换专精减半干员的专精时间点算法"
        v-model="algorithmVisible"
        direction="rtl"
        size="70%"
    >
      <div class="algorithm-content">
        <h2>算法中用到的各个变量</h2>
        <ul>
          <li><b>extraEfficiency</b>: 训练时附带的额外效率，包含训练室基础效率和非入驻训练室干员提供的效率。</li>
          <li><b>nowEfficiency</b>: 未换减半干员之前具有的总效率。</li>
          <li><b>halfOperatorEfficiency</b>: 换减半干员之后具有的总效率。</li>
          <li><b>efficiency</b>: 当前专精助手干员提供的效率。</li>
          <li><b>isFit</b>: 目标是否享受职业专精效率加成。</li>
          <li><b>remainder</b>: 当前显示的剩余时间。</li>
          <li><b>leadTime</b>: 提前提醒的分钟数，默认提前五分钟提醒。</li>
          <li><b>remainSeconds</b>: 当前显示的剩余时间的等价秒数。</li>
          <li><b>zeroEffRemainSeconds</b>: 零效率下剩余的秒数。</li>
          <li><b>halfOperatorEfficiency</b>: 减半干员提供的实际效率。</li>
          <li><b>zeroEffNeedTime</b>: 零效率下，满足减半干员的专精时间减半效果的触发条件所需的秒数。</li>
          <li><b>timeDifference</b>: 极限触发时差。</li>
          <li><b>ampleTime</b>: 算上提前定闹钟的余裕时间。</li>
        </ul>
        <h2>运算逻辑</h2>
        <ol>
          <li>检查当前专精助手干员的效率（efficiency）和当前显示剩余时间（remainder）是否已输入。</li>
          <li>将剩余时间（remainder）转换为总秒数（remainSeconds）。</li>
          <li>计算零效率下剩余的秒数（zeroEffRemainSeconds）。</li>
          <li>确定减半干员的效率（halfOperatorEfficiency）。</li>
          <li>计算零效率下减半干员的专精时间减半效果触发所需的秒数（zeroEffNeedTime）。</li>
          <li>根据zeroEffRemainSeconds和zeroEffNeedTime计算极限触发时差（timeDifference）。</li>
          <li>根据提前提醒的分钟数（leadTime）计算实际余裕时间（ampleTime）。</li>
          <li>确定提醒状态（state）和提醒文本。</li>
          <li>若有余裕时间，设置提醒时间字符串（remindTime）。</li>
        </ol>

        <h2>算法代码</h2>
        <pre class="code-block">
function calculateTime() {
  //额外效率，已包含训练室基础效率、阿斯卡纶中枢效率
  extraEfficiency = 0.05 + (halfOperatorParams.hasAscalon ? 0.05 : 0)
  //当前效率
  nowEfficiency.value = 1 + halfOperatorParams.efficiency + extraEfficiency
  //减半干员效率
  halfOperatorEfficiency.value = halfOperatorParams.isFit ? 1 + halfOperatorParams.halfOperatorAddition + extraEfficiency : 1 + extraEfficiency;
  if (halfOperatorParams.efficiency != null && halfOperatorParams.remainder != null) {
    remainSeconds = convertToSeconds(halfOperatorParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * nowEfficiency.value //计算零效率下，当前剩余的秒数，考虑额外加成
    zeroEffNeedTime = halfOperatorEfficiency.value * 5 * 60 * 60 //零效率下减半干员需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= nowEfficiency.value //补上已有的效率加成条件
    ampleTime = timeDifference - halfOperatorParams.leadTime * 60 //计算余裕时间秒数
    if (ampleTime > 0) {
      //早于余裕时间点
      state.value = "success" //还有余裕时间，正常定闹钟
      //有可能需要定隔天的闹钟
      remindTime = secondsToTimeString(getSecondsSinceMidnight() + ampleTime > 86400 ?
          Math.floor(getSecondsSinceMidnight() + ampleTime - 86400) :
          Math.floor(getSecondsSinceMidnight() + ampleTime))
    } else if (timeDifference > 0) {
      //已晚于余裕时间点，但早于极限触发时间点
      state.value = "warning" //余裕时差不足，需要立即换减半干员，临近极限触发点了
    } else {
      //已晚于极限触发时间点
      state.value = "danger" //已无法触发减半干员减半
    }
  }
}
    </pre>
        <el-text tag="sub" size="small" class="tip-text">感谢网友“一般路过魔界人”的提醒(・∀・)</el-text>
      </div>
    </el-drawer>
    <el-drawer
        title="使用指南"
        v-model="usageGuideVisible"
        direction="rtl"
        size="70%"
    >
      <div style="position: relative">
        <img style="width: 100%;" src="/image/specialization/introduce.png"/>
        <ol style="font-size:medium">
          <li>
            点击查看并记录专精剩余时间，填入“当前显示的专精剩余时间”栏中，如04:50:28
          </li>
          <li>
            以小数形式将先手干员的专精效率填入“当前已入驻的专精助手干员提供的效率”栏中，如0.6
          </li>
          <li>
            根据专精干员职业情况，选择是否启用“减半干员是否可对专精干员触发职业效率加成”，如艾丽妮对近卫、狙击职业有0.3加成，逻各斯对术士、辅助职业有0.3加成
          </li>
          <li>
            <el-tooltip
                effect="light"
                content="若有阿斯卡纶等训练室外提供额外专精效率的干员，则额外效率补充至先手干员和减半干员的效率中，如0.6→0.65，0.3→0.35"
                placement="top"
            >
              若控制中枢入驻了阿斯卡纶，则启用“阿斯卡纶是否入驻控制中枢”
            </el-tooltip>
          </li>
          <li>
            提前提醒（分钟）默认为5分钟，对应结果文本“可以制定XX:XX:XX时间点的闹钟”
          </li>
          <li>
            填写完成即可自动计算输出结果，提示需要替换减半干员（艾丽妮/逻各斯）的时间点，或者提示期望余裕时间不足，亦或者已无法触发减半效果
          </li>
        </ol>
        <el-text tag="sub" size="small" class="easterEgg-text" @click="revealAuthor">
          本文档由一位不愿透露名称的热心网友提供(⁎˃ᴗ˂⁎)
        </el-text>
      </div>
    </el-drawer>
  </el-collapse-item>
</template>

<style scoped lang="scss">
.algorithm-content {
  font-family: Arial, sans-serif;
  line-height: 25px;
  position: relative;
}

.code-block {
  background-color: var(--c-page-background-color);
  color: var(--c-text-color);
  padding: 10px;
  border-radius: 5px;
}

.tip-text {
  position: absolute;
  bottom: -15px;
  right: 0;
  font-style: italic;
  color: lightgray;
  user-select: none;
}

.easterEgg-text {
  position: absolute;
  bottom: -25px;
  right: 0;
  font-style: italic;
  color: lightgray;
  user-select: none;
}

ul {
  padding-left: 1vw;

  li {
    list-style: none;
  }
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>