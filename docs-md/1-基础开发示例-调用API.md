# 基础开发示例-调用API
## 引用API的简易案例

如何获取蓝色品质材料的关卡推荐数据（展示的是封装好的带请求响应错误拦截的调用方式，不限于下面的调用方式，但是URL）

在 src/api路径下新建一个文件stage.js，编写api的请求路径、请求类型、请求参数等
```
 import request from "/src/api/request";
 
  /**
   * 查询蓝色品质材料的推荐关卡
   * @param expCoefficient 经验书价值系数
   * @returns {*}
   */
 getT3StageData(expCoefficient) {
    return request({
      url: `/stage/t3?expCoefficient=${expCoefficient}`,
      method: "get",
    });
  },
```

在src/pages路径下新建stage.page.client.vue文件
```
<template>
  <!-- 页面加载完毕后会执行函数，这时即可展示API返回的数据-->
  <div v-for="(stageList,index) in stageData" :key='index'> 
     <div v-for="(stage,index) in stageList" :key='index'> 
            {{stage}}
     </div>
  </div>
  
</template>


<script>
import stageApi from '/src/api/stage' //引入封装的API

let stageData = ref([])  //接收API内数据的数组

// 调用API的函数
function getT3StageData() {
      const  expCoefficient = 0.625
      stageApi.getT3StageData(expCoefficient).then((response) => {
        stageData.value = [];
        stageData.value = response.data;
    })
}

//页面加载后执行函数获取数据
onMounted(() => {
  getT3StageData()
});

</script>
```




