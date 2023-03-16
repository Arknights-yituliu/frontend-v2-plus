<template>
  <el-container>
    <el-header style="z-index: 100; height: 45px; position: sticky; width: 100%; top: 0px">
      <myheader />
    </el-header>
    <el-main style="z-index: 10; background-color: #808080">
      <FirstPage />
    </el-main>
    <el-footer style="z-index: 100; height: 40px; padding: 0px; background-color: rgb(52 68 104)">
      <myfooter />
    </el-footer>
  </el-container>
</template>

<script>
import "@/assets/css/basic.css";
import "@/assets/css/stage_v2.css";
import "@/assets/css/store_v2.css";
import "@/assets/css/sprite_item.css";
import "@/assets/css/sprite_item_large.css";
import "@/assets/css/sprite_index.css";
import "@/assets/css/sprite_gacha.css";
import "@/assets/css/sprite_icon.css";

// 旧版css，待修改
import "@/assets/css/item.css";
import "@/assets/css/recruit.css";

import 'element-plus/es/components/message/style/css'
</script>

<style scoped>
.el-main {
  padding: 0px;
  overflow: inherit;
}
.el-header {
  padding: 0px;
}

.el-menu.el-menu--horizontal {
  border-bottom: none;
}

.el-slider__button-wrapper {
  z-index: auto;
}
</style>
