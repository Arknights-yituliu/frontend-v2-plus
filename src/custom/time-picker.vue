<script setup>
import {onMounted, ref} from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

const hourId = getId()
const minuteId = getId()
const secondId = getId()

function getId(){
  const chars = '01234567890qwertyuiopasdfghjklzxcvbnm'.split('')
  let text = ''
  for (let i = 0; i < 8; i++) {
    const index = Math.floor(Math.random()*chars.length);
    text+=chars[index]
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
  if(!val) return
  order.value = val

  hourScrollIntoView()
  minuteScrollIntoView()
  // secondScrollIntoView()
}

function hourScrollIntoView(){
  const hour = props.modelValue[order.value].getHours()

  const hourElement = document.getElementById(`${hourId}-${hour}`)

  if (hourElement) {
    hourElement.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}

function minuteScrollIntoView(){
  const minute = props.modelValue[order.value].getMinutes()

  const minuteElement = document.getElementById(`${minuteId}-${minute}`)
  if (minuteElement) {
    minuteElement.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}

function secondScrollIntoView(){
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

onMounted(()=>{
  function hourHandleWheel(event) {
    const delta = event.deltaY
    if(delta<0){
      setHours(props.modelValue[order.value].getHours()-1)
    }else if(delta>0){
      setHours(props.modelValue[order.value].getHours()+1)
    }

    hourScrollIntoView()
    event.preventDefault()
  }

  function minuteHandleWheel(event) {
    const delta = event.deltaY
    if(delta<0){
      setMinutes(props.modelValue[order.value].getMinutes()-1)
    }else if(delta>0){
      setMinutes(props.modelValue[order.value].getMinutes()+1)
    }


    minuteScrollIntoView()
    event.preventDefault()
  }

  const popupElementList = document.getElementsByClassName('time-picker-popup')
  for(let dom of popupElementList){
    if(dom.addEventListener){
      dom.addEventListener('wheel',(event)=>{event.preventDefault()},false)
    }else if(dom.attachEvent){
      dom.attachEvent('wheel',(event)=>{event.preventDefault()},false)
    }
  }

  const hourScrollBarElementList = document.getElementsByClassName(`time-scroll-bar-wrap ${hourId}`)
  for (let dom of hourScrollBarElementList) {
    if(dom.addEventListener){
      dom.addEventListener('wheel',hourHandleWheel,false)
    }else if(dom.attachEvent){
      dom.attachEvent('wheel',hourHandleWheel,false)
    }
  }

  const minuteScrollBarElementList = document.getElementsByClassName(`time-scroll-bar-wrap ${minuteId}`)
  for (let dom of minuteScrollBarElementList) {
    if(dom.addEventListener){
      dom.addEventListener('wheel',minuteHandleWheel,false)
    }else if(dom.attachEvent){
      dom.attachEvent('wheel',minuteHandleWheel,false)
    }
  }

})

</script>

<template>
  <div class="time-picker-popup-mask" @click="popupVisible('')" v-show="popupStyle.indexOf('height')>-1"></div>
  <div class="time-picker">
    <i class="iconfont icon-bell"></i>
    <span @click="popupVisible(popupStyleValue,'start')">
      {{
        modelValue.start.getHours().toString().padStart(2, "0")
      }}:{{ modelValue.start.getMinutes().toString().padStart(2, "0") }}
    </span>
    <span>至</span>
    <span @click="popupVisible(popupStyleValue,'end')">
      {{
        modelValue.end.getHours().toString().padStart(2, "0")
      }}:{{ modelValue.end.getMinutes().toString().padStart(2, "0") }}
    </span>

    <div class="time-picker-popup" :style="popupStyle">
      <div class="time-selection-bar"></div>
      <div :class="`time-scroll-bar-wrap ${hourId}`">
        <div class="time-scroll-bar">
          <div v-for="hour in hourList" :key="hour" class="time-option" @click="setHours(hour)"
               :id="`${hourId}-${hour}`"
               :class="highlight(hour,modelValue[order].getHours())">
            {{ hour.toString().padStart(2, "0") }}
          </div>
        </div>
      </div>
      <div :class="`time-scroll-bar-wrap ${minuteId}`">
        <div class="time-scroll-bar">
          <div v-for="minute in minuteList" :key="minute" class="time-option" @click="setMinutes(minute)"
               :id="`${minuteId}-${minute}`"
               :class="highlight(minute,modelValue[order].getMinutes())">
            {{ minute.toString().padStart(2, "0") }}
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


.time-selection-bar{
  position: absolute;
  top: 62px;
  height: 26px;
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
  height: 136px;
  width: 43px;
  overflow: hidden;
  z-index: 1100;
}

.time-scroll-bar {
  height: 140px;
  width: 60px;
  overflow-y: scroll;
  padding: 100px 0;
  box-sizing: border-box;
}

.time-option {
  cursor: pointer;
  padding: 4px;
  padding-left: 4px;
}

.time-picker span {
  padding: 4px 8px;
}


.highlight {
  color: #0b73dc;
  font-weight: 600;
}


</style>