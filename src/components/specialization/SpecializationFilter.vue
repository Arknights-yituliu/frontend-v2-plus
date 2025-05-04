<script setup>
import {computed, defineEmits, defineProps} from 'vue';
import {Search} from '@element-plus/icons-vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  options: {
    type: Object,
    required: true
  },
  countText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:filters', 'reset', 'filter-change']);

// 处理重置按钮点击
const handleReset = () => {
  Object.keys(props.filters).forEach(key => {
    props.filters[key] = '';
  });
  emit('update:filters', {...props.filters});
  emit('reset');
};

// 处理过滤器变化
const handleFilterChange = () => {
  emit('update:filters', props.filters);
  emit('filter-change');
};
</script>

<template>
  <div class="filter-container">
    <div class="filter-options flex flex-wrap">
      <!-- 数据计数 -->
      <div class="w-full">
        {{ countText }}
      </div>

      <!-- 职业选择 -->
      <div class="filter-group">
        <span class="filter-label">职业：</span>
        <el-select
            v-model="filters.profession"
            clearable
            placeholder="选择职业"
            @change="handleFilterChange"
        >
          <el-option
              v-for="profession in options.professions"
              :key="profession"
              :label="profession"
              :value="profession === '全部' ? '' : profession"
          />
        </el-select>
      </div>

      <!-- 分支选择 -->
      <div class="filter-group">
        <span class="filter-label">分支：</span>
        <el-select
            v-model="filters.branch"
            clearable
            placeholder="选择分支"
            @change="handleFilterChange"
        >
          <el-option
              v-for="branch in options.branches"
              :key="branch"
              :label="branch"
              :value="branch === '全部' ? '' : branch"
          />
        </el-select>
      </div>

      <!-- 专精阶段选择 -->
      <div class="filter-group">
        <span class="filter-label">专精：</span>
        <el-select
            v-model="filters.masteryLevel"
            clearable
            placeholder="选择专精阶段"
            @change="handleFilterChange"
        >
          <el-option
              v-for="level in options.masteryLevels"
              :key="level"
              :label="level"
              :value="level === '全部' ? '' : level"
          />
        </el-select>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
            v-model="filters.searchTerm"
            clearable
            placeholder="搜索干员或技能名称"
            @input="handleFilterChange"
        >
          <template #prefix>
            <el-icon>
              <Search/>
            </el-icon>
          </template>
        </el-input>
      </div>

      <!-- 重置按钮 -->
      <el-button type="primary" @click="handleReset">重置筛选</el-button>
    </div>
  </div>
</template>

<style scoped>
.filter-container {
  background-color: var(--c-page-background-color);
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  white-space: nowrap;
  min-width: 200px;
}

.filter-label {
  font-weight: 600;
  margin-right: 8px;
  color: var(--c-text-color);
  background-color: var(--c-card-background-color);
  padding: 2px 8px;
  border-radius: 4px;
}

.search-box {
  flex-grow: 1;
  min-width: 200px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .filter-options {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group, .search-box {
    width: 100%;
    margin-bottom: 10px;
  }
}

/* Dark theme enhancements */
:global(.theme-dark) .filter-container {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .filter-label {
  background-color: var(--c-card-background-color, #333);
}
</style> 