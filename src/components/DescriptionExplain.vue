<template>
  <!-- 单标签组件，直接在页面末尾引入即可 -->
</template>

<script setup>
import {onMounted,  watch} from 'vue';
import term_description from '/src/static/json/build/term_description.json';
import {defineProps} from 'vue';
import {ElNotification} from "element-plus";

// 记录所有创建的介绍框和 z-index 梯度
const props = defineProps({
  operatorList: {
    type: Array,
    required: true
  }
})

// 处理 cc-base 元素点击事件
const handleClick = (event) => {
  const element = event.target.closest('.cc-base');
  if (!element) return;

  let targetElement = element;
  // 追寻内层子元素，定位术语文本
  while (targetElement.children.length > 0) {
    targetElement = targetElement.children[0];
  }
  const text = targetElement.textContent.trim();
  const descriptionData = term_description[text];

  if (descriptionData) {
    createPopup(text, descriptionData.description);
  }
};

// 创建一个新的介绍框
const createPopup = (text, description) => {
  ElNotification({
    title: text,
    dangerouslyUseHTMLString: true,
    message: description,
    duration: 7000
  })
};

// 绑定元素事件和样式
const bindElements = (elements) => {
  elements.forEach((element) => {
    element.addEventListener('click', handleClick);
    // 添加下划线并改变悬停手势，示意用户可以点击该元素
    element.style.textDecoration = 'underline';
    element.style.textDecorationColor = 'grey';
    element.style.cursor = 'pointer';
  });
};

// 尝试绑定 cc-base 元素的点击事件
const tryBindEvent = () => {
  if (props.operatorList.length > 0) {
    bindElements(document.querySelectorAll('.cc-base'));
  } else {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (props.operatorList.length > 0) {
        bindElements(document.querySelectorAll('.cc-base'));
        clearInterval(interval);
      } else if (attempts >= 10) { // 最多尝试10次绑定
        clearInterval(interval);
      }
    }, 1000);
  }
};

onMounted(() => {
  tryBindEvent();
});

watch(() => props.operatorList, () => {
  tryBindEvent();
});
</script>

<style scoped>
</style>
