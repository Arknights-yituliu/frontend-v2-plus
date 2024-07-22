<script setup>
import {onMounted, ref, watch} from "vue";

function getId() {
  const chars = '01234567890qwertyuiopasdfghjklzxcvbnm'.split('')
  let text = ''
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * chars.length);
    text += chars[index]
  }
  return text
}

const timeCheckboxId = getId()
const timeCheckboxPopupId = getId()

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

let startOrEnd = ref(3)
let selectedTimeType = ref('hour')
let selectedOption = ref({hour: 12, minute: 0, second: 0})

function chooseStartOrEnd(value) {
  startOrEnd.value = value
  // if(startOrEnd.value>=props.modelValue.length){
  //   return;
  // }
  const date = props.modelValue[startOrEnd.value]
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  selectedOption.value = {hour: hour, minute: minute, second: second}

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

  emit('update:modelValue', [props.modelValue[0], props.modelValue[1]])

}



onMounted(() => {

})

function openPopup() {

  const popupElement = document.getElementById(timeCheckboxPopupId)

  setInset()

  // popupElement.style.display = 'block'
  popupElement.style.height = '294px'
  popupElement.style.width = '290px'
  popupElement.style.opacity = '1'

  const elements = document.querySelectorAll('.c-time-checkbox-popup')



  for (const element of elements) {
    if (element.id !== timeCheckboxPopupId) {
      // element.style.display = 'none'
      element.style.height = '0'
      element.style.width = '0'
      element.style.opacity = '0'
    }
  }
}

import {debounce} from "../utils/Debounce.js";

const setInsetDebounce = debounce(setInset,500)

function setInset(){
  const checkboxElement = document.getElementById(timeCheckboxId)
  const popupElement = document.getElementById(timeCheckboxPopupId)
  const boundingClientRect = checkboxElement.getBoundingClientRect();
  const top = checkboxElement.offsetTop + 40
  let left = boundingClientRect.left
  // let right = boundingClientRect.right
  const checkboxElementClientWidth = checkboxElement.clientWidth
  // const innerWidth = window.innerWidth-50;
  const popupElementClientWidth = popupElement.clientWidth

  popupElement.style.top = `${top}px`

  const leftOffset = (checkboxElementClientWidth - popupElementClientWidth)/2
  popupElement.style.left = `${left + leftOffset}px`
}

window.addEventListener('scroll', setInsetDebounce)
window.addEventListener('resize', setInsetDebounce)


function closePopup() {
  const popupElement = document.getElementById(timeCheckboxPopupId)
  popupElement.style.height = '0'
  popupElement.style.opacity = '0'
  popupElement.style.width = '0'
  // popupElement.style.display = 'none'
  // startOrEnd.value = 3
}

function getTimeTextClass(value) {
  return startOrEnd.value === value ? 'c-time-checkbox-selected' : ''
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
  <div class="c-time-checkbox" :id="timeCheckboxId">
    <i class="iconfont icon-time" style="padding: 8px"></i>
    <span @click="chooseStartOrEnd(0);openPopup()"
          :class="getTimeTextClass(0)">{{ getTime(modelValue[0]) }}</span>
    <span>至</span>
    <span @click="chooseStartOrEnd(1);openPopup()"
          :class="getTimeTextClass(1)">{{ getTime(modelValue[1]) }}</span>
    <!--    <span @click="getLeft()">get</span>-->
  </div>

  <div class="c-time-checkbox-popup" :id="timeCheckboxPopupId">
    <div class="c-time-checkbox-type">
      <div style="width: 70px" class="c-time-checkbox-selected">
        {{ startOrEnd === 1 ? '结束' : '起始' }}
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
<!--      <div style="width: 10px;height: 2px"></div>-->
    </div>


    <div class="c-time-checkbox-options" v-if="selectedTimeType === 'hour'">
      <div v-for="(option,index) in hourOptions" :key="index"
           :class="getOptionClass(index)" @click="chooseOption(index)">
        {{ option }}
      </div>
    </div>

    <div class="c-time-checkbox-options" v-if="selectedTimeType !== 'hour'">
      <div v-for="(option,index) in minuteAndSecondOptions" :key="index"
           :class="getOptionClass(index)" @click="chooseOption(index)">
        {{ option }}
      </div>
    </div>

    <div class="c-time-checkbox-popup-btn">
      <span style="color: #e74f4f" @click="closePopup()">close</span>
    </div>
  </div>

</template>

<style scoped>

.c-time-checkbox {
  border: 1px solid var(--c-border-color);
  width: 250px;
  box-sizing: border-box;
  cursor: pointer;
}

.c-time-checkbox span {
  padding: 4px 8px;
  font-size: 18px;
  line-height: 32px;
}

.c-time-checkbox-popup {
  width: 0;
  height: 0;
  padding: 8px 0;
  box-sizing: border-box;
  text-align: center;
  position: absolute;
  box-shadow: 1px 1px 8px var(--c-box-shadow-color);
  background-color: var(--c-background-color);
  overflow: hidden;
  z-index: 3000;
  opacity: 0;
  top: 100%;
  transition: opacity .5s;
}

.c-time-checkbox-popup-visible {
  height: 280px;
  opacity: 1;
}

.c-time-checkbox-type {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  height: 28px;
  border-bottom: 1px solid var(--c-border-color);
}

.c-time-checkbox-type div {
  cursor: pointer;
  line-height: 24px;
  width: 50px;
}

.c-time-checkbox-options {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  height: 230px;
  border-bottom: 1px solid var(--c-border-color);
}

.c-time-checkbox-options div {
  width: 32px;
  line-height: 32px;
  text-align: center;
  cursor: pointer;
}

.c-time-checkbox-selected {
  color: #0b73dc;
  font-weight: bolder;
}

.c-time-checkbox-popup-btn {
  text-align: right;
}

.c-time-checkbox-popup-btn span {
  padding-top: 8px;
  padding-bottom: 8px;
  padding-right: 20px;
  cursor: pointer;
  line-height: 24px;
}

</style>
