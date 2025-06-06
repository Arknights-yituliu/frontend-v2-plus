<script setup>
import { ref } from 'vue';
import { rarityList } from '../js/baseData' // 干员星级列表
import {
  operatorMaterialMap, // 干员精英化、专精技能消耗材料映射
  professionMap, // 主职业映射
  chipsTypeMap, // 芯片映射
  materialTypeMap, // 精英材料映射
  operatorRarityBaseMaterialMap, // 干员养成所需固定材料映射
  professionDictJSON, // 职业字典JSON
  LMDId, // 龙门币ID
} from '../js/maps'
import {
  operatorList, // 干员列表
  insertOperatorData, initOperatorData
} from '../js/formatOperatorData'
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { ElNotification } from 'element-plus'

const props = defineProps({
  modelValue: Boolean,
})

const emits = defineEmits(['update:modelValue', 'reset'])

// 新建自定义干员信息对象
const newOperatorInfo = ref({
  elite: [],
  skills: [],
  mods: [],
})

// 通过芯片名字获取芯片ID
const getChipByName = (professionName, type) => {
  const chipList = chipsTypeMap.get(type)
  return chipList.find(item => item.itemName.includes(professionName))
}

// 获取芯片名字
const getChipId = (profession, rarity, rank) => {
  const professionName = professionMap.get(profession)
  if (rank === 1) return getChipByName(professionName, 'blue').itemId
  else if (rarity === 4) return getChipByName(professionName, 'purple').itemId
  return getChipByName(professionName, 'orange').itemId
}

// 获取新建干员基础材料
const getNewCharBaseMaterial = () => {
  const {rarity, profession} = newOperatorInfo.value
  if (!rarity || !profession) return
  // 获取当前星级的干员精英化/专精技能/开启模组时固定消耗的材料数据
  const operatorBaseMaterial = operatorRarityBaseMaterialMap.get(rarity)
  const { elite, skill, mod } = operatorBaseMaterial

  const formatMaterials = (materials, rankList, getTitle, titleIndex) => {
    rankList.forEach((rankMaterial, rankIndex) => {
      const rank = rankIndex + 1;
      const title = getTitle(rank, titleIndex);
      const materialList = []
      let LMDQuantity = 0 // 龙门币数量
      rankMaterial.fixedMaterialList.forEach(item => {
        if (!item) return
        const { itemId, quantity } = item
        if (itemId === LMDId) LMDQuantity = quantity // 龙门币位置不对, 在下面单独插入
        else materialList.push({
          itemId: itemId || getChipId(profession, rarity, rank), // 芯片无固定ID, 要根据干员职业、星级和精英化等级获取
          quantity
        })
      })
      if (LMDQuantity) {
        materialList.unshift({
          itemId: LMDId,
          quantity: LMDQuantity,
        })
      }
      const materialDicList = rankMaterial.selectMaterialTypes.map(type => JSON.parse(JSON.stringify(materialTypeMap.get(type))));
      console.log('materialDicList', materialDicList)
      materials.push({
        title,
        materialList,
        materialDicList,
        selectList: materialDicList.map(() => ({
          // itemId: '30155', // 测试用
          // quantity: 4
        }))
      });
    });
  }
  // 处理精英化材料
  const getEliteTitle = (rank) => `精${rank}材料`
  newOperatorInfo.value.elite = []
  formatMaterials(newOperatorInfo.value.elite, elite, getEliteTitle)
  // 处理技能材料
  const getSkillTitle = (rank, skillIndex) => `${skillIndex + 1}技能：专${rank}`
  const skillsCount = rarity < 6 ? 2 : 3;
  newOperatorInfo.value.skills = []
  for (let skillIndex = 0; skillIndex < skillsCount; skillIndex++) {
    const arr = []
    formatMaterials(arr, skill, getSkillTitle, skillIndex)
    newOperatorInfo.value.skills.push(arr)
  }
  // 处理模组材料
  const getModTitle = (rank) => `伴生模组：${rank}级`
  newOperatorInfo.value.mods = []
  formatMaterials(newOperatorInfo.value.mods, mod, getModTitle)
}
// 格式化干员材料
const formatOperatorMaterial = (materialList) => {
  return materialList.map(item => {
    const obj = {};
    const allMaterials = [...item.materialList, ...item.selectList];
    allMaterials.forEach(t => {
      obj[t.itemId] = t.quantity;
    });
    return obj;
  });
}
const disabledItem = (itemId, dicIndex, dicList) => {
  const otherDic = dicIndex === 0 ? dicList[1] : dicList[0]
  otherDic.forEach(item => {
    if (item.itemId === itemId) item.disabled = true
    else item.disabled = false
  })
}
// 校验材料是否全填了
const validate = async (obj) => {
  for (const [_, item] of Object.entries(obj)) {
    if (Array.isArray(item)) { // item: elite, skills, mods
      const flattenedSelectLists = item.flatMap(rank => {
        // rank: elite: [rank1, rank2]
        //       skills: [skill1, skill2, skill3]
        //       mods: [Xmod, Ymod]
        return Array.isArray(rank) ? rank.flatMap(j => j.selectList) : rank.selectList;
      })
      
      for (const selectItem of flattenedSelectLists) { // selectItem: { itemId, quantity }
        if (!selectItem.hasOwnProperty('itemId') || !selectItem.quantity) {
          ElNotification({
            title: '提示',
            message: '材料没填满',
            type: 'warning',
          })
          return false
        }
      }
    }
  }
  return true
}
// 新增干员
const addNewOperator = async () => {
  // if (!await validate(newOperatorInfo.value)) return
  const { elite, skills, name, mods } = newOperatorInfo.value
  const newCharId = `char_${operatorList.value.length}_custom` // 自定义干员ID
  const operatorMaterial = {
    elite: formatOperatorMaterial(elite),
    skills: skills.map(item => formatOperatorMaterial(item))
  }
  operatorMaterialMap.set(newCharId, operatorMaterial) // 添加干员材料
  const operatorName = name || `第${ operatorList.value.length + 1 }位干员` // 自定义干员代号
  const skill = skills.map((_, index) => ({ name: `${index + 1}技能` })) // 自定义技能信息
  const charInfo = {
    ...newOperatorInfo.value,
    name: `${operatorName} (自定义)`,
    skill,
    equip: [{
      charId: newCharId,
      typeName2: '伴生模组',
      itemCost: formatOperatorMaterial(mods)
    }]
  }
  insertOperatorData(newCharId, charInfo) // 插入自定义干员数据
  initOperatorData() // 重新初始化干员数据(排名, 消耗等)
  emits('reset')
  emits('update:modelValue', false)
}

</script>

<template>
  <el-dialog class="create-dialog" :model-value="modelValue" title="自定义干员材料" @closed="emits('update:modelValue', false)">
    <div class="row">
      <label>干员代号：</label>
      <el-input class="operator-name" v-model="newOperatorInfo.name" :placeholder="`第${ operatorList.length + 1 }位干员 (自定义)`" maxlength="10"/>
    </div>
    <div class="row">
      <label>星级：</label> 
      <el-radio-group v-model="newOperatorInfo.rarity" @change="getNewCharBaseMaterial" size="large">
        <el-radio-button v-for="(item, index) in rarityList.filter(item => item.value >= 4)" :key="index" :value="item.value">{{ item.label }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="row">
      <label>职业：</label> 
      <el-radio-group v-model="newOperatorInfo.profession" @change="getNewCharBaseMaterial" size="large">
        <el-radio-button v-for="(item, index) in professionDictJSON" :key="index" :value="item.value">{{ item.label }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="material-list" v-if="newOperatorInfo.rarity && newOperatorInfo.profession">
      <div class="row" v-for="(item, index) in [...newOperatorInfo.elite, ...newOperatorInfo.skills.flat(), ...newOperatorInfo.mods]" :key="index">
        <label>{{ item.title }}</label>
        <div class="fixed-material">
          <div class="material-item" v-for="(t, i) in item.materialList" :key="i">
            <ItemImage :item-id="t.itemId" :size="50"></ItemImage>
            <span class="num">{{ t.quantity }}</span>
          </div>
        </div>
        <div class="select-material" v-for="(dic, dicIndex) in item.materialDicList" :key="dicIndex">
          <el-select v-model="item.selectList[dicIndex].itemId" filterable popper-class="material-popper" placeholder="材料" @change="disabledItem($event, dicIndex, item.materialDicList)">
            <template #prefix>
              <ItemImage :item-id="item.selectList[dicIndex].itemId"></ItemImage>
            </template>
            <el-option v-for="t in dic" :key="t.itemId" :value="t.itemId" :label="t.itemName" :disabled="t.disabled">
              <ItemImage :item-id="t.itemId"></ItemImage>
              <p>{{t.itemName}}</p>
            </el-option>
          </el-select>
          <span>×</span>
          <el-input class="num-input" v-model="item.selectList[dicIndex].quantity" placeholder="数量" maxlength="2"/>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="emits('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="addNewOperator" :disabled="!newOperatorInfo.rarity || !newOperatorInfo.profession">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss">
@import "../style.scss";

.create-dialog {
  min-width: 932px;
  .row {
    margin-top: 10px;
    display: flex;
    align-items: center;
    > label {
      width: 100px;
      flex-shrink: 0;
    }
    > .operator-name {
      width: 175px !important;
      .el-input__wrapper {
        width: 175px;
        box-sizing: border-box;
      }
    }
  }
  .material-list {
    .row {
      padding-left: 0px;
      .fixed-material {
        width: 210px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-shrink: 0;
      }
      
      .select-material {
        display: flex;
        align-items: center;
        width: 280px;
        .el-select {
          margin-left: 10px;
          width: 180px;
          flex: 1;
          .el-select__wrapper {
            position: relative;
            padding-right: 5px;
            height: 56px;
            .store_sprite_perm {
              top: -63px;
              left: -63px;
            }
          }
        }
        span {
          padding: 10px;
        }
        .num-input {
          width: 50px;
          .el-input__wrapper {
            height: 56px;
            box-shadow: none;
            border-bottom: 1px solid var(--el-border-color);
            border-radius: 0;
            width: 50px;
          }
        }
      }
    }
  }
  .el-button--primary {
    color: white;
  }
}

.material-popper {
  .el-select-dropdown {
    .el-select-dropdown__item {
      height: 56px;
      position: relative;
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-right: 0;
      p {
        padding-left: 10px;
      }
    }
  }
}
</style>