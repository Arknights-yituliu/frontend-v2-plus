<template>
  <!--
  固钉导航栏，若要使用该组件，直接<fixed-nav/>引入就行，该导航栏会自动抓取引入组件中class为“op_title_ctext”的div作为链接
  引入时，尽量在<template>末尾引入，避免页面元素将导航栏给遮住
  需要注意的是，若class为“op_title_ctext”的div数量不多于1个，则该组件不显示
  -->
  <div v-if="sections.length > 1" class="fixed-nav">
    <div class="nav-content">
      <el-link v-for="section in sections" :key="section.text" @click="scrollTo(section.element)" :underline="false">
        {{ section.text }}
      </el-link>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue';

const scrollTo = (element) => {
  element.scrollIntoView({behavior: 'smooth'});
};

const sections = ref([]);

const fetchSections = () => {
  const elements = document.querySelectorAll('.op_title_ctext');
  sections.value = Array.from(elements).map(el => ({
    text: el.textContent.trim(),
    element: el
  }));
};

onMounted(() => {
  fetchSections();
});
</script>

<style scoped>
.fixed-nav {
  position: fixed;
  right: 0;
  top: 43%;
}

.nav-content {
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  transition: transform 0.3s;
  transform: translateX(105%); /* 当鼠标悬停在fixed-nav上时显示 */
}

.fixed-nav:hover .nav-content {
  transform: translateX(0); /* 当鼠标悬停在fixed-nav上时显示 */
}

.el-link {
  display: block; /* 使链接垂直排列 */
  padding: 5px;
  text-decoration: none; /* 去除下划线 */
}
</style>

