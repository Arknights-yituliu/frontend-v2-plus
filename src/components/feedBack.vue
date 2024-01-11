<script setup>
import {ref} from "vue";

let feedbackPopupVisible = ref(false)

let feedbackPopupStyle = 'width:550px;'

function openQQDocsPage() {
  window.open('https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ#/fill')
}

function openQQPage() {
  window.open('https://jq.qq.com/?_wv=1027&k=q1z3p9Yj')
}

function openOfficialAccountPage() {
  window.open('https://space.bilibili.com/688411531')
}

function openGithubIssuesPage() {
  window.open('https://github.com/Arknights-yituliu/frontend-v2-plus/issues')
}

</script>


<template>

  <c-button :color="`orange`" :status="true" @click="feedbackPopupVisible = !feedbackPopupVisible">
    问题反馈
  </c-button>

    <c-popup v-model:visible="feedbackPopupVisible" :style="feedbackPopupStyle">
    <table class="feedback-table">
      <tbody>
      <tr>
        <td>反馈方式</td>
        <td >转跳</td>
        <td >反馈流程（越靠前越推荐）</td>
      </tr>
      <tr>
        <td>Github issues</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openGithubIssuesPage()">点击前往</c-button>
        </td>
        <td></td>
      </tr>
      <tr>
        <td>粉丝群539600566</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openQQPage()">点击前往</c-button>
        </td>
        <td>进群@山桜反馈，如果不在找管理员</td>
      </tr>
      <tr>
        <td>开发群938710832</td>
        <td>
          <!--          <c-button :color="`green`" :status="true" @click="openQQPage()">点击前往</c-button>-->
        </td>
        <td>如果想参与开发或提出优化建议请加开发群</td>
      </tr>
      <tr>
        <td>B站@罗德岛基建BETA</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openOfficialAccountPage()">点击前往</c-button>
        </td>
        <td>直接私信反馈</td>
      </tr>
      <tr>
        <td>QQ问卷</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openQQDocsPage()">点击前往</c-button>
        </td>
        <td>无法交流，只能处理简单的问题（例如错字）</td>
      </tr>
      </tbody>
    </table>
  </c-popup>

</template>

<style scoped>
.feedback-table{
  margin:10px auto;
  border-collapse: collapse;
  text-align: center;
}

.feedback-table td{
  padding: 4px;
  border: 1px solid var(--c-border-color);
}

</style>