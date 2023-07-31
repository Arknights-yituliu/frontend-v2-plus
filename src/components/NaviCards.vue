<script setup>
const props = defineProps(["data"]);
</script>

<template>
  <div class="mdui-container-fluid mdui-theme-layout-dark">
    <div class="mdui-container mdui-valign">
      <div class="mdui-row-xs-2 mdui-row-md-3 mdui-row-lg-4">
        <div class="mdui-col mdui-p-y-1" v-for="d in data">
          <a :href="d.link">
            <div class="mdui-shadow-2 mdui-text-center mdui-ripple mdui-p-x-3 mdui-p-y-5 navi-card" :href="d.link">
              <img class="mdui-center" :src="d.icon" />
              <div class="title mdui-m-t-4 mdui-m-b-2">{{ d.title }}</div>
              <div class="desc" v-for="i in d.desc">{{ i }}</div>
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
}

.dark {
  --bg: #303030;
  --card-bg: #424242;
  --fg: white;
}

.mdui-container-fluid {
  background-color: var(--bg);
}

.mdui-container {
  min-height: calc(100vh - 50px);
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

  img {
    height: 100px;
  }

  .title {
    font-size: 24px;
    font-weight: bold;
  }

  .desc {
    font-size: 18px;
    line-height: 32px;
  }
}
</style>
