<script setup>
import {computed, onMounted, reactive, ref} from "vue"
import {convertToSeconds, getSecondsSinceMidnight, secondsToTimeString,} from "/src/utils/dateHanding"
import {Clock, QuestionFilled} from "@element-plus/icons-vue";

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
const zeroEffRemainSeconds = ref(0) //实际剩余总秒数
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
    zeroEffRemainSeconds.value = remainSeconds * nowEfficiency.value //计算零效率下，当前剩余的秒数，考虑额外加成
    zeroEffNeedTime = halfOperatorEfficiency.value * 5 * 60 * 60 //零效率下减半干员需要的秒数
    timeDifference = zeroEffRemainSeconds.value - zeroEffNeedTime //同效率秒差
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

const statusColors = {
  success: 'var(--el-color-success)',
  warning: 'var(--el-color-warning)',
  danger: 'var(--el-color-danger)',
  info: 'var(--el-color-info)'
}

// Format remaining time for display
const formattedRemainingTime = computed(() => {
  if (!zeroEffRemainSeconds.value) return '00:00:00'
  const hours = Math.floor(zeroEffRemainSeconds.value / 3600)
  const minutes = Math.floor((zeroEffRemainSeconds.value % 3600) / 60).toString().padStart(2, '0')
  const seconds = Math.floor(zeroEffRemainSeconds.value % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})
</script>

<template>
  <el-collapse-item name="HalfOperatorCalculate">
    <template #title>
      <div class="title-container">
        <el-icon class="title-icon">
          <Clock/>
        </el-icon>
        <span class="title-text">专精时间减半计算器</span>
      </div>
    </template>

    <div class="calculator-container">
      <!-- Description Card -->
      <div class="description-card">
        <el-alert
            :closable="false"
            :type="state"
            show-icon
        >
          <template #title>
            <span class="description-text">计算换艾丽妮/逻各斯的最佳时间点，恰好触发专精减半效果</span>
          </template>
        </el-alert>
      </div>

      <div class="calculator-content">
        <!-- Left Panel - Inputs -->
        <div class="input-panel">
          <h3 class="panel-title">参数设置</h3>

          <el-form :model="halfOperatorParams" label-position="top">
            <el-form-item label="当前专精剩余时间">
              <el-time-picker
                  v-model="halfOperatorParams.remainder"
                  class="full-width-input"
                  format="HH:mm:ss"
                  placeholder="显示多少填多少"
                  @change="calculateTime"
              />
            </el-form-item>

            <el-form-item label="当前专精助手提供的效率">
              <el-input-number
                  v-model="halfOperatorParams.efficiency"
                  :max="1"
                  :min="0"
                  :precision="2"
                  :step="0.01"
                  :value-on-clear="0"
                  class="full-width-input"
                  controls-position="right"
                  placeholder="小数，例如0.3"
                  @change="calculateTime"
              />
            </el-form-item>

            <el-form-item label="提前提醒（分钟）">
              <el-input-number
                  v-model="halfOperatorParams.leadTime"
                  :min="1"
                  :step="1"
                  class="full-width-input"
                  controls-position="right"
                  @change="calculateTime"
              />
            </el-form-item>

            <div class="switch-settings">
              <el-form-item label="控制中枢入驻阿斯卡纶/烛煌">
                <el-switch
                    v-model="halfOperatorParams.hasAscalon"
                    active-color="#13ce66"
                    @change="calculateTime"
                />
              </el-form-item>

              <el-form-item label="减半干员有职业加成效果">
                <el-switch
                    v-model="halfOperatorParams.isFit"
                    active-color="#13ce66"
                    @change="calculateTime"
                />
              </el-form-item>
            </div>

            <el-form-item v-if="halfOperatorParams.isFit" label="减半干员训练速度加成数值">
              <el-tooltip
                  content="示例数据：艾丽妮-30% 覆盖近卫/狙击职业；逻各斯-30% 覆盖术师/辅助职业"
                  effect="light"
                  placement="top"
              >
                <el-input-number
                    v-model="halfOperatorParams.halfOperatorAddition"
                    :min="0"
                    :step="0.01"
                    :value-on-clear="0"
                    class="full-width-input"
                    controls-position="right"
                    @change="calculateTime"
                />
              </el-tooltip>
            </el-form-item>
          </el-form>
        </div>

        <!-- Right Panel - Results -->
        <div class="result-panel">
          <h3 class="panel-title">计算结果</h3>

          <div class="result-card">
            <div class="efficiency-display">
              <div class="efficiency-item">
                <div class="efficiency-label">当前总效率</div>
                <div class="efficiency-value">{{ ((nowEfficiency - 1) * 100).toFixed(0) }}%</div>
              </div>
              <div class="efficiency-item">
                <div class="efficiency-label">减半干员效率</div>
                <div class="efficiency-value">{{ ((halfOperatorEfficiency - 1) * 100).toFixed(0) }}%</div>
              </div>
            </div>

            <div v-if="zeroEffRemainSeconds" class="remaining-time">
              <div class="time-label">实际剩余专精时间</div>
              <div class="time-value">{{ formattedRemainingTime }}</div>
            </div>

            <div :style="{ color: statusColors[state] }" class="result-message">
              <span>{{ remindText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with links -->
      <div class="calculator-footer">
        <el-button plain size="small" type="primary" @click="usageGuideVisible = true">
          <el-icon>
            <QuestionFilled/>
          </el-icon>
          <span>使用指南</span>
        </el-button>
        <el-button plain size="small" type="primary" @click="algorithmVisible = true">
          <span>算法详情</span>
        </el-button>
      </div>
    </div>

    <!-- Algorithm Drawer -->
    <el-drawer
        v-model="algorithmVisible"
        direction="rtl"
        size="70%"
        title="换专精减半干员的专精时间点算法"
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
        <el-text class="tip-text" size="small" tag="sub">感谢网友"一般路过魔界人"的提醒(・∀・)</el-text>
      </div>
    </el-drawer>

    <!-- Usage Guide Drawer -->
    <el-drawer
        v-model="usageGuideVisible"
        direction="rtl"
        size="70%"
        title="使用指南"
    >
      <div class="usage-guide">
        <el-timeline>
          <el-timeline-item type="primary">
            <h4>查看专精剩余时间</h4>
            <p>点击查看并记录专精剩余时间，填入"当前显示的专精剩余时间"栏中，如04:50:28</p>
          </el-timeline-item>

          <el-timeline-item type="primary">
            <h4>输入干员效率</h4>
            <p>以小数形式将先手干员的专精效率填入"当前专精助手提供的效率"栏中，如0.6</p>
          </el-timeline-item>

          <el-timeline-item type="primary">
            <h4>设置职业效率加成</h4>
            <p>
              根据专精干员职业情况，选择是否启用"减半干员有职业加成效果"，如艾丽妮对近卫、狙击职业有0.3加成，逻各斯对术士、辅助职业有0.3加成</p>
          </el-timeline-item>

          <el-timeline-item type="primary">
            <h4>控制中枢设置</h4>
            <p>
              若控制中枢入驻了阿斯卡纶/烛煌，则启用对应开关。这会将额外效率补充至先手干员和减半干员的效率中，如0.6→0.65，0.3→0.35</p>
          </el-timeline-item>

          <el-timeline-item type="primary">
            <h4>设置提醒时间</h4>
            <p>提前提醒（分钟）默认为5分钟，对应结果文本"可以制定XX:XX:XX时间点的闹钟"</p>
          </el-timeline-item>

          <el-timeline-item type="success">
            <h4>查看计算结果</h4>
            <p>
              填写完成即可自动计算输出结果，提示需要替换减半干员（艾丽妮/逻各斯）的时间点，或者提示期望余裕时间不足，亦或者已无法触发减半效果</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>
  </el-collapse-item>
</template>

<style lang="scss" scoped>
.title-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  color: var(--el-color-primary);
}

.title-text {
  font-weight: 600;
  font-size: 16px;
}

.calculator-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  border-radius: 8px;
  background-color: var(--el-bg-color);
}

.description-card {
  margin-bottom: 10px;
}

.description-text {
  font-size: 14px;
}

.calculator-content {
  display: flex;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.input-panel, .result-panel {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.panel-title {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 10px;
}

.full-width-input {
  width: 100%;
}

.switch-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.result-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.efficiency-display {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-bottom: 10px;
}

.efficiency-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--el-color-primary-light-9);
  padding: 12px;
  border-radius: 8px;
  width: calc(50% - 10px);
}

.efficiency-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.efficiency-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.remaining-time {
  background-color: var(--el-fill-color);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.time-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.time-value {
  font-family: monospace;
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.result-message {
  padding: 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}

.calculator-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
}

.algorithm-content {
  font-family: Arial, sans-serif;
  line-height: 25px;
  position: relative;
}

.code-block {
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  padding: 16px;
  border-radius: 8px;
  font-family: monospace;
  overflow-x: auto;
}

.tip-text {
  position: absolute;
  bottom: -15px;
  right: 0;
  font-style: italic;
  color: var(--el-text-color-secondary);
  opacity: 0.6;
  user-select: none;
}

.usage-guide {
  padding: 20px;
}

/* Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
