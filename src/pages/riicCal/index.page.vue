<template>
  <div class="riic-bg">
    <a class="riic-btn">
      <picture class="riic-icon">
        <source srcset="/image/website/maa.webp" type="image/webp" />
        <source srcset="/image/website/maa.png" type="image/png" />
        <img src="maa.png" />
      </picture>
      <div class="riic-info">
        <div class="riic-guide">
          Maa及排班表生成的使用讲解：
          <span>BV1De411L7C9</span>
        </div>
        <div class="riic-title">Maa Assistant Arknights</div>
        <div class="riic-intro">每日定时进行三次换班</div>
      </div>
    </a>
    <a class="riic-btn">
      <picture class="riic-icon">
        <source srcset="/image/website/mower.webp" type="image/webp" />
        <source srcset="/image/website/mower.png" type="image/png" />
        <img src="mower.png" />
      </picture>
      <div class="riic-info">
        <div class="riic-guide">
          跑单玩法及Mower工具讲解：
          <span>BV1KT411s7Ar</span>
        </div>
        <div class="riic-title">Arknights Mower</div>
        <div class="riic-intro">动态换班，使用但书与龙舌兰跑单</div>
      </div>
    </a>
  </div>
</template>

<style>
.riic-bg {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  height: calc(100vh - 94px);
  display: flex;
  flex-direction: column;
  gap: 30px;
  justify-content: center;
  align-items: center;
}

.riic-btn {
  width: 500px;
  display: block;
  border-radius: 14px;
  box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.08), 0 3px 6px 0 rgba(0, 0, 0, 0.06), 0 5px 12px 4px rgba(0, 0, 0, 0.04);
  height: 138px;
  display: flex;
  align-items: center;
}

.riic-icon {
  margin: 0 18px 0 18px;
}

.riic-icon source,
.riic-icon img {
  width: 100px;
  height: 100px;
}

.riic-info {
  display: flex;
  flex-direction: column;
  height: 90px;
  justify-content: space-between;
}

.riic-guide {
  font-size: 16px;
}

.riic-title {
  font-size: 24px;
  font-weight: bold;
}

.riic-intro {
  font-size: 20px;
}
</style>

<script>
export const documentProps = {
  title: "一图流 - 排班生成器",
  description: "明日方舟一图流，排班生成器，基建排班",
};
</script>
