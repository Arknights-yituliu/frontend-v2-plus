<template>
<div class="donate_page">


  <div>
    <div class="donate_content">目前服务器的支出部分主要来源是热心玩家捐助，感谢每一位捐助者的支持</div>
  </div>
  <div class="donate_image_wrap">
    <div class="donate_card">
      <img class="donate_image" src="https://image.yituliu.site/pay/alipay.png" alt="" />
      <div class="donate_image_desc">支付宝</div>
    </div>
    <div class="donate_card">
      <img class="donate_image" src="https://image.yituliu.site/pay/wechat.png" alt="" />
      <div class="donate_image_desc">微信</div>
    </div>
  </div>
</div>
</template>

<style scoped>
.donate_page{
   padding: 10px;
}

.donate_content {
  width: 80%;
  margin: auto;
  text-align: center;
  margin-top: 50px;
  margin-bottom: 50px;
  font-size: 20px;
  font-weight: 800;
}

.donate_image_wrap {
  display: flex;
}
.donate_card {
  width: 400px;
  margin: auto;
  box-shadow: 0 2px 2px 2px rgb(202, 202, 202);
}
.donate_image {
  /* border: 1px red solid; */
  width: 200px;
  height: 200px;
  margin: 100px;
  margin-top: 30px;
  margin-bottom: 30px;
}

.donate_image_desc {
  /* border: 1px red solid; */
  width: 400px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  height: 50px;
}
</style>
