<script setup>
import {reactive, ref, onMounted} from "vue"
import {convertToSeconds, secondsToTimeString, getSecondsSinceMidnight} from "@/utils/dataHanding"
import {Clock} from "@element-plus/icons-vue";

let activeNames = ref(1)

// 换艾丽妮专精
const ireneParams = reactive({
  efficiency: null,
  isFit: false,
  remainder: null,
  leadTime: 5, //默认提前五分钟提醒
  textShowType: null //提醒文字展示类型
})
let state = ref("info") /*倒计时提醒状态标签*/
let remainSeconds //剩余总秒数
let needTime //艾丽妮减半触发理论所需秒数
let moment //到换艾丽妮专精时间点时显示时间的等价秒数 moment * (1 + ireneParams.efficiency) = needTime
let timeDifference //死线时差，当前显示剩余时间等价秒数 和 到换艾丽妮专精时间点时显示时间等价秒数 的差
let ampleTime //余裕时间
let remindTime //提醒时间字符串
let remindText = ref('') //提醒文本

onMounted(() => {
  calculateTime() //先触发一次
})

function calculateTime() {
  if (ireneParams.efficiency != null && ireneParams.remainder != null) {
    remainSeconds = convertToSeconds(ireneParams.remainder) //获取当前显示剩余时间的总秒数
    if (ireneParams.isFit)
      needTime = (1 + 0.05) * 5 * 60 * 60 //训练室自带的5%效率加成
    else
      needTime = (1 + 0.3 + 0.05) * 5 * 60 * 60 //艾丽妮自身的专精效率加成，外加训练室自带的5%效率加成
    moment = needTime / (1 + ireneParams.efficiency) //应当换艾丽妮时的秒数
    timeDifference = remainSeconds - moment //计算死线时间差
    ampleTime = timeDifference - ireneParams.leadTime * 60 //计算余裕时间
    if (ampleTime > 0) {
      state.value = "success" //还有余裕时间，正常定闹钟
      //有可能需要定隔天的闹钟
      remindTime = secondsToTimeString(getSecondsSinceMidnight() + ampleTime > 86400 ?
          Math.floor(getSecondsSinceMidnight() + ampleTime - 86400) :
          Math.floor(getSecondsSinceMidnight() + ampleTime))
      remindText.value = `艾丽妮专精减半效果将在${Math.floor(timeDifference / 60)}分钟后迎来临界触发点，可以制定${remindTime}时间点的闹钟(〃'▽'〃)`
    } else if (timeDifference > 0) {
      //余裕时间已经截止，但死线还未到来
      state.value = "warning" //余裕时差不足，需要立即换艾丽妮，临近ddl了
      remindText.value = "立，刻，换，艾，丽，妮！！！(╬◣д◢)"
    } else {
      //已无法满足艾丽妮专精时间减半条件
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
  <el-collapse v-model="activeNames" accordion>
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
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
</style>