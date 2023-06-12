<template>
  <div class="riic-bg">
    <div class="riic-btn">
      <picture class="riic-icon">
        <source srcset="/image/website/maa.webp" type="image/webp" />
        <source srcset="/image/website/maa.png" type="image/png" />
        <img src="/image/website/maa.png" />
      </picture>
      <div class="riic-title">Maa Assistant Arknights</div>
      <div class="riic-intro">每日定时进行三次换班</div>
      <div class="riic-guide">
        Maa及排班表生成的使用讲解：
        <span>BV1De411L7C9</span>
      </div>
    </div>
    <div class="riic-btn">
      <picture class="riic-icon">
        <source srcset="/image/website/mower.webp" type="image/webp" />
        <source srcset="/image/website/mower.png" type="image/png" />
        <img src="/public/image/website/mower.png" />
      </picture>
      <div class="riic-title">Arknights Mower</div>
      <div class="riic-intro">动态换班，使用但书与龙舌兰跑单</div>
      <div class="riic-guide">
        跑单玩法及Mower工具讲解：
        <span>BV1KT411s7Ar</span>
      </div>
    </div>
  </div>
</template>

<style>
.riic-bg {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  /* min-height: calc(100vh - 156px); */
  padding: 30px 0;
  display: flex;
  flex-direction: row;
  gap: 30px;
  justify-content: center;
  align-items: center;
  align-content: center;
  flex-wrap: wrap;
}

.riic-btn {
  width: 460px;
  height: 382px;
  border-radius: 14px;
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

.riic-btn:hover {
  background-color: #18a058;
  color: white;
}

.riic-icon {
  margin-bottom: 8px;
}

.riic-icon source,
.riic-icon img {
  width: 200px;
  height: 200px;
}

.riic-guide {
  font-size: 18px;
}

.riic-title {
  font-size: 28px;
  font-weight: bold;
}

.riic-intro {
  font-size: 22px;
}
</style>

<script>
export const documentProps = {
  title: "一图流 - 排班生成器",
  description: "明日方舟一图流，排班生成器，基建排班",
};
</script>
