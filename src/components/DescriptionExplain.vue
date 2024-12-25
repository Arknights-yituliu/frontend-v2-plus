<template>
  <!-- 单标签组件，直接在页面末尾引入即可 -->
</template>

<script setup>
import {defineProps, onMounted, watch} from 'vue';
import term_description from '/src/static/json/build/term_description.json';
import {ElNotification} from "element-plus";
import {htmlStringToVNode} from "@/utils/format.js";

const props = defineProps({
  operatorList: {
    type: Array,
    required: true
  }
})

// 处理术语元素点击事件
const handleClick = (event) => {
  let element = event.target;

  // 迭代查找 data-termId 属性，直到遇到td标签
  while (element && !element.hasAttribute('data-termId') && element.tagName !== 'TD') {
    element = element.parentElement;
  }

  // 如果找到了具有 data-termId 的元素，再进行检索
  if (element && element.hasAttribute('data-termId')) {
    const termId = element.getAttribute('data-termId');

    const descriptionData = term_description[termId];

    if (descriptionData) {
      createNotification(descriptionData.termName, descriptionData.description);
    }
  }
};

// 创建一个新的介绍框
const createNotification = (text, description) => {
  ElNotification({
    title: text,
    message: htmlStringToVNode(description),
    duration: 7000
  })
};

// 绑定元素事件和样式
const bindElements = (elements) => {
  elements.forEach((element) => {
    element.addEventListener('click', handleClick);
    element.style.textDecoration = 'underline';
    element.style.textDecorationColor = 'grey';
    element.style.cursor = 'pointer';
  });
};

// 尝试绑定术语元素的点击事件
const tryBindEvent = () => {
  const getMatchingElements = () => {
    const elements = Array.from(document.querySelectorAll('[data-termId]'))
    // console.log(elements);
    return elements;
  };
  if (props.operatorList.length > 0) {
    bindElements(getMatchingElements());
  } else {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (props.operatorList.length > 0) {
        bindElements(getMatchingElements());
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

// 在干员列表重新筛选后，再次进行绑定
watch(() => props.operatorList, () => {
  tryBindEvent();
});
</script>

<style scoped>
</style>
