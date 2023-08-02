<script setup>
const props = defineProps(["data"]);
</script>

<template>
  <div class="mdui-container-fluid">
    <div class="mdui-container mdui-valign">
      <div class="mdui-row-xs-2 mdui-row-md-3 mdui-row-lg-4">
        <div class="mdui-col mdui-p-y-1" v-for="d in data">
          <a :href="d.link">
            <div class="mdui-shadow-2 mdui-text-center mdui-ripple mdui-p-y-5 navi-card" :href="d.link">
              <img class="mdui-center icon mdui-m-b-5" :src="d.icon" />
              <div class="title mdui-shadow-1 mdui-p-y-2 mdui-m-t-5 mdui-m-b-2">{{ d.title }}</div>
              <div class="desc mdui-m-x-3" v-for="i in d.desc">{{ i }}</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.light {
  --bg: #f5f5f5;
  --card-bg: white;
  --fg: rgba(0, 0, 0, 0.87);
  --title-bg: #e0e0e0;
}

.dark {
  --bg: #303030;
  --card-bg: #424242;
  --fg: white;
  --title-bg: #616161;
}

.mdui-container-fluid {
  background-color: var(--bg);
}

.mdui-container {
  min-height: calc(100vh - 50px);
  justify-content: center;
}

@media screen and (max-width: 1080px) {
  .mdui-container {
    min-height: calc(100vh - 74px);
  }
}

a {
  color: var(--fg);
  text-decoration: none;
}

.navi-card {
  background-color: var(--card-bg);
  height: 300px;
  min-width: 220px;

  img {
    height: 100px;
  }

  .title {
    font-size: 28px;
    font-weight: bold;
    background-color: var(--title-bg);
    position: relative;
    opacity: 0.8;
  }

  .desc {
    font-size: 14px;
    line-height: 24px;
    white-space: nowrap;
  }

  border-radius: 4px;

  .icon {
    transform: scale(1.8) translateY(30px);
    opacity: 0.5;
    position: relative;
  }
}
</style>
