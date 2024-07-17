<script setup>
import {onMounted, ref} from "vue";

let devVer = ref(false)
let tipDisplay = ref(true)

onMounted(()=>{
  const currentDomain = window.location.hostname;
  if (currentDomain.indexOf('dev') > -1) {
    devVer.value = true
  }

})

</script>

<template>

  <div class="notice-board-page">
    <div class="dev-tip tip-color-warn" v-show="devVer"
         @click="devVer=false" >
      您正在访问的是开发版域名，此域名提供的服务可能存在不稳定的情况，
      请访问正式域名<a href="https://ark.yituliu.cn/">https://ark.yituliu.cn/</a>
<!--      <i class="iconfont icon-error dev-tip-icon"></i>-->
    </div>
    <div class="dev-tip tip-color-warn" @click="tipDisplay=false" v-show="tipDisplay">
        <span>本站计划7月17日（周三）22:00-23:30进行维护</span>
<!--        <i class="iconfont icon-error dev-tip-icon"></i>-->
    </div>
  </div>

</template>

<style scoped lang="scss">

.notice-board-page {

}

.dev-tip {
  text-align: center;
  padding: 2px;
  font-size: 14px;
  font-weight: bold;
  //background-color: var(--c-background-color);
  //box-shadow: 1px 1px 4px 1px var(--c-box-shadow-color), -1px -1px 4px 1px var(--c-box-shadow-color);
  z-index: 4000;
  position: relative;
}

.dev-tip-icon{
  position: absolute;
  //right: 4px;
  font-size: 18px;
}


</style>