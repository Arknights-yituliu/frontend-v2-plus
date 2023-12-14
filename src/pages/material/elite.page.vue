<template>
  <div class="elite-page">
    <!-- 标题区域 -->
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">五星六星精二性价比</div>
        <div :class="opETextTheme">Elite Efficiency</div>
      </div>
    </div>
    <!-- 标题区域end -->
    <!-- 内容区域 -->
    <div class="option">
      <el-checkbox-group v-model="rarityCheckList" size="large" @change="reset">
        <el-checkbox-button v-for="item in 6" :key="item" :label="item">★{{ item }}</el-checkbox-button>
      </el-checkbox-group>
      <div class="right">
        <el-input v-model="searchKey" placeholder="干员名称" @input="reset"></el-input>
        <el-cascader
          v-model="professionCheckList"
          :options="professionDictJSON"
          @change="reset"
          placeholder="选择干员子职业"
          clearable
        />
      </div>
    </div>
    <div class="table-container">
      <el-auto-resizer>
        <template #default="{ height }">
          <el-table
            :data="tableData"
            :height="height"
            stripe
            highlight-current-row
            :row-class-name="rowClassName"
            v-loadmore="load"
          >
            <el-table-column type="expand">
              <template v-slot="{ row }">
                <div class="detail">
                  <div class="row" v-for="num in row.eliteFormat.length" :key="num">
                    <p>精{{num}}所需材料</p>
                    <div
                      v-for="(item, index) in row.eliteFormat[num - 1]"
                      :key="index"
                      class="store_sprite_perm_wrap"
                    >
                      <div :class="getSpriteImg(item.itemId, 'perm')"></div>
                      <span class="num">{{ item.num }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="序号" width="60">
              <template v-slot="{ $index }">
                <p>{{ $index + 1 }}</p>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="干员代号" />
            <el-table-column prop="cost" label="材料开销" sortable />
            <el-table-column prop="professionName" label="职业" sortable />
            <el-table-column prop="subProfessionName" label="分支" sortable />
            <el-table-column prop="itemObtainApproach" label="获取方式" sortable />
            <!-- <el-table-column prop="name" label="钱书开销" /> -->
            <!-- <el-table-column prop="name" label="总消耗" /> -->
            <!-- <el-table-column prop="name" label="折合源石" /> -->
            <!-- <el-table-column prop="name" label="礼包源石" /> -->
            <!-- <el-table-column prop="name" label="总源石" /> -->
            <!-- <el-table-column prop="name" label="性价比(相对648)" /> -->
          </el-table>
        </template>
      </el-auto-resizer>
    </div>
    <!-- 内容区域End -->
  </div>
</template>

<script setup>
import { onMounted, ref, computed, h } from "vue";
import { usePageContext } from "/src/renderer/usePageContext";

// 自定义指令
const vLoadmore = {
  mounted: (el, binding) => {
    const selectWrap = el.querySelector(".el-scrollbar__wrap");
    selectWrap.addEventListener("scroll", (e) => {
      const { scrollHeight, scrollTop, clientHeight } = selectWrap;
      if (scrollHeight - scrollTop - 200 <= clientHeight) {
        binding.value();
      }
    });
  },
};

const pageContext = usePageContext();
console.log(`pageContext.pageProps`, pageContext.pageProps);

const opETextTheme = ref("op_title_etext_light"); // 主题颜色
const agentList = pageContext.pageProps.agentList; // 干员列表
const rarityCheckList = ref([]); // 当前已选择的干员星级列表
const searchKey = ref(""); // 搜索关键词
const professionDictJSON = pageContext.pageProps.professionDictJSON; // 职业字典
const professionCheckList = ref([]); // 已选择的职业列表, 初始化全选

let current = 0;
const size = 50;

const filterTableData = computed(() => {
  // 筛选后表格数据
  let data = agentList.filter((data) => {
    if (!data.name.includes(searchKey.value)) return false; // 干员名称搜索
    if (rarityCheckList.value.length && !rarityCheckList.value.includes(data.rarity)) return false; // 干员星级搜索
    if (!professionCheckList.value?.length) return true; // 干员子职业搜索: 没选就默认返回所有职业的干员
    return professionCheckList.value.includes(data.subProfessionId);
  });
  for (let i = 0; i < data.length; i++) data[i].index = i + 1;
  return data;
});

const tableData = ref([]);

// 材料图标
function getSpriteImg(id, type) {
  return type === "icon" ? `bg-${id}_icon sprite_store_icon` : `bg-${id} store_sprite_${type}`;
}

function rowClassName({ row }) {
  if (row.rarity < 3) return "hide-expand";
  return "";
}

// 重置表格数据
function reset() {
  current = 0;
  load();
}

// 懒加载表格数据
function load() {
  const total = filterTableData.value.length;
  if (current === 0) return (tableData.value = filterTableData.value.slice(current * size, ++current * size));
  if (current * size >= total) return;
  tableData.value = tableData.value.concat(filterTableData.value.slice(current * size, ++current * size));
}

onMounted(() => {
  load();
});
</script>

<style lang="scss">
.elite-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 68px);

  p {
    margin: 0;
  }

  .op_title {
    margin-bottom: 10px;
  }
  .option {
    display: flex;
    align-items: center;
    margin-left: 10px;
    flex-wrap: wrap;
    .el-checkbox-group {
      margin-bottom: 10px;
      margin-right: 10px;
      .el-checkbox-button {
        &.is-focus .el-checkbox-button__inner {
          border-color: var(--el-checkbox-button-checked-border-color);
        }
        &:first-child .el-checkbox-button__inner {
          border-left: var(--el-border);
        }
        .el-checkbox-button__inner {
          border-left-style: solid;
          border-left-color: transparent;
          border-left-width: 1px;
        }
      }
    }
    .right {
      margin-bottom: 10px;
      .el-input {
        width: 200px;
        margin-right: 10px;
      }
    }
  }
  .table-container {
    flex: 1;
    box-sizing: border-box;
    .el-table {
      box-shadow: var(--el-box-shadow-light);
      .detail {
        padding-left: 60px;
        .row {
          display: flex;
          align-items: center;
          .num {
            position: absolute;
            right: -7px;
            bottom: 0;
            font-size: 18px;
            font-weight: bold;
            color: #000;
            text-shadow: -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, -2px -2px 4px #ffffff, 2px -2px 4px #ffffff,
              -2px 2px 4px #ffffff, 2px 2px 4px #ffffff;
          }
        }
      }
      .hide-expand .el-table__expand-column .el-table__expand-icon {
        display: none;
      }
    }

    .column-header-container {
      display: flex;
      .column-title {
        margin-right: 4px;
      }
    }
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .el-cascader-menu__wrap.el-scrollbar__wrap {
    height: 285px;
  }
}
</style>