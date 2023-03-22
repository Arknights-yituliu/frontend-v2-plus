<template>
  <client-only>
    <el-menu
      class="el-menu-demo op_header"
      mode="horizontal"
      text-color="#fff"
      active-text-color="#ffd04b"
      style="border: 0px"
      :default-active="pageContext.urlPathname"
    >
      <el-menu-item index="/">材料一图流</el-menu-item>
      <el-menu-item index="/gachaCal">攒抽规划</el-menu-item>
      <el-menu-item index="/riicCal">排班生成器</el-menu-item>
      <el-menu-item index="/pack">礼包性价比</el-menu-item>
    </el-menu>
  </client-only>
</template>

<script setup>
import { usePageContext } from "@/renderer/usePageContext";
import { ClientOnly } from "@/components/ClientOnly";

const pageContext = usePageContext();
</script>
