<!--
  干员数据导入的常见问题与注意事项
  三种导入方式（森空岛凭证 / 官网 Token / 森空岛扫码）共用，由页面放在导入流程底部
-->
<template>
  <div class="d-flex flex-column ga-4">
    <v-alert :icon="false" color="info" variant="tonal" density="compact">
      <h3 class="my-3">请勿修改设备本地时间</h3>
      <p class="text-caption mb-1">如果出现报错：请勿修改设备本地时间可能是系统时间不准确导致。Windows 同步方法：</p>
      <p class="text-caption mb-1">① 右键任务栏时间 → 调整日期/时间</p>
      <p class="text-caption mb-1">② 点击"立即同步"</p>
      <p class="text-caption">或 Win+R 输入 <code>timedate.cpl</code> → Internet 时间 → 更改设置 → 立即更新</p>
       <h3 class="my-3">需要设备验证</h3>
      <p class="text-caption">
        如果提示需要设备验证，请打开森空岛APP，进入 设置 → 通行证与账号安全 → 账号安全管理 → 设备管理 → 新设备登录身份验证，关闭"新设备登录身份验证"
      </p>
      <h3 class="my-3">账号安全</h3>
      <p class="text-caption">为保障您的账号安全，请在导入后退出明日方舟官网登录，退出登录后Token就会失效了</p>
    </v-alert>
  </div>
</template>
