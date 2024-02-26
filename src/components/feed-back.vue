<script setup>
import {ref} from "vue";

let feedbackPopupVisible = ref(false)

let feedbackPopupStyle = 'width:500px;'

const feedbackLinkList = {
  "GitHubIssues":'https://github.com/Arknights-yituliu/frontend-v2-plus/issues',
  "OfficialAccount":'https://space.bilibili.com/688411531',
  "QQFan":'https://jq.qq.com/?_wv=1027&k=q1z3p9Yj',
  "QQDocs":'https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ#/fill'
}

function openNewPage(url){
  window.open(url)
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
        <td >反馈流程（越靠前越推荐）</td>
        <td style="width: 100px">点击转跳</td>
      </tr>
      <tr>
        <td>Github issues</td>
        <td>国内访问体验稍差一点</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.GitHubIssues)">点击前往</c-button>
        </td>
      </tr>
      <tr>
        <td>粉丝群539600566</td>
        <td>进群@山桜反馈，如果不在找管理员</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.QQFan)">点击前往</c-button>
        </td>
      </tr>
      <tr>
        <td>B站@罗德岛基建BETA</td>
        <td>直接私信反馈</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.OfficialAccount)">点击前往</c-button>
        </td>
      </tr>
      <tr>
        <td>开发群938710832</td>
        <td>如果有能力自己解决问题，可以加开发群</td>
        <td>
          <!--          <c-button :color="`green`" :status="true" @click="openQQPage()">点击前往</c-button>-->
        </td>
      </tr>
      </tbody>
    </table>
  </c-popup>

</template>

<style scoped>
.feedback-table{
  margin:12px;
  border-collapse: collapse;
  text-align: center;
}


.feedback-table td{
  padding: 12px ;
  line-height: 24px;
  border-bottom: 1px solid var(--c-border-color);
}

</style>