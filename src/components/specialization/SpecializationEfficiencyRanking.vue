<script setup>
import {computed, onMounted, ref} from "vue";
import maxEfficiency from "@/static/json/build/maximum_efficiency.json";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import SpecializationFilter from "@/components/specialization/SpecializationFilter.vue";
import {calculateEfficiency, getEfficiencyExplanation} from "@/utils/specializationEfficiencyCalculator";

const operatorData = ref([]);
const isLoading = ref(true);
const sortedOperators = ref([]);

// 过滤条件
const filters = ref({
  profession: "",
  branch: "",
  masteryLevel: "",
  searchTerm: "",
});

// 干员职业列表
const professions = ref([
  "全部",
  "近卫",
  "狙击",
  "术师",
  "医疗",
  "重装",
  "辅助",
  "特种",
  "先锋",
  "通用",
]);

// 分支列表 - 只显示有特殊加成的分支
const branches = ref([
  "全部",
  "攻城手",
  "速射手",
  "链愈师",
  "行医",
  "领主",
  "斗士",
  "驭法铁卫",
]);

// 专精阶段列表
const masteryLevels = ref([
  "全部",
  "专精一",
  "专精二",
  "专精三",
]);

// 为SpecializationFilter提供选项
const filterOptions = computed(() => {
  return {
    professions: professions.value,
    branches: branches.value,
    masteryLevels: masteryLevels.value
  };
});

// 加载干员数据并计算实际效率
onMounted(async () => {
  try {
    // 深拷贝原始数据并为每个干员计算实际效率
    operatorData.value = JSON.parse(JSON.stringify(maxEfficiency)).map(operator => {
      const actualEfficiency = calculateEfficiency(operator);
      return {
        ...operator,
        actual_efficiency: actualEfficiency,
        efficiency_explanation: getEfficiencyExplanation(operator)
      };
    });

    sortOperatorsByEfficiency();
  } catch (error) {
    console.error("计算效率时发生错误:", error);
  } finally {
    isLoading.value = false;
  }
});

// 根据效率排序干员
const sortOperatorsByEfficiency = () => {
  if (!operatorData.value || operatorData.value.length === 0) {
    sortedOperators.value = [];
    return;
  }

  const filtered = operatorData.value.filter(operator => {
    // 职业筛选
    if (filters.value.profession && filters.value.profession !== "全部") {
      // 处理多职业干员，如"近卫/狙击"
      if (!operator.profession.includes(filters.value.profession)) {
        return false;
      }
    }

    // 分支筛选
    if (filters.value.branch && filters.value.branch !== "全部") {
      const branch = operator.conditions.branch;
      if (!branch || branch !== filters.value.branch) {
        return false;
      }
    }

    // 专精阶段筛选
    if (filters.value.masteryLevel && filters.value.masteryLevel !== "全部") {
      const masteryLevel = operator.conditions.mastery_level;
      const level = filters.value.masteryLevel === "专精一" ? 1 :
          filters.value.masteryLevel === "专精二" ? 2 :
              filters.value.masteryLevel === "专精三" ? 3 : null;

      if (!masteryLevel || masteryLevel !== level) {
        return false;
      }
    }

    // 搜索筛选
    if (filters.value.searchTerm) {
      const term = filters.value.searchTerm.toLowerCase();
      return operator.name.toLowerCase().includes(term) ||
          (operator.conditions.skill_name && operator.conditions.skill_name.toLowerCase().includes(term));
    }

    return true;
  });

  // 根据实际效率降序排序
  sortedOperators.value = filtered.sort((a, b) => b.actual_efficiency - a.actual_efficiency);
  
  // 计算每个干员的排名，相同效率的干员排名相同
  let currentRank = 1;
  let previousEfficiency = null;
  let skipCount = 0;

  sortedOperators.value.forEach((operator, index) => {
    if (index === 0) {
      // 第一个干员的排名始终为1
      operator.rank = currentRank;
      previousEfficiency = operator.actual_efficiency;
    } else {
      // 如果当前干员的效率与前一个干员相同，则排名保持不变
      if (operator.actual_efficiency === previousEfficiency) {
        operator.rank = currentRank;
        skipCount++;
      } else {
        // 如果效率不同，排名为当前索引加1
        currentRank = currentRank + skipCount + 1;
        operator.rank = currentRank;
        skipCount = 0;
        previousEfficiency = operator.actual_efficiency;
      }
    }
  });
};

// 监听过滤器变化
const handleFilterChange = () => {
  sortOperatorsByEfficiency();
};

// 重置过滤条件
const resetFilters = () => {
  filters.value = {
    profession: "",
    branch: "",
    masteryLevel: "",
    searchTerm: "",
  };
  sortOperatorsByEfficiency();
};

// 获取专精等级描述
const getMasteryLevelText = (operator) => {
  if (!operator.conditions.mastery_level) return "所有阶段";
  return `专精${operator.conditions.mastery_level}`;
};

// 根据纸面效率获取颜色样式
const getEfficiencyColorClass = (efficiency) => {
  if (efficiency >= 0.9) return "text-red-500 font-bold";
  if (efficiency >= 0.7) return "text-orange-500 font-bold";
  if (efficiency >= 0.5) return "text-green-500";
  if (efficiency >= 0.3) return "text-blue-500";
  return "text-gray-500";
};

// 格式化效率显示
const formatEfficiency = (value) => {
  return `${(value * 100).toFixed(0)}%`;
};

// 计算有多少条数据
const totalCount = computed(() => {
  return sortedOperators.value.length;
});

// 获取显示的数据总数文本
const countText = computed(() => {
  if (isLoading.value) return '';
  return `共 ${totalCount.value} 条数据`;
});

// 获取特殊效果文本和类型
const getSpecialEffectInfo = (operator) => {
  if (operator.name === "左乐" && operator.conditions.time_effect) {
    return {
      tag: "立即完成",
      type: "success",
      tooltip: operator.conditions.time_effect
    };
  } else if (operator.conditions.time_effect) {
    return {
      tag: "减半效果",
      type: "danger",
      tooltip: operator.conditions.time_effect
    };
  } else if (operator.conditions.special) {
    return {
      tag: "特殊效果",
      type: "success",
      tooltip: operator.conditions.special
    };
  }
  return {
    tag: "无",
    type: "",
    tooltip: ""
  };
};
</script>

<template>
  <div class="ranking-container">
    <!-- 筛选栏 -->
    <SpecializationFilter
        v-model:filters="filters"
        :count-text="countText"
        :options="filterOptions"
        @reset="resetFilters"
        @filter-change="handleFilterChange"
    />

    <!-- 数据表格 -->
    <div class="operator-ranking">
      <el-empty v-if="!isLoading && sortedOperators.length === 0" description="没有找到符合条件的数据"/>

      <el-table
          v-else
          v-loading="isLoading"
          :data="sortedOperators"
          max-height="600"
          stripe
      >
        <el-table-column label="排名" width="70">
          <template #default="scope">
            {{ scope.row.rank }}
          </template>
        </el-table-column>

        <!-- 干员头像和名称 -->
        <el-table-column fixed="left" label="干员" width="170">
          <template #default="scope">
            <div class="flex align-center">
              <OperatorAvatar v-if="scope.row.charId" :char-id="scope.row.charId" :size="50" rounded/>
              <span class="ml-2">{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 效率生效职业 -->
        <el-table-column label="效率生效职业" width="120">
          <template #default="scope">
            <span v-if="scope.row.conditions.target_profession">
              {{
                Array.isArray(scope.row.conditions.target_profession)
                    ? scope.row.conditions.target_profession.join('、')
                    : scope.row.conditions.target_profession
              }}
            </span>
            <span v-else>通用</span>
          </template>
        </el-table-column>

        <!-- 效率加成职业 -->
        <el-table-column label="效率加成职业" prop="profession" width="130"/>

        <!-- 纸面效率 -->
        <el-table-column label="纸面效率" width="100">
          <template #default="scope">
            <span :class="getEfficiencyColorClass(scope.row.max_efficiency)">
              {{ formatEfficiency(scope.row.max_efficiency) }}
            </span>
          </template>
        </el-table-column>

        <!-- 实际效率 -->
        <el-table-column label="实际效率" width="100">
          <template #default="scope">
            <el-tooltip
                :content="scope.row.efficiency_explanation"
                :show-after="200"
                effect="light"
                placement="top"
            >
              <span :class="getEfficiencyColorClass(scope.row.actual_efficiency)">
                {{ formatEfficiency(scope.row.actual_efficiency) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 专精阶段要求 -->
        <el-table-column label="专精阶段要求" width="120">
          <template #default="scope">
            {{ getMasteryLevelText(scope.row) }}
          </template>
        </el-table-column>

        <!-- 子分支要求 -->
        <el-table-column label="子分支要求" width="100">
          <template #default="scope">
            {{ scope.row.conditions.branch || '无' }}
          </template>
        </el-table-column>

        <!-- 技能名称 -->
        <el-table-column label="技能名称" width="150">
          <template #default="scope">
            <el-tooltip :content="scope.row.skill_name" :show-after="500" placement="top">
              <span>{{ scope.row.conditions.skill_name || '无特殊描述' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 特殊效果 -->
        <el-table-column label="特殊效果" width="120">
          <template #default="scope">
            <el-tooltip
                v-if="getSpecialEffectInfo(scope.row).tooltip"
                :content="getSpecialEffectInfo(scope.row).tooltip"
                :show-after="500"
                placement="top"
            >
              <el-tag :type="getSpecialEffectInfo(scope.row).type" size="small">
                {{ getSpecialEffectInfo(scope.row).tag }}
              </el-tag>
            </el-tooltip>
            <span v-else>无</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.ranking-container {
  padding: 15px;
}

.operator-ranking {
  background-color: var(--c-page-background-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

:deep(.el-table .cell) {
  white-space: nowrap;
}

:global(.theme-dark) .operator-ranking {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style> 