<template>
  <div>
    <a :class="{ activate: '/' == pageContext.urlPathname }" href="/">材料一图流</a>
    <a :class="{ activate: '/gachaCal' == pageContext.urlPathname }" href="/gachaCal">攒抽规划</a>
    <a :class="{ activate: '/riicCal' == pageContext.urlPathname }" href="/riicCal">排班生成器</a>
    <a :class="{ activate: '/pack' == pageContext.urlPathname }" href="/pack">礼包性价比</a>
  </div>
</template>

<script setup>
import { usePageContext } from "@/renderer/usePageContext";
const pageContext = usePageContext();
</script>

<style scoped>
div {
  display: flex;
  flex-direction: row;
  height: 46px;
  align-items: center;
  background-color: rgb(52, 68, 104);
  z-index: 100;
  box-shadow: 0 0 10px rgb(0 0 0);
  gap: 8px;
  padding-left: 8px;
}

a {
  height: 100%;
  padding: 0 14px;
  font-size: 14px;
  vertical-align: center;
  line-height: 46px;
  text-decoration: none;
  color: white;
  box-sizing: border-box;
}

.activate {
  color: #ffd04b;
  border-bottom: 2px solid #ffd04b;
}
</style>
