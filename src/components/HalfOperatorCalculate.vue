<script setup>
import {reactive, ref, onMounted} from "vue"
import {convertToSeconds, secondsToTimeString, getSecondsSinceMidnight} from "/src/utils/dataHanding"
import {Clock,QuestionFilled} from "@element-plus/icons-vue";

let drawerVisible = ref(false)

// 换减半干员专精
const halfOperatorParams = reactive({
  efficiency: null, //当前专精助手干员提供的效率
  isFit: false, //是否享受职业专精效率加成
  halfOperatorAddition: 0.3, //减半干员专精效率加成
  remainder: null, //当前显示的剩余时间
  leadTime: 5, //默认提前五分钟提醒
  textShowType: null //提醒文字展示类型
})
let state = ref("info") /*倒计时提醒状态标签*/
let remainSeconds //当前显示剩余的总秒数
let zeroEffRemainSeconds //实际剩余总秒数
let zeroEffNeedTime //零效率下，减半干员的减半效果触发所需秒数
let halfOperatorEfficiency //减半干员的实际效率
let timeDifference //极限触发时差，当前显示剩余时间等价秒数 和 到换减半干员专精时间点时显示时间等价秒数 的差
let ampleTime //余裕时间
let remindTime //提醒时间字符串
let remindText = ref('') //提醒文本

onMounted(() => {
  calculateTime() //先触发一次
})

function calculateTime() {
  if (halfOperatorParams.efficiency != null && halfOperatorParams.remainder != null) {
    remainSeconds = convertToSeconds(halfOperatorParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * (1 + halfOperatorParams.efficiency + 0.05) //计算零效率下，当前剩余的秒数，考虑到训练室自带的5%加成
    //判断减半干员的效率
    halfOperatorEfficiency = halfOperatorParams.isFit ? 1 + halfOperatorParams.halfOperatorAddition + 0.05 : 1 + 0.05;
    zeroEffNeedTime = halfOperatorEfficiency * 5 * 60 * 60 //零效率下减半干员需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= (1 + halfOperatorParams.efficiency + 0.05) //补上已有的效率加成条件
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

</script>

<template>
  <el-collapse-item name="HalfOperatorCalculate">
    <template #title>
      <Clock style="width: 13px;margin-inline: 8px"/>
      <el-text tag="b" size="large">换专精时间减半干员的专精时间点计算</el-text>
    </template>
    <el-form :model="halfOperatorParams">
      <transition-group name="list" tag="ul">
        <li>
          <el-form-item label="已入驻的专精助手效率">
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
        <li>
          <el-form-item label="是否可触发职业效率加成">
            <el-switch
                v-model="halfOperatorParams.isFit"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li v-if="halfOperatorParams.isFit" style="display: inline-block">
          <el-tooltip
              effect="light"
              content="艾丽妮-30% 覆盖近卫/狙击职业；逻各斯-30% 覆盖术师/辅助职业"
              placement="right"
          >
            <el-form-item label="减半干员职业效率加成">
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
        <li>
          <el-form-item label="专精剩余时间">
            <el-time-picker
                v-model="halfOperatorParams.remainder"
                format="HH:mm:ss"
                placeholder="点此选择"
                @change="calculateTime"
            />
          </el-form-item>
        </li>
        <li>
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
        <li>
          <el-text :type="state">{{ remindText }}</el-text>
        </li>
        <li>
          <el-link type="primary" :underline="false" style="float: right; color: blue;margin-right: 10px"
                   @click="drawerVisible = true">算法标注
          </el-link>
        </li>
      </transition-group>
    </el-form>
    <el-drawer
        title="换专精减半干员的专精时间点算法"
        v-model="drawerVisible"
        direction="rtl"
        size="70%"
    >
      <div class="algorithm-content">
        <h2>算法中用到的各个变量</h2>
        <ul>
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
  if (halfOperatorParams.efficiency != null && halfOperatorParams.remainder != null) {
    remainSeconds = convertToSeconds(halfOperatorParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * (1 + halfOperatorParams.efficiency + 0.05) //计算零效率下，当前剩余的秒数，考虑到训练室自带的5%加成
    //判断减半干员的效率
    halfOperatorEfficiency = halfOperatorParams.isFit ? 1 + halfOperatorParams.halfOperatorAddition + 0.05 : 1 + 0.05;
    zeroEffNeedTime = halfOperatorEfficiency * 5 * 60 * 60 //零效率下减半干员需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= (1 + halfOperatorParams.efficiency + 0.05) //补上已有的效率加成条件
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
  </el-collapse-item>
</template>

<style scoped lang="scss">
.algorithm-content {
  font-family: Arial, sans-serif;
  line-height: 25px;
  position: relative;
}

.code-block {
  background-color: var(--c-background-color);
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
}

ul{
  padding-left: 1vw;
}

li {
  list-style: none;
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