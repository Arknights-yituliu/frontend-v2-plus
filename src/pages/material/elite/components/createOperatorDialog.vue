<script setup>
import { ref } from 'vue';
import { useBaseData } from '../js/baseData'
import { useJSONData, useMaterialMaps, useOperatorMaps, useProfessionMaps } from '../js/maps'
import { useOperatorData, insertOperatorData, initOperatorData } from '../js/formatOperatorData'
import { getSpriteImg } from '../js/utils'

const props = defineProps({
  modelValue: Boolean,
})

const emits = defineEmits(['update:modelValue', 'reset'])

const { rarityList } = useBaseData() // 干员星级列表, 龙门币ID
const { professionDictJSON } = useJSONData() // 职业字典JSON
const { chipsTypeMap, materialTypeMap } = useMaterialMaps() // 基础材料ID映射, 芯片映射, 精英材料映射
const { operatorRarityBaseMaterialMap, operatorMaterialMap } = useOperatorMaps() // 通用的干员消耗材料信息映射, 干员精英化、专精技能消耗材料映射
const { professionMap } = useProfessionMaps() // 干员主职业映射
const { operatorList } = useOperatorData() // 干员列表

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
      console.log(`rankMaterial`, rankMaterial)
      console.log(`rankMaterial.fixedMaterialList`, rankMaterial.fixedMaterialList)
      rankMaterial.fixedMaterialList.forEach(item => {
        if (!item) return
        const { itemId, quantity } = item
        materialList.push({
          itemId: itemId || getChipId(profession, rarity, rank), // 芯片无固定ID, 要根据干员职业、星级和精英化等级获取
          quantity
        })
      })
      const materialDicList = rankMaterial.selectMaterialTypes.map(type => materialTypeMap.get(type));
      materials.push({
        title,
        materialList,
        materialDicList,
        selectList: materialDicList.map(() => ({
          itemId: "30011",
          quantity: 4
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
  console.log(`newOperatorInfo.value.skills`, newOperatorInfo.value.skills.flat())

  // 处理模组材料
  const getModTitle = (rank) => `伴生模组：${rank}级`
  newOperatorInfo.value.mods = []
  formatMaterials(newOperatorInfo.value.mods, mod, getModTitle)
}

const changeNewCharInfo = (v) => {
  console.log(`changeNewCharInfo v`, v)
  getNewCharBaseMaterial()
  console.log(`changeNewCharInfo newOperatorInfo.value`, newOperatorInfo.value)
}

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
const addNewOperator = () => {
  console.log(`addNewOperator newOperatorInfo.value`, newOperatorInfo.value)
  const newCharId = `char_${operatorList.value.length}_custom`
  const operatorMaterial = {
    elite: formatOperatorMaterial(newOperatorInfo.value.elite),
    skills: newOperatorInfo.value.skills.map(item => formatOperatorMaterial(item))
  }
  operatorMaterialMap.set(newCharId, operatorMaterial)
  const name = newOperatorInfo.value.name || `第${ operatorList.value.length + 1 }位干员`
  const charInfo = {
    ...newOperatorInfo.value,
    name: `${name} (自定义)`,
    skill: [
      { name: '1技能' },
      { name: '2技能' },
      { name: '3技能' },
    ],
    equip: [{
      charId: newCharId,
      typeName2: '伴生模组',
      itemCost: formatOperatorMaterial(newOperatorInfo.value.mods)  
    }]
  }
  insertOperatorData(newCharId, charInfo)
  initOperatorData()
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
      <el-radio-group v-model="newOperatorInfo.rarity" @change="changeNewCharInfo" size="large">
        <el-radio-button v-for="(item, index) in rarityList.filter(item => item.value >= 4)" :key="index" :value="item.value">{{ item.label }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="row">
      <label>职业：</label> 
      <el-radio-group v-model="newOperatorInfo.profession" @change="changeNewCharInfo" size="large">
        <el-radio-button v-for="(item, index) in professionDictJSON" :key="index" :value="item.value">{{ item.label }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="material-list" v-if="newOperatorInfo.rarity">
      <div class="row" v-for="(item, index) in [...newOperatorInfo.elite, ...newOperatorInfo.skills.flat(), ...newOperatorInfo.mods]" :key="index">
        <label>{{ item.title }}</label>
        <div class="fixed-material">
          <div class="material-item" v-for="(t, i) in item.materialList" :key="i">
            <div :class="getSpriteImg(t.itemId, 'perm')"></div>
            <span class="num">{{ t.quantity }}</span>
          </div>
        </div>
        <div class="select-material" v-for="(dic, dicIndex) in item.materialDicList" :key="dicIndex">
          <el-select v-model="item.selectList[dicIndex].itemId" filterable popper-class="material-popper" placeholder="材料">
            <template #prefix>
              <div :class="getSpriteImg(item.selectList[dicIndex].itemId, 'perm')"></div>
            </template>
            <el-option v-for="t in dic" :key="t.itemId" :value="t.itemId" :label="t.itemName">
              <div :class="getSpriteImg(t.itemId, 'perm')"></div>
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
      <el-button type="primary" @click="addNewOperator">确定</el-button>
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
        width: 180px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      
      .select-material {
        display: flex;
        align-items: center;
        
        span {
          padding: 10px;
        }
      }
      .el-select {
        flex-shrink: 0;
        width: 160px;
        margin-left: 30px;
        .el-select__wrapper {
          position: relative;
          padding-right: 5px;
          padding-left: 55px;
          height: 56px;
          .store_sprite_perm {
            top: -63px;
            left: -63px;
          }
        }
      }
      .el-input__wrapper {
        height: 56px;
        box-shadow: none;
        border-bottom: 1px solid var(--el-border-color);
        border-radius: 0;
        width: 40px;
      }
    }
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
      justify-content: flex-end;
      padding-left: 65px;
      padding-right: 0;
      justify-content: center;
    }
  }
}
</style>