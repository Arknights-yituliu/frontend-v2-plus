<template>
  <v-container>
    <v-row dense>
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        v-for="(card, index) in cards"
        :key="index"
      >
        <v-card class="pa-4 mb-4" outlined style="height: 300px;">
          <!-- 标题和复制按钮 -->
          <v-row align="center" justify="space-between">
            <v-col cols="auto">
              <h4 class="mb-0">{{ card.title }}</h4>
            </v-col>
            <v-col cols="auto">
              <v-btn text color="primary" @click="copyTitle(card.title)">
                复制
              </v-btn>
            </v-col>
          </v-row>

          <!-- 标签区域 -->
          <v-row class="mb-4" dense>
            <v-chip
              v-for="(tag, tagIndex) in card.tags"
              :key="tagIndex"
              color="primary"
              class="ma-1"
              outlined
            >
              {{ tag }}
            </v-chip>
          </v-row>

          <!-- 描述区域 -->
          <div class="mb-4 description">
            {{ card.description }}
          </div>

          <!-- 评分模块 -->
          <v-row align="center" justify="space-between">
            <v-col cols="auto">
              <h5>评分：</h5>
            </v-col>
            <v-col cols="auto">
              <v-rating
                v-model="card.rating"
                length="5"
                color="yellow"
                background-color="grey"
                half-increments
              ></v-rating>
            </v-col>
            <v-col cols="auto">
              <p class="mb-0">{{ card.rating }}/5</p>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-container>

    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card outlined>
          <v-card-title>这里是种是种是种是种是种是种是种子</v-card-title>
          <v-card-subtitle>得分: 95</v-card-subtitle>
          <v-card-text>
            <p>难度: 高</p>
            <p>版本: 1.0.1</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="success" text>查看详情</v-btn>
            <v-btn color="primary" text>收藏</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card outlined>
          <v-card-title>种子名称: 胡种示例2</v-card-title>
          <v-card-subtitle>得分: 89</v-card-subtitle>
          <v-card-text>
            <p>难度: 中</p>
            <p>版本: 1.2.0</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="success" text>查看详情</v-btn>
            <v-btn color="primary" text>收藏</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "HuZhongBang",
  data() {
    return {
      cards: [
        {
          title: "U1eIA1I29844Ae925i,rogue_4,11",
          description: "这是第一个示例卡片，包含标题、描述、标签、评分和复制功能。",
          tags: ["胡种", "近锋", "114514分"],
          rating: 0,
        },
        {
          title: "U1eIA1I29844Ae925i,rogue_4,",
          description: "这是第二个示例卡片，包含标题、描述、标签、评、标签、评分和复制功能。",
          tags: ["胡种", "近锋", "114514分"],
          rating: 0,
        },
        // 添加更多卡片
      ],
    };
  },
  methods: {
    copyTitle() {
      navigator.clipboard.writeText(this.title).then(() => {
        this.$emit("snackbar", "标题已复制到剪贴板！"); // 可触发通知
      });
    },
  },
};

</script>

<style scoped>
/* 固定卡片内容高度，描述多行文本截断 */
.v-card {
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}
.description {
  height: 60px; /* 固定高度 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* 限制显示行数 */
  -webkit-box-orient: vertical;
}
</style>