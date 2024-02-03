<template>
  <div v-for="(step, index) in steps" :key="index">
    <div v-if="currentStep === index">
      <div class="overlay"/> <!--遮罩层-->
      <div :style="buttonsStyle(step)">
        <el-card class="box-card" shadow="never">
          <div class="tour-content">
            {{ step.content }}
          </div>
          <div class="button-group">
            <button @click="prevStep">上一步</button>
            <button @click="nextStep">下一步</button>
            <button @click="endTour">结束导览</button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, defineProps, onMounted, defineEmits} from 'vue';

const props = defineProps({
  s1: String,
  s2: String,
  s3: String
});

const steps = [
  {selector: props.s1, content: '点此查看效率计算详情'},
  {selector: props.s2, content: '点此查看材料掉率详情'},
  {selector: props.s3, content: '将光标悬停至此处查看标题导航栏'},
];

const currentStep = ref(0);
const emit = defineEmits(["close"]);
let element; //凸显元素

const buttonsStyle = (step) => {
  element = document.querySelector(step.selector);
  if (!element) return {};
  const elements = document.querySelectorAll('.highlighted-element');
  elements.forEach(el => el.classList.remove('highlighted-element'));
  element.classList.add('highlighted-element');

  const {top, left, width} = element.getBoundingClientRect();
  let style = {
    position: 'absolute',
    zIndex: '1001',
    backgroundColor: 'white',
    border: '5px',
    gap: '2px',
    borderRadius: '10px',
    top: `${top + window.scrollY + 50}px`, // 基于contentStyle位置进行调整
  };

  if (left > window.innerWidth / 2) {
    style.left = `${left - 300}px`;
  } else {
    style.left = `${left + width + 20}px`;
  }

  return style;
};


const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const endTour = () => {
  currentStep.value = 0;
  element.classList.remove('highlighted-element');
  emit('close');
};

onMounted(() => {
  if (steps.length === 0) {
    console.warn('导航栏中没有步数定义');
  }
});
</script>

<style>
.tour-content {
  margin-bottom: 10px;
}

.box-card {
  padding: 10px; /* 内边距 */
}

.button-group button {
  padding: 8px;
  border-radius: 4px;
  background-color: lightgray;
  color: black;
  margin-right: 10px;
  border: none;
  cursor: pointer;
}

.button-group button:last-child {
  margin-right: 0;
}

.button-group button:hover {
  background-color: darkgray;
  color: white;
}

.button-group button:active {
  background-color: #494949;
}

.highlighted-element {
  position: relative;
  z-index: 1000;
  background-color: white;
  border-radius: 3px;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(77, 77, 77, 0.7);
  z-index: 999;
  pointer-events: none;
}
</style>
