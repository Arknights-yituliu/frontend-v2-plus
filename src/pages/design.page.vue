<script setup>
import "mdui/dist/css/mdui.min.css";
import "@/assets/css/sprite_item_large.css";
</script>

<template>
  <div class="mdui-container">
    <div class="mdui-row">
      <div v-for="i in 24" class="mdui-col-xs-6 mdui-col-sm-4 mdui-col-md-3 mdui-col-lg-2 mdui-p-y-1">
        <div class="mdui-shadow-2 mdui-p-a-3 mdui-text-center mdui-ripple">
          <div class="bg-30063large sprite_large mdui-center"></div>
          {{ i }}
        </div>
      </div>
    </div>
  </div>

  <div class="theme_light">
    <div class="light_card demo_card">
      <picture class="riic_icon">
        <source srcset="https://avatars.githubusercontent.com/u/97677443?s=200" type="image/webp" />
        <source srcset="https://avatars.githubusercontent.com/u/97677443?s=200" type="image/png" />
        <img src="https://avatars.githubusercontent.com/u/97677443?s=200" />
      </picture>
      <div class="demo_main_text">这里是主要内容 Here is the main content</div>
      <div class="demo_secondary_text">这里是次要内容 Here is the secondary content</div>
      <div class="demo_button">这里是一个按钮</div>
      <div class="demo_button_pressed">这里是一个被按下的按钮</div>
    </div>
  </div>
  <div class="theme_dark">
    <div class="dark_card demo_card">
      <picture class="riic_icon">
        <source srcset="https://avatars.githubusercontent.com/u/97677443?s=200" type="image/webp" />
        <source srcset="https://avatars.githubusercontent.com/u/97677443?s=200" type="image/png" />
        <img src="https://avatars.githubusercontent.com/u/97677443?s=200" />
      </picture>
      <div class="demo_main_text">这里是主要内容 Here is the main content</div>
      <div class="demo_secondary_text">这里是次要内容 Here is the secondary content</div>
      https://m2.material.io/components/buttons
      <div class="demo_button">这里是一个按钮</div>
      <div class="demo_button_pressed">这里是一个被按下的按钮</div>
    </div>
  </div>
</template>

<style>
.demo_card {
  width: 460px;
  height: 480px;
  margin: 12px;
  border-radius: 14px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.2s;
}

.demo_button {
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  margin: 12px;
  padding: 0px 16px;
  border-radius: 8px;
  background-color: #80808020;
}
.demo_button_pressed {
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  margin: 4px;
  padding: 0px 16px;
  border-radius: 8px;
  background: #5096ff;
  /* color: white; */
}
.black_light {
  background-color: white;
}

.light_card {
  color: black;

  box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.08), 0 3px 6px 0 rgba(0, 0, 0, 0.06), 0 5px 12px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.2s;
}
.black_dark {
  background-color: #121212;
}

.dark_card {
  background-color: #242424;
  color: #e0e0e0;

  box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.08), 0 3px 6px 0 rgba(0, 0, 0, 0.06), 0 5px 12px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.2s;
}
</style>

<script>
export const documentProps = {
  title: "一图流 - 排班生成器",
  description: "明日方舟一图流，排班生成器，基建排班",
};
</script>
