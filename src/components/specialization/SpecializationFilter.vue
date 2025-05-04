<script setup>
import {computed, ref} from 'vue';

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

const localFilters = ref({...props.filters});

// Watch for filter changes and emit update events
const updateFilter = (key, value) => {
  localFilters.value[key] = value;
  emit('update:filters', {...localFilters.value});
  emit('filter-change');
};

// Reset all filters
const handleReset = () => {
  Object.keys(localFilters.value).forEach(key => {
    localFilters.value[key] = '';
  });
  emit('update:filters', {...localFilters.value});
  emit('reset');
};

// Check if filters are active
const hasActiveFilters = computed(() => {
  return Object.values(localFilters.value).some(val => val !== '');
});
</script>

<template>
  <div class="filter-container">
      <div class="filter-count">{{ countText }}</div>
      <!-- Search input -->
      <div class="filter-input">
        <div class="input-wrapper">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M15.5 15.5L19 19M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z"
                stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
          <input
              v-model="localFilters.searchTerm"
              placeholder="搜索干员名称或技能"
              type="text"
              @input="updateFilter('searchTerm', localFilters.searchTerm)"
          />
          <button
              v-if="localFilters.searchTerm"
              class="clear-button"
              @click="updateFilter('searchTerm', '')"
          >
            <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Select filters -->
      <div class="filter-selects">
        <!-- Profession filter -->
        <div class="select-wrapper">
          <select
              v-model="localFilters.profession"
              @change="updateFilter('profession', localFilters.profession)"
          >
            <option value="">选择职业</option>
            <option v-for="profession in options.professions" :key="profession" :value="profession">
              {{ profession }}
            </option>
          </select>
          <svg class="dropdown-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"/>
          </svg>
        </div>

        <!-- Branch filter -->
        <div class="select-wrapper">
          <select
              v-model="localFilters.branch"
              @change="updateFilter('branch', localFilters.branch)"
          >
            <option value="">选择分支</option>
            <option v-for="branch in options.branches" :key="branch" :value="branch">
              {{ branch }}
            </option>
          </select>
          <svg class="dropdown-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"/>
          </svg>
        </div>

        <!-- Mastery level filter -->
        <div class="select-wrapper">
          <select
              v-model="localFilters.masteryLevel"
              @change="updateFilter('masteryLevel', localFilters.masteryLevel)"
          >
            <option value="">选择专精阶段</option>
            <option v-for="level in options.masteryLevels" :key="level" :value="level">
              {{ level }}
            </option>
          </select>
          <svg class="dropdown-icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                  stroke-width="2"/>
          </svg>
        </div>
      </div>

      <!-- Reset button -->
      <div class="filter-actions">
        <button
            :class="{ 'active': hasActiveFilters }"
            class="reset-button"
            @click="handleReset"
        >
          重置筛选
        </button>
      </div>
  </div>
</template>

<style scoped>
.filter-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  background-color: var(--c-page-background-color);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 var(--c-box-shadow-color);
}

.filter-count {
  font-size: 14px;
  color: var(--c-text-tip-color);
}

.filter-input {
  width: 100%;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--c-text-tip-color);
}

input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  border-radius: 8px;
  border: 1px solid var(--c-border-color);
  background-color: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 14px;
  transition: all 0.2s ease;
}

input::placeholder {
  color: var(--c-text-tip-color);
}

input:focus {
  outline: none;
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.clear-button {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-tip-color);
}

.clear-button svg {
  width: 16px;
  height: 16px;
}

.filter-selects {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 10px;
}

@media (min-width: 640px) {
  .filter-selects {
    grid-template-columns: repeat(3, 1fr);
  }
}

.select-wrapper {
  position: relative;
}

select {
  width: 100%;
  padding: 10px 15px;
  appearance: none;
  border-radius: 8px;
  border: 1px solid var(--c-border-color);
  background-color: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

select:focus {
  outline: none;
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.dropdown-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--c-text-tip-color);
  pointer-events: none;
}

.filter-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 5px;
}

.reset-button {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--c-border-color);
  background-color: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button.active {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

.reset-button:hover {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

/* Dark theme enhancements */
:global(.theme-dark) .custom-filter-bar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) input,
:global(.theme-dark) select {
  background-color: var(--c-page-background-color-secondary);
}

:global(.theme-dark) .reset-button:not(.active) {
  background-color: var(--c-page-background-color-secondary);
}
</style> 