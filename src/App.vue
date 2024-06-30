<template>

    <div class="container color_var" id="container" :class="theme_type">
      <my-aside></my-aside>
      <loading></loading>
      <div class="header">
        <my-header/>
      </div>
      <div class="main">
        <div class="dev-tip tip-color-warn" v-show="devVer">您正在访问的是开发版域名，此域名提供的服务可能存在不稳定的情况，
          请访问正式域名<a href="https://ark.yituliu.cn/">https://ark.yituliu.cn/</a></div>
        <div class="dev-tip tip-color-warn" >服务器正在恢复中，如有问题请反馈</div>


        <router-view>
        </router-view>
      </div>
      <my-footer></my-footer>
  </div>

</template>

<script setup>
//导航
import '/src/assets/svg/iconfont.css'




import "/src/assets/css/stage_v2.css";
import "/src/assets/css/store_v2.css";
import "/src/assets/css/sprite_item.css";
import "/src/assets/css/sprite_style.css";
import "/src/assets/css/sprite_icon.css";
import "/src/assets/css/about.css";
import "/src/assets/css/elite.css";
import '/src/assets/css/sprite/sprite_avatar.css'

import "/src/assets/css/stage_v3.css";

// 通用样式
import '/src/assets/css/common/btn.scss'
import '/src/assets/css/common/checkbox.scss'
import '/src/assets/css/common/input.scss'
import '/src/assets/css/common/tip.scss'
import '/src/assets/css/common/title_and_tag.scss'



import '/src/assets/css/layout/aside.scss'
import '/src/assets/css/layout/atom.scss'
import '/src/assets/css/layout/basic.scss'

import '/src/assets/css/layout/navigation.scss'

import '/src/assets/css/layout/main.scss'
import '/src/assets/css/layout/theme.scss'

// svg字体

// 旧版css，待修改

import myHeader from "/src/pages/layout/myheader.vue";
import myFooter from "/src/pages/layout/myfooter.vue";
import myAside from "/src/pages/layout/aside.vue";
import loading from '/src/pages/layout/loading.vue'
import {onMounted, ref} from "vue";




let theme_type = ref("theme_init")


let devVer = ref(false)

onMounted(() => {
  const theme_v2 = localStorage.getItem("theme_v2");

  if (theme_v2 === 'dark') {
    theme_type.value = 'theme_dark'
  } else {
    theme_type.value = 'theme_light'
  }

  const currentDomain = window.location.hostname;
  if(currentDomain.indexOf('dev')>-1){
    devVer.value = true
  }

  document.getElementsByTagName("html").item(0).className = theme_v2 === "dark" ? "dark" : "light";
})


// const theme = ref(pageContext.theme === "dark");
// provide("theme", theme);

</script>

<style>
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Regular.ttf') format("truetype");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Italic.ttf') format("truetype");
  font-weight: normal;
  font-style: italic;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Bold.ttf') format("truetype");
  font-weight: bold;
  font-style: italic;
}



.dev-tip{
   text-align: center;
   padding: 8px 0;
   font-size: 14px;
   font-weight: bold;

}


</style>


