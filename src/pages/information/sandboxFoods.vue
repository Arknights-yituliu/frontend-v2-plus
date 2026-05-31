<script setup>
import sandbox_foods_v2 from '/src/static/json/build/sandbox_foods_v2.json'
import {computed, ref} from "vue";

// 主题切换：sandbox_1 = 沙洲遗闻，sandbox_2 = 重启锚点
const selectedTopic = ref('sandbox_2')

const currentData = computed(() => sandbox_foods_v2[selectedTopic.value])

const foodMatNodeV2 = computed(() => currentData.value['foodMatData'])
const foodNodeV2 = computed(() => currentData.value['foodData'])
const currentRecipeNote = computed(() => currentData.value.recipeNote)

//食物/食材切换标识
const showWhat = ref("food")

//食材列表
const foodMatList = computed(() => {
  const list = []
  for (let e in foodMatNodeV2.value) {
    list.push({
      name: foodMatNodeV2.value[e].name,
      buffDesc: foodMatNodeV2.value[e].buffDesc,
      obtainApproach: foodMatNodeV2.value[e].obtainApproach
    })
  }
  return list
})

// 属性映射关系
const attributesMap = {
  '攻击': 'ATTACK',
  '生存': 'SURVIVE',
  '技力': 'SKILL_POINT',
  '费用': 'COST',
  '再部署': 'COOLDOWN',
  '特殊': 'SPECIAL',
};

// 激活条件数组
const requirements = ref([]);

// 切换激活状态
const toggleRequirement = (attribute) => {
  const index = requirements.value.indexOf(attribute);
  if (index === -1) {
    requirements.value.push(attribute);
  } else {
    requirements.value.splice(index, 1);
  }
};

// 筛选后的数据
const filteredFoodNodeV2 = computed(() => {
  return foodNodeV2.value.filter(item =>
      requirements.value.every(req => item.attributes.includes(req))
  )
})

const hasVariants = (food) => food.variants && food.variants.length > 0
const hasRecipes = (food) => food.recipes && food.recipes.length > 0

// 主题标签
const topicOptions = {
  sandbox_1: '沙洲遗闻',
  sandbox_2: '重启锚点',
}
</script>

<template>
  <!--主题切换-->
  <div class="screen-bar">
    <div>主题切换</div>
    <ul class="select-bar">
      <li
          v-for="(label, key) in topicOptions"
          :key="key"
          :class="{'active': selectedTopic === key}"
          @click="selectedTopic = key; requirements = []"
      >{{ label }}
      </li>
    </ul>
  </div>

  <!--食物/食材切换-->
  <div class="screen-bar">
    <div>信息切换</div>
    <ul class="select-bar">
      <li
          :class="{'active': showWhat==='food'}"
          @click="showWhat='food'"
      >食物
      </li>
      <li
          :class="{'active': showWhat==='foodMat'}"
          @click="showWhat='foodMat'"
      >食材
      </li>
    </ul>
  </div>

  <!--属性筛选-->
  <div v-if="showWhat==='food'" class="screen-bar">
    <div>属性筛选</div>
    <ul class="select-bar">
      <li
          v-for="(_, key) in attributesMap"
          :key="key"
          :class="{'active': requirements.includes(attributesMap[key])}"
          @click="toggleRequirement(attributesMap[key])"
      >
        {{ key }}
      </li>
    </ul>
  </div>

  <el-table
      v-if="showWhat==='food'"
      :data="filteredFoodNodeV2"
      table-layout="auto"
      :default-sort="{ prop: 'id', order: 'ascending' }"
  >
    <el-table-column type="expand">
      <template #default="props">
        <div class="props-container">
          <div v-if="hasVariants(props.row)">
            <el-table :data="props.row.variants" table-layout="auto">
              <el-table-column label="变体" prop="name"/>
              <el-table-column label="作用差分" prop="usage"/>
            </el-table>
          </div>
          <div v-if="hasRecipes(props.row)">
            <el-table :data="props.row.recipes">
              <el-table-column label="合成方式">
                <template #default="scope">
                  <div>
                    <span v-for="(mat,index) in scope.row.mats" :key="index">
                      <el-tooltip effect="light">
                        <template #content>
                          <div v-html="foodMatNodeV2[mat].buffDesc"></div>
                          <div v-html="foodMatNodeV2[mat].obtainApproach"></div>
                        </template>
                        <span>{{ foodMatNodeV2[mat].name }}</span>
                      </el-tooltip>

                      <span v-if="index!==scope.row.mats.length-1">
                        ，
                      </span>
                    </span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-if="props.row.unlock">
            <span class="detail-label">解锁条件：</span>{{ props.row.unlock }}
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="名称" prop="name" sortable/>
    <el-table-column label="用途" prop="usage" sortable/>
    <el-table-column label="持续时间" prop="duration" sortable/>
    <el-table-column label="解锁条件" prop="unlock" sortable/>
  </el-table>

  <div v-if="showWhat==='food' && currentRecipeNote" class="recipe-note">
    {{ currentRecipeNote }}
  </div>

  <el-table
      v-if="showWhat==='foodMat'"
      :data="foodMatList"
      table-layout="auto"
      :default-sort="{ prop: 'buffDesc', order: 'descending' }"
  >
    <el-table-column label="名称" prop="name"/>
    <el-table-column label="增益效果" prop="buffDesc" sortable/>
    <el-table-column label="获取方式" prop="obtainApproach" sortable>
      <template #default="scope">
        <div v-html="scope.row.obtainApproach"></div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.screen-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1em;
  padding-inline: 1em;

  > div:nth-of-type(1) {
    font-weight: bold;
  }

  .select-bar {
    padding: 0;
    margin: 0.5em;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;

    > li {
      list-style: none;
      transition: all 0.3s ease;
      padding: 0.5em;
      cursor: pointer;
      border-radius: 0.2em;
      border: 1px solid #c8c8c8;
      background-color: white;
      color: black;
    }

    > li.active {
      border: 1px solid black;
      background-color: black;
      color: white;
    }

    > li:hover {
      box-shadow: 0 0 5px grey;
    }
  }
}

.props-container {
  padding: 1em;
  background-color: #f3f3f3;

  > div + div {
    margin-top: 1em;
  }
}

.detail-label {
  font-weight: bold;
}

.recipe-note {
  margin: 1em;
  padding: 0.75em 1em;
  border-left: 4px solid #999;
  background-color: #f7f7f7;
  color: #555;
}
</style>
