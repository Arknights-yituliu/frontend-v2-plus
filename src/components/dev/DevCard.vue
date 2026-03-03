<script setup>

const props = defineProps(["modelValue", 'data']);

// const data = {
//   avatar: "/image/website/GitHub.webp",
//   title: "前端仓库",
//   description: "这是一个测试描述",
//   tags: ['标签1', '标签2', '标签3']
// }

function openNewPage(url) {
  window.open(url)
}

</script>

<template>
  <v-card 
    class="developer-card" 
    @click="openNewPage(props.data.url)"
    hover
    elevation="2"
  >
    <v-card-item>
      <div class="card-content">
        <v-avatar size="64" class="developer-avatar">
          <img :src="props.data.avatar" alt="" style="object-fit: cover; height: 100%;"/>
        </v-avatar>
        <div class="card-info">
          <v-card-title class="card-title">{{ props.data.title }}</v-card-title>
          <v-card-subtitle class="card-subtitle">{{ props.data.description }}</v-card-subtitle>
        </div>
      </div>
    </v-card-item>
    <v-card-text v-if="props.data.tags && props.data.tags.length > 0" class="card-tags">
      <v-chip 
        v-for="(tag,index) in props.data.tags" 
        :key="index"
        size="small"
        color="primary"
        variant="tonal"
        class="tag-chip"
      >
        {{ tag }}
      </v-chip>
    </v-card-text>
  </v-card>

</template>

<style scoped>
.developer-card {
  width: 320px;
  margin: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  border-radius: 12px !important;
}

.developer-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.developer-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  padding: 4px 0;
  line-height: 1.3;
}

.card-subtitle {
  font-size: 0.875rem;
  opacity: 0.8;
  padding: 0;
  margin-top: 4px;
}

.card-tags {
  padding-top: 8px;
}

.tag-chip {
  margin: 4px 6px 4px 0;
  font-weight: 500;
}
</style>