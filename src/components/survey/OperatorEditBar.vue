<script setup>

import '/src/assets/css/survey/operator_info_bar.scss'
import '/src/assets/css/survey/operator_info_bar.phone.scss'

import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import SkillIcon from "/src/components/sprite/SkillIcon.vue";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";

defineProps({
  // 干员记录：包含 own / elite / level / 技能专精 / 模组等级等字段
  operatorInfo: {
    type: Object,
    required: true
  }
});

// 图标点击交由父级定位下拉菜单；持有开关直接抛字段变更
const emit = defineEmits(['open-menu', 'update-field'])

/**
 * 抛出图标点击事件，由父级根据图标位置打开下拉菜单
 * @param {MouseEvent|KeyboardEvent} event 点击 / 回车事件
 * @param {string} field 待修改字段
 */
function handleIconClick(event, field) {
  emit('open-menu', event, field)
}

/**
 * 抛出持有开关变更
 * @param {*} value 新的持有状态
 */
function handleOwnedChange(value) {
  emit('update-field', 'own', value)
}

</script>

<template>
  <v-card :class="[
      'operator-info-card',
      'operator-edit-list-card',
      `operator-rarity-${operatorInfo.rarity ?? 1}`,
      { 'operator-info-card--not-owned': !operatorInfo.own }
    ]">
    <div class="operator-info-bar">
      <!-- 未持有干员标志：居中覆盖在卡片展示区 -->
      <div v-if="!operatorInfo.own" class="operator-unowned-badge"><span>未招募</span></div>

      <div class="operator-avatar-area">
        <OperatorAvatar :size="56" :mobile-size="44" :char-id="operatorInfo.charId"></OperatorAvatar>
      </div>

      <div class="operator-info operator-edit-info">
        <div class="operator-name">{{ operatorInfo.name }}</div>
        <!-- 干员名称下方的持有开关 -->
        <div class="operator-edit-owned">
          <v-switch
            :model-value="operatorInfo.own"
            color="primary"
            density="compact"
            hide-details
            inset
            @update:model-value="handleOwnedChange($event)"
          ></v-switch>
          <span>持有</span>
        </div>
      </div>

      <!-- 精英化与等级图标：放大到与技能图标一致，并排在技能区之前 -->
      <div
        class="operator-edit-stat operator-edit-stat--elite operator-icon-trigger"
        role="button"
        tabindex="0"
        aria-label="修改精英化阶段"
        @click="handleIconClick($event, 'elite')"
        @keydown.enter="handleIconClick($event, 'elite')"
      >
        <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" alt="">
      </div>
      <div
        class="operator-edit-stat operator-edit-stat--level operator-icon-trigger"
        role="button"
        tabindex="0"
        aria-label="修改等级"
        @click="handleIconClick($event, 'level')"
        @keydown.enter="handleIconClick($event, 'level')"
      >
        {{ operatorInfo.level }}
      </div>

      <div class="operator-skills-area">
        <div
          class="bar-operator-skill-item operator-icon-trigger"
          v-for="(skill, index) in operatorInfo.skills"
          :key="index"
          role="button"
          tabindex="0"
          :aria-label="`修改技能${index + 1}专精`"
          @click="handleIconClick($event, 'skill' + (index + 1))"
          @keydown.enter="handleIconClick($event, 'skill' + (index + 1))"
        >
          <div class="operator-skill-frame">
            <SkillIcon :size="40" :mobile-size="30" :icon="`${skill.skillIcon}`"></SkillIcon>
          </div>
          <img :src="`/image/survey/skill-rank-${operatorInfo[`skill${index + 1}`]}-v1.jpg`"
               v-show="operatorInfo[`skill${index + 1}`] > 0"
               class="operator-skill-rank-icon" alt="">
        </div>
      </div>

      <div class="operator-modules-area">
        <div
          class="operator-equip-group operator-icon-trigger"
          v-for="(equip, index) in operatorInfo.equip"
          :key="index"
          role="button"
          tabindex="0"
          :aria-label="`修改${equip.typeName2}模组等级`"
          @click="handleIconClick($event, 'mod' + equip.typeName2)"
          @keydown.enter="handleIconClick($event, 'mod' + equip.typeName2)"
        >
          <div class="operator-equip">
            <EquipIcon :icon="equip.typeIcon" :mobile-size="20" :size="24" class="equip-icon"></EquipIcon>
            <img :src="`/image/survey/mod-rank-${operatorInfo[`mod${equip.typeName2}`]}-v1.jpg`"
                 v-show="operatorInfo[`mod${equip.typeName2}`] > 0" class="equip-rank-icon" alt="">
            <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped lang="scss">
// 信息区复用卡片尺寸，名称下方放持有开关
.operator-edit-owned {
  position: absolute;
  top: 18px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  line-height: 16px;
  opacity: 0.85;
  white-space: nowrap;
}

.operator-edit-owned .v-switch {
  flex: 0 0 auto;
  margin: 0;
  transform: scale(0.72);
  transform-origin: left center;
}

// 精英化 / 等级图标：与技能图标同尺寸的方框
.operator-edit-stat {
  position: relative;
  display: flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  border: 1px solid rgba(72, 78, 88, 0.58);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.24);
}

.operator-edit-stat--elite img {
  width: 30px;
  filter: drop-shadow(2px 2px 2px rgb(100, 100, 100));
}

.operator-edit-stat--level {
  padding-top: 22px;
  background-image: url("/image/survey/rank/lv-bg.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 40px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 12px;
}

// 未招募时精英化 / 等级图标同样置灰，与技能、模组保持一致
.operator-info-card--not-owned .operator-edit-stat {
  filter: grayscale(1);
  opacity: 0.55;
}

@media screen and (max-width: 600px) {
  .operator-edit-owned {
    top: 16px;
    font-size: 9px;
  }

  .operator-edit-stat {
    flex-basis: 30px;
    width: 30px;
    height: 30px;
  }

  .operator-edit-stat--elite img {
    width: 22px;
  }

  .operator-edit-stat--level {
    padding-top: 16px;
    background-size: 30px;
    font-size: 10px;
  }
}
</style>
