<script setup>
import {onMounted, ref} from "vue";

function getId() {
  const chars = '01234567890qwertyuiopasdfghjklzxcvbnm'.split('')
  let text = ''
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * chars.length);
    text += chars[index]
  }
  return text
}

let minuteAndSecondOptions = []
let hourOptions = []
for (let i = 0; i < 60; i++) {
  i = i.toString().padStart(2, "0")
  minuteAndSecondOptions.push(i)
  if (i > 23) {
    continue
  }
  hourOptions.push(i)
}


const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

function getTime(date) {
  const hour = date.getHours().toString().padStart(2, "0")
  const minute = date.getMinutes().toString().padStart(2, "0")
  const second = date.getSeconds().toString().padStart(2, "0")
  return `${hour}:${minute}:${second}`
}

let startOrEnd = ref(1)
let selectedTimeType = ref('hour')
let selectedOption = ref({hour: 12, minute: 0, second: 0})

function chooseStartOrEnd(value) {
  startOrEnd.value = value
}

function chooseTimeType(value) {
  selectedTimeType.value = value
}

function chooseOption(value) {
  selectedOption.value[selectedTimeType.value] = value
  if (selectedTimeType.value === 'hour') {
    props.modelValue[startOrEnd.value].setHours(value)
  } else if (selectedTimeType.value === 'minute') {
    props.modelValue[startOrEnd.value].setMinutes(value)
  } else if (selectedTimeType.value === 'second') {
    props.modelValue[startOrEnd.value].setSeconds(value)
  }
}


let popupClass = ref('')

function openPopup() {
  popupClass.value = 'c-time-checkbox-popup-display'
}

function closePopup() {
  popupClass.value = ''
}

function getTimeTextClass(value) {
  return startOrEnd.value===value?'c-time-checkbox-selected':''
}

function getTimeTypeClass(value) {
  if (value === selectedTimeType.value) {
    return 'c-time-checkbox-selected'
  }
  return ''
}

function getOptionClass(value) {
  if (value === selectedOption.value[selectedTimeType.value]) {
    return 'c-time-checkbox-selected'
  }
  return ''
}

</script>

<template>
  <div class="c-time-checkbox">
    <i class="iconfont icon-time" style="padding: 8px"></i>
    <span @click="chooseStartOrEnd(0);openPopup()"
           :class="getTimeTextClass(0)">{{ getTime(modelValue[0]) }}</span>
    <span>至</span>
    <span @click="chooseStartOrEnd(1);openPopup()"
          :class="getTimeTextClass(1)">{{ getTime(modelValue[1]) }}</span>

    <div class="c-time-checkbox-popup" :class="popupClass">
      <div class="c-time-checkbox-type">
        <div style="width: 30px" class="c-time-checkbox-selected">
          {{ startOrEnd === 1 ? 'end' : 'start' }}
        </div>
        <div :class="getTimeTypeClass('hour')"
             @click="chooseTimeType('hour')">时
        </div>
        <div :class="getTimeTypeClass('minute')"
             @click="chooseTimeType('minute')">分
        </div>
        <div :class="getTimeTypeClass('second')"
             @click="chooseTimeType('second')">秒
        </div>
        <div style="width: 30px;height: 2px"></div>
      </div>
      <div class="c-time-checkbox-options" v-show="selectedTimeType === 'hour'">
        <div v-for="(option,index) in hourOptions" :key="index"
             :class="getOptionClass(index)" @click="chooseOption(index)">
          {{ option }}
        </div>
      </div>

      <div class="c-time-checkbox-options" v-show="selectedTimeType !== 'hour'">
        <div v-for="(option,index) in minuteAndSecondOptions" :key="index"
             :class="getOptionClass(index)" @click="chooseOption(index)">
          {{ option }}
        </div>
      </div>

      <div class="c-time-checkbox-popup-btn">
        <span style="color: #e74f4f" @click="closePopup()">close</span>
      </div>
    </div>
  </div>


</template>

<style scoped>

.c-time-checkbox {
  border: 1px solid var(--c-border-color);
  width: 250px;
  box-sizing: border-box;
  cursor: pointer;
  position: relative;

}

.c-time-checkbox span {
  padding: 4px 8px;
  font-size: 18px;
  line-height: 32px;
}

.c-time-checkbox-popup {
  width: 296px;
  height: 0;
  padding: 12px 4px;
  text-align: center;
  position: absolute;
  top: 28px;
  left: -34px;
  box-shadow: 1px 1px 8px var(--c-box-shadow-color);
  background-color: var(--c-background-color);
  overflow: hidden;
  z-index: 2000;
  opacity: 0;
  transition: height .2s,opacity .8s ;
}

.c-time-checkbox-popup-display {
  height: 280px;
  opacity: 1;
}

.c-time-checkbox-type {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.c-time-checkbox-type div {
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 8px;
  cursor: pointer;
}

.c-time-checkbox-options {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  height: 230px;
}

.c-time-checkbox-options div {
  padding: 8px;
  cursor: pointer;
}

.c-time-checkbox-selected {
  color: #0b73dc;
  font-weight: bolder;
}

.c-time-checkbox-popup-btn{
  text-align: right;
}

.c-time-checkbox-popup-btn span{
  padding-top: 8px;
  padding-bottom: 8px;
  padding-right: 20px;
}

</style>
