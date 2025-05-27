<script setup>

import {ref} from "vue";

// let imageUrl = ref('')
// let imageDialog = ref(false)
// function viewLargerImage(url){
//   imageUrl.value = url
//   imageDialog.value = true
// }
</script>

<template>

  <h1 id="join-development-quickly">纯网页参与开发</h1>
  <v-divider ></v-divider>
  <v-alert variant="tonal" type="info"  >
    <v-alert-title><span class="font-bold">注意事项</span></v-alert-title>
    此方法适用于想提交一些修改JSON文件、文档、错字之类的修改，涉及代码的修改建议使用IDE工具。
  </v-alert>

  <p>1.首先来到前端仓库，点击右上角的<b> Fork </b>按钮复制一份代码</p>
  <img src="/docs/public/image/docs/fork.jpg" alt="" >
  <p>2.然后直接点击<b> Create Fork </b>按钮</p>
  <img src="/docs/public/image/docs/create-fork.jpg" alt="" >
  <p>
    3.接下来来到了你的个人仓库，可以看到标题是 “用户名称/frontend-v2-plus”，下面一行小字 forked from
    Arknights-yituliu/frontend-v2-plus
  </p>
  <img src="/docs/public/image/docs/my-repositories.jpg" alt="" >
  <p>4.找到你要改的文件，一般数据文件在<b> src/static/ </b>目录下，这里演示如何修改攒抽计算器的活动排期，
    活动排期文件为src/static/json/tools/schedule_by_honeycake.json（非固定活动）或
    src/static/json/tools/schedule_fixed.json（固定活动，如周年、夏活等）</p>
  <p>5.点击对应文件页面的右上角编辑按钮</p>
  <img src="/docs/public/image/docs/web-edit.jpg" alt="" >
  <p>6.到这步就可以随便修改了，如果涉及大量修改还是直接拉取代码到本地用编译器编辑，编译器一般带JSON格式检查</p>
  <p>7.修改完后点击右上角绿色的<b> Commit-changes </b>按钮</p>
  <img src="/docs/public/image/docs/web-commit-changes-1.jpg" alt="" >
  <p>8.这时会弹出一个弹窗，在弹窗表单上的Commit message填写本次提交的大概描述，建议按统一格式写，填写完毕后点击<b> Commit
    changes </b>按钮</p>
  <v-alert variant="tonal" type="info" title="Commit message格式">
    提交类型(例如：更新-update、修复-fix)(修改区域):本次修改的大概描述
  </v-alert>
  <img src="/docs/public/image/docs/web-commit-changes-2.jpg" alt="" >
  <p>9.当你完成上述步骤，回到你fork的仓库主页，或者点击<b> code </b>按钮回到主页，此时会有两种情况：</p>
  <p>① 如果出现<b> Compare & Pull Requeste </b>按钮，直接点就行了。</p>
  <p>② 没有出现，就点击<b> Contribute </b>按钮，再点击<b> Open Pull Request </b></p>
  <img src="/docs/public/image/docs/open-pull-request.jpg" alt="" >
  <p>10.此时会跳转到pull-request页面，可查看提交的内容是否是你想提交的。<br>
    之后填写Add a title和Add a description， title也最好按commit message格式填写。<br>
    以上都确认无误后，点击绿色的<b> Create pull request </b>按钮</p>
  <img src="/docs/public/image/docs/create-pull-request.jpg" alt="" >
  <p>11.提交后等待组织仓库的持有人merge即可</p>



</template>