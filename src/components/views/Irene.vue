<script setup>
import {reactive, ref, onMounted} from "vue"
import {convertToSeconds, secondsToTimeString, getSecondsSinceMidnight} from "@/utils/dataHanding"
import {Clock} from "@element-plus/icons-vue";

let drawerVisible = ref(false)

// 换艾丽妮专精
const ireneParams = reactive({
  efficiency: null, //当前专精助手干员提供的效率
  isFit: false, //是否是 近卫/狙击 干员
  remainder: null, //当前显示的剩余时间
  leadTime: 5, //默认提前五分钟提醒
  textShowType: null //提醒文字展示类型
})
let state = ref("info") /*倒计时提醒状态标签*/
let remainSeconds //当前显示剩余的总秒数
let zeroEffRemainSeconds //实际剩余总秒数
let zeroEffNeedTime //零效率下，艾丽妮减半触发所需秒数
let ireneEfficiency //艾丽妮的实际效率
let timeDifference //极限触发时差，当前显示剩余时间等价秒数 和 到换艾丽妮专精时间点时显示时间等价秒数 的差
let ampleTime //余裕时间
let remindTime //提醒时间字符串
let remindText = ref('') //提醒文本

onMounted(() => {
  calculateTime() //先触发一次
})

function calculateTime() {
  if (ireneParams.efficiency != null && ireneParams.remainder != null) {
    remainSeconds = convertToSeconds(ireneParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * (1 + ireneParams.efficiency + 0.05) //计算零效率下，当前剩余的秒数，考虑到训练室自带的5%加成
    //判断艾丽妮的效率
    ireneEfficiency = ireneParams.isFit ? 1 + 0.3 + 0.05 : 1 + 0.05;
    zeroEffNeedTime = ireneEfficiency * 5 * 60 * 60 //零效率下艾丽妮需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= (1 + ireneParams.efficiency + 0.05) //补上已有的效率加成条件
    ampleTime = timeDifference - ireneParams.leadTime * 60 //计算余裕时间秒数
    if (ampleTime > 0) {
      //早于余裕时间点
      state.value = "success" //还有余裕时间，正常定闹钟
      //有可能需要定隔天的闹钟
      remindTime = secondsToTimeString(getSecondsSinceMidnight() + ampleTime > 86400 ?
          Math.floor(getSecondsSinceMidnight() + ampleTime - 86400) :
          Math.floor(getSecondsSinceMidnight() + ampleTime))
      remindText.value = `艾丽妮专精减半效果将在${Math.floor(timeDifference / 60)}分钟后迎来临界触发点，可以制定${remindTime}时间点的闹钟(〃'▽'〃)`
    } else if (timeDifference > 0) {
      //已晚于余裕时间点，但早于极限触发时间点
      state.value = "warning" //余裕时差不足，需要立即换艾丽妮，临近极限触发点了
      remindText.value = "立，刻，换，艾，丽，妮！！！(╬◣д◢)"
    } else {
      //已晚于极限触发时间点
      state.value = "danger" //已无法触发艾丽妮减半
      remindText.value = "已经...已经触发不了了...o(╥﹏╥)o"
    }
  } else {
    state.value = "info"
    remindText.value = "得先输入数据才会有结果哦(￣▽￣)"
  }
}

</script>

<template>
  <el-collapse-item name="1">
    <template #title>
      <Clock style="width: 13px;margin-inline: 8px"/>
      <el-text tag="b" size="large">换艾丽妮专精时间点计算</el-text>
    </template>
    <el-form :model="ireneParams">
      <el-row justify="space-evenly">
        <el-col :lg="6" :sm="11" :xs="23">
          <el-form-item label="已入驻的专精助手效率">
            <el-input-number
                v-model="ireneParams.efficiency"
                :min="0"
                :max="10"
                :precision="2"
                :step="0.01"
                :value-on-clear="0"
                controls-position="right"
                @change="calculateTime"
            />
          </el-form-item>
        </el-col>
        <el-col :lg="4" :sm="11" :xs="23">
          <el-form-item label="是否为 近卫/狙击 干员">
            <el-switch
                v-model="ireneParams.isFit"
                @change="calculateTime"
            />
          </el-form-item>
        </el-col>
        <el-col :lg="6" :sm="11" :xs="23">
          <el-form-item label="专精剩余时间">
            <el-time-picker
                v-model="ireneParams.remainder"
                format="HH:mm:ss"
                placeholder="点此选择"
                @change="calculateTime"
            />
          </el-form-item>
        </el-col>
        <el-col :lg="6" :sm="11" :xs="23">
          <el-form-item label="提前提醒（分钟）">
            <el-input-number
                v-model="ireneParams.leadTime"
                :min="1"
                :step="1"
                controls-position="right"
                @change="calculateTime"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row justify="space-evenly">
        <el-col :span="23">
          <el-text :type="state">{{ remindText }}</el-text>
        </el-col>
      </el-row>
    </el-form>
    <el-link type="primary" :underline="false" style="float: right; color: blue;margin-right: 10px"
             @click="drawerVisible = true">算法标注
    </el-link>
    <el-drawer
        title="换艾丽妮专精时间点算法"
        v-model="drawerVisible"
        direction="rtl"
        size="70%"
    >
      <div class="algorithm-content">
        <h2>算法中用到的各个变量</h2>
        <ul>
          <li><b>efficiency</b>: 当前专精助手干员提供的效率。</li>
          <li><b>isFit</b>: 目标是否为 近卫/狙击 干员。</li>
          <li><b>remainder</b>: 当前显示的剩余时间。</li>
          <li><b>leadTime</b>: 提前提醒的分钟数，默认提前五分钟提醒。</li>
          <li><b>remainSeconds</b>: 当前显示的剩余时间的等价秒数。</li>
          <li><b>zeroEffRemainSeconds</b>: 零效率下剩余的秒数。</li>
          <li><b>ireneEfficiency</b>: 艾丽妮提供的实际效率。</li>
          <li><b>zeroEffNeedTime</b>: 零效率下满足艾丽妮专精时间减半效果的触发条件所需的秒数。</li>
          <li><b>timeDifference</b>: 极限触发时差。</li>
          <li><b>ampleTime</b>: 算上提前定闹钟的余裕时间。</li>
        </ul>
        <h2>运算逻辑</h2>
        <ol>
          <li>检查当前专精助手干员的效率（efficiency）和当前显示剩余时间（remainder）是否已输入。</li>
          <li>将剩余时间（remainder）转换为总秒数（remainSeconds）。</li>
          <li>计算零效率下剩余的秒数（zeroEffRemainSeconds）。</li>
          <li>确定艾丽妮的效率（ireneEfficiency）。</li>
          <li>计算零效率下艾丽妮专精时间减半效果触发所需的秒数（zeroEffNeedTime）。</li>
          <li>根据zeroEffRemainSeconds和zeroEffNeedTime计算极限触发时差（timeDifference）。</li>
          <li>根据提前提醒的分钟数（leadTime）计算实际余裕时间（ampleTime）。</li>
          <li>确定提醒状态（state）和提醒文本。</li>
          <li>若有余裕时间，设置提醒时间字符串（remindTime）。</li>
        </ol>

        <h2>算法代码</h2>
        <pre class="code-block">
function calculateTime() {
  if (ireneParams.efficiency != null && ireneParams.remainder != null) {
    remainSeconds = convertToSeconds(ireneParams.remainder) //获取当前显示剩余时间的总秒数
    zeroEffRemainSeconds = remainSeconds * (1 + ireneParams.efficiency + 0.05) //计算零效率下，当前剩余的秒数，考虑到训练室自带的5%加成
    //判断艾丽妮的效率
    ireneEfficiency = ireneParams.isFit ? 1 + 0.3 + 0.05 : 1 + 0.05;
    zeroEffNeedTime = ireneEfficiency * 5 * 60 * 60 //零效率下艾丽妮需要的秒数
    timeDifference = zeroEffRemainSeconds - zeroEffNeedTime //同效率秒差
    timeDifference /= (1 + ireneParams.efficiency + 0.05) //补上已有的效率加成条件
    ampleTime = timeDifference - ireneParams.leadTime * 60 //计算余裕时间秒数
    if (ampleTime > 0) {
      //早于余裕时间点
      state.value = "success" //还有余裕时间，正常定闹钟
      //有可能需要定隔天的闹钟
      remindTime = secondsToTimeString(getSecondsSinceMidnight() + ampleTime > 86400 ?
          Math.floor(getSecondsSinceMidnight() + ampleTime - 86400) :
          Math.floor(getSecondsSinceMidnight() + ampleTime))
    } else if (timeDifference > 0) {
      //已晚于余裕时间点，但早于极限触发时间点
      state.value = "warning" //余裕时差不足，需要立即换艾丽妮，临近极限触发点了
    } else {
      //已晚于极限触发时间点
      state.value = "danger" //已无法触发艾丽妮减半
    }
  }
}
    </pre>
        <el-text tag="sub" size="small" class="tip-text">感谢网友“一般路过魔界人”的提醒(・∀・)</el-text>
      </div>
    </el-drawer>
  </el-collapse-item>
</template>

<style scoped>
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
</style>