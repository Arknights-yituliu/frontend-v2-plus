<script setup>
import {onMounted, ref} from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

const hourId = getId()
const minuteId = getId()
const secondId = getId()
const containerId = getId()

function getId() {
  const chars = '01234567890qwertyuiopasdfghjklzxcvbnm'.split('')
  let text = ''
  for (let i = 0; i < 8; i++) {
    const index = Math.floor(Math.random() * chars.length);
    text += chars[index]
  }
  return text
}

const hourList = []
for (let i = 0; i < 24; i++) {
  hourList.push(i)
}

const minuteList = []
for (let i = 0; i < 60; i++) {
  minuteList.push(i)
}

let popupStyle = ref('')

let order = ref('start')

function popupVisible(style, val) {
  popupStyle.value = style
  if (!val) return
  order.value = val

  hourScrollIntoView()
  minuteScrollIntoView()
  // secondScrollIntoView()
}

function hourScrollIntoView() {
  const hour = props.modelValue[order.value].getHours()
  hourHandleElement.scrollTop = hour * 24
}

function minuteScrollIntoView() {
  const minute = props.modelValue[order.value].getMinutes()
  minuteHandleElement.scrollTop = minute * 24
}

function secondScrollIntoView() {
  const second = props.modelValue[order.value].getSeconds()
  const secondElement = document.getElementById('time-picker-second' + second)
  if (secondElement) {
    secondElement.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}

const popupStyleValue = 'height:150px;width:150px'


function setHours(hour) {
  props.modelValue[order.value].setHours(hour)
  emit('update:modelValue', {start: props.modelValue.start, end: props.modelValue.end})
}

function setMinutes(minute) {
  props.modelValue[order.value].setMinutes(minute)
  emit('update:modelValue', {start: props.modelValue.start, end: props.modelValue.end})
}

function setSeconds(second) {
  props.modelValue[order.value].setSeconds(second)
  emit('update:modelValue', {start: props.modelValue.start, end: props.modelValue.end})
}

function highlight(option, val) {

  if (option === val) {
    return 'highlight'
  }
  return ''
}

function hourHandleWheel(event) {
  const delta = event.deltaY < 0 ? -1 : 1;
  setHours(props.modelValue[order.value].getHours() + delta)

  hourScrollIntoView(delta)
  event.preventDefault()
}

function minuteHandleWheel(event) {

  const delta = event.deltaY < 0 ? -1 : 1;
  setMinutes(props.modelValue[order.value].getMinutes() + delta)
  minuteScrollIntoView()
  event.preventDefault()
}


function hourMoveHandle() {
  // event.preventDefault();

  const hour = parseInt((hourHandleElement.scrollTop / hourOptionElement.clientHeight * hourOptionElement.childElementCount).toString())
  console.log(hourHandleElement.scrollTop / hourOptionElement.clientHeight)
  setHours(hour)
}

function minuteMoveHandle() {
  // event.preventDefault();
  const minute = parseInt((minuteHandleElement.scrollTop / minuteOptionElement.clientHeight * minuteOptionElement.childElementCount).toString())
  setMinutes(minute)
}


let hourScrollBarElement = void 0
let minuteScrollBarElement = void 0
let hourHandleElement = void 0;
let minuteHandleElement = void 0;
let hourOptionElement = void 0;
let minuteOptionElement = void 0;


function stopMoveHandle() {
  window.removeEventListener('touchmove', hourMoveHandle);
  window.removeEventListener('mousemove', hourMoveHandle);
}

onMounted(() => {

  const container = document.getElementById(`time-picker-popup-${containerId}`)

  if (container.addEventListener) {
    container.addEventListener('wheel', (event) => {
      event.preventDefault()
    }, false)
  } else if (container.attachEvent) {
    container.attachEvent('wheel', (event) => {
      event.preventDefault()
    }, false)
  }



  hourScrollBarElement = document.getElementById(`scroll-bar-wrap-${hourId}`)
  hourHandleElement = document.getElementById(`scroll-bar-${hourId}`)
  hourOptionElement = document.getElementById(`time-option-wrap-${hourId}`)

  if (hourScrollBarElement.addEventListener) {
    hourScrollBarElement.addEventListener('wheel', hourHandleWheel, false)
  } else if (hourScrollBarElement.attachEvent) {
    hourScrollBarElement.attachEvent('wheel', hourHandleWheel, false)
  }


  minuteScrollBarElement = document.getElementById(`scroll-bar-wrap-${minuteId}`)
  minuteHandleElement = document.getElementById(`scroll-bar-${minuteId}`)
  minuteOptionElement = document.getElementById(`time-option-wrap-${minuteId}`)

  if (minuteScrollBarElement.addEventListener) {
    minuteScrollBarElement.addEventListener('wheel', minuteHandleWheel, false)
  } else if (minuteScrollBarElement.attachEvent) {
    minuteScrollBarElement.attachEvent('wheel', minuteHandleWheel, false)
  }


  container.addEventListener('touchmove', hourMoveHandle);
  container.addEventListener('touchmove', minuteMoveHandle);
  // window.addEventListener('mouseup', stopMoveHandle);



})

</script>

<template>
  <div class="time-picker-popup-mask" @click="popupVisible('')" v-show="popupStyle.indexOf('height')>-1"></div>
  <div class="time-picker">
    <i class="iconfont icon-time"></i>
    <span @click="popupVisible(popupStyleValue,'start')" class="time-text">
      {{ modelValue.start.getHours().toString().padStart(2, "0") }}:{{
        modelValue.start.getMinutes().toString().padStart(2, "0")
      }}
    </span>
    <span>至</span>
    <span @click="popupVisible(popupStyleValue,'end')" class="time-text">
      {{ modelValue.end.getHours().toString().padStart(2, "0") }}:{{
        modelValue.end.getMinutes().toString().padStart(2, "0")
      }}
    </span>

    <div class="time-picker-popup" :style="popupStyle" :id="`time-picker-popup-${containerId}`">
      <div class="time-selection-bar"></div>
      <div :class="`time-scroll-bar-wrap ${hourId}`" :id="`scroll-bar-wrap-${hourId}`">
        <div :class="`time-scroll-bar  ${hourId}`" :id="`scroll-bar-${hourId}`">
          <div class="time-option-wrap" :id="`time-option-wrap-${hourId}`">
            <div v-for="hour in hourList" :key="hour" class="time-option" @click="setHours(hour)"
                 :id="`${hourId}-${hour}`"
                 :class="highlight(hour,modelValue[order].getHours())">
              {{ hour.toString().padStart(2, "0") }}
            </div>
          </div>
        </div>
      </div>
      <div :class="`time-scroll-bar-wrap ${minuteId}`" :id="`scroll-bar-wrap-${minuteId}`">
        <div :class="`time-scroll-bar ${minuteId}`" :id="`scroll-bar-${minuteId}`">
          <div class="time-option-wrap" :id="`time-option-wrap-${minuteId}`">
            <div v-for="minute in minuteList" :key="minute" class="time-option" @click="setMinutes(minute)"
                 :id="`${minuteId}-${minute}`"
                 :class="highlight(minute,modelValue[order].getMinutes())">
              {{ minute.toString().padStart(2, "0") }}
            </div>
          </div>
        </div>
      </div>

      <div class="time-scroll-bar-wrap second">
        <!--        <div class="time-scroll-bar">-->
        <!--          <div v-for="second in minuteList" :key="second" class="time-option" @click="setSeconds(second)"-->
        <!--               :id="'time-picker-second'+second"-->
        <!--               :class="highlight(second,modelValue[order].getSeconds())">-->
        <!--            {{ second.toString().padStart(2, "0") }}-->
        <!--          </div>-->
        <!--        </div>-->
      </div>

    </div>
  </div>
</template>

<style>
.time-picker {
  position: relative;
  width: 180px;
  padding: 4px;
  border-radius: 3px;
  border: var(--c-border);
  box-sizing: border-box;
  font-size: 16px;
}

.time-text {
  cursor: pointer;
}

.time-picker-popup-mask {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2000;
}

.time-picker-popup {
  position: absolute;
  top: 40px;
  left: 0;
  width: 0;
  height: 0;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  transition: all 200ms linear;
  box-shadow: var(--c-box-shadow);
  background: var(--c-background-color);
  z-index: 3000;
}


.time-selection-bar {
  position: absolute;
  top: 54px;
  height: 24px;
  width: 150px;
  border-top: var(--c-border);
  border-bottom: var(--c-border);
  background-color: var(--c-background-white-transparent);
  z-index: 1000;
}

.time-picker-popup-visible {
  height: 150px;
}

.time-scroll-bar-wrap {
  padding: 8px 0;
  width: 43px;
  overflow: hidden;
  z-index: 1100;
}

.time-scroll-bar {
  height: 120px;
  width: 60px;
  padding: 48px 0;
  overflow-y: scroll;
  box-sizing: border-box;
}

.time-option {
  cursor: pointer;
  height: 24px;
  line-height: 24px;
}

.time-picker span {
  padding: 4px 8px;
}


.highlight {
  color: #0b73dc;
  font-weight: 600;
}


</style>