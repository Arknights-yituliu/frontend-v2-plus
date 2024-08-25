<template>
  <!-- 单标签组件，直接在页面末尾引入即可 -->
</template>

<script setup>
import {onMounted,  watch} from 'vue';
import term_description from '/src/static/json/build/term_description.json';
import {defineProps} from 'vue';
import {ElNotification} from "element-plus";

const props = defineProps({
  operatorList: {
    type: Array,
    required: true
  }
})

// 处理术语元素点击事件
const handleClick = (event) => {
  const element = event.target;

  // 获取点击元素的类名，用以匹配术语的key
  const className = element.className
  if (!className) return;

  const descriptionData = term_description[className];

  if (descriptionData) {
    createNotification(descriptionData.termName, descriptionData.description);
  }
};

// 创建一个新的介绍框
const createNotification = (text, description) => {
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

// 尝试绑定术语元素的点击事件
const tryBindEvent = () => {
  const getMatchingElements = () => {
    return Array.from(document.querySelectorAll('[class^="cc"]')).filter(el => !el.className.startsWith('cc-rem'));
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
