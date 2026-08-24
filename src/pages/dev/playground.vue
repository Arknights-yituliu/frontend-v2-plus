<script setup>
import { ref } from 'vue'

const expandedMethod = ref('')

const methods = [
  {
    key: 'skland',
    title: '使用森空岛凭证',
    avatar: '/avatar/skland-credential.webp',
    subtitle: '直接使用森空岛凭证，获取绑定账号的干员数据。',
    subtitleNote: 'PC端操作方便，移动端略为艰难，安全性较高',
    purpose: [
      '可以获取森空岛账号绑定的明日方舟账号列表',
      '可以获取账号 UID、昵称、区服等信息',
      '可以获取干员持有情况、等级、精英化、潜能、技能等级、模组等级',
      '可以获取仓库物资数量',
    ],
    purposeNote: '这里明日方舟一图流仅一次性使用该token，以获取干员相关数据。',
    warning: [
      '凭证属于敏感信息，泄露后可能被用于读取上述数据。请勿分享给他人或粘贴到无关页面。',
    ],
  },
  {
    key: 'official',
    title: '使用官网 Token',
    avatar: '/avatar/official-token.png',
    subtitle: '通过官网 Token 获取森空岛凭证，再获取绑定账号的干员数据。',
    subtitleNote: 'PC端/移动端都比较方便，务必注意Token安全',
    purpose: [
      '森空岛Token已经够厉害了，但这玩意可以生成森空岛Token。',
    ],
    warning: [
      '官网Token 属于极度敏感信息，泄露后可能被用于生成包括但不限于森空岛凭证在内的很多信息，分享官网Token给他人的危险程度不亚于公开你的账号密码！',
      '无论何时何地，使用官网Token前，请务必确认您已1000%信任该工具，使用该途径则视为您已知晓相关风险。',
      '使用时请确保环境安全，尤其小心会读取剪贴板的程序/APP，复制Token后请尽快使用！',
    ],
  },
]

function toggleMethod(method) {
  expandedMethod.value = expandedMethod.value === method ? '' : method
}
</script>

<template>
  <main class="import-playground">
    <section class="import-choice-list" aria-label="导入方式">
      <article
          v-for="method in methods"
          :key="method.key"
          class="import-choice-card"
          :class="{ 'import-choice-card--expanded': expandedMethod === method.key }"
      >
        <button
            class="import-choice-card__header"
            type="button"
            :aria-expanded="expandedMethod === method.key"
            :aria-controls="`${method.key}-details`"
            @click="toggleMethod(method.key)"
        >
          <span class="import-choice-card__copy">
            <img class="import-choice-card__avatar" :src="method.avatar" :alt="method.title">
            <span class="import-choice-card__text">
              <span class="import-choice-card__title">{{ method.title }}</span>
              <span class="import-choice-card__subtitle">{{ method.subtitle }}</span>
              <span class="import-choice-card__subtitle-note">{{ method.subtitleNote }}</span>
            </span>
          </span>
        </button>

        <div
            :id="`${method.key}-details`"
            class="import-choice-card__expansion"
            :aria-hidden="expandedMethod !== method.key"
        >
          <div class="import-choice-card__expansion-inner">
            <div class="import-choice-card__notice import-choice-card__notice--purpose" role="note">
              <strong>凭证用途</strong>
              <ul class="import-choice-card__purpose-list">
                <li v-for="item in method.purpose" :key="item">{{ item }}</li>
              </ul>
              <p v-if="method.purposeNote" class="import-choice-card__purpose-note">{{ method.purposeNote }}</p>
            </div>

            <div
                class="import-choice-card__notice"
                :class="{
                  'import-choice-card__notice--warning': method.key === 'skland',
                  'import-choice-card__notice--danger': method.key === 'official',
                }"
                role="note"
            >
              <strong>安全提示</strong>
              <p v-for="paragraph in method.warning" :key="paragraph">{{ paragraph }}</p>
            </div>

            <div class="import-choice-card__actions">
              <template v-if="method.key === 'skland'">
                <button class="import-choice-card__action" type="button">开始导入</button>
              </template>
              <template v-else>
                <button class="import-choice-card__action" type="button">移动端</button>
                <button class="import-choice-card__action" type="button">桌面端</button>
              </template>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.import-playground {
  box-sizing: border-box;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 40px 20px 56px;
  color: rgb(var(--v-theme-on-background));
}

.import-choice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-choice-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.72);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 2px rgba(20, 24, 32, 0.04);
  transition:
    background-color 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.import-choice-card:hover,
.import-choice-card--expanded {
  border-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 8px 24px rgba(20, 24, 32, 0.08);
}

.import-choice-card--expanded {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.import-choice-card__header {
  display: flex;
  width: 100%;
  min-height: 88px;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  padding: 20px 22px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.import-choice-card__header:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
}

.import-choice-card--expanded .import-choice-card__header {
  padding-bottom: 10px;
}

.import-choice-card__copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
}

.import-choice-card__avatar {
  display: block;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 10px;
  object-fit: cover;
}

.import-choice-card__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.import-choice-card__title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.import-choice-card__subtitle {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.import-choice-card__subtitle-note {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.75rem;
  line-height: 1.45;
}

.import-choice-card__expansion {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-6px);
  transition:
    grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.import-choice-card__expansion-inner {
  min-height: 0;
  overflow: hidden;
  padding: 0 22px;
  transition: padding 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.import-choice-card--expanded .import-choice-card__expansion {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

.import-choice-card--expanded .import-choice-card__expansion-inner {
  padding-top: 0;
  padding-bottom: 18px;
}

.import-choice-card__notice {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 5px;
  font-size: 0.75rem;
  line-height: 1.55;
}

.import-choice-card__notice:first-child {
  margin-top: 8px;
}

.import-choice-card__notice--purpose {
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  background: rgba(var(--v-theme-primary), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.import-choice-card__notice--warning {
  border: 1px solid rgba(190, 137, 35, 0.28);
  background: rgba(190, 137, 35, 0.1);
  color: rgb(153, 104, 17);
}

.import-choice-card__notice--danger {
  border: 1px solid rgba(190, 62, 52, 0.34);
  background: rgba(190, 62, 52, 0.11);
  color: rgb(167, 53, 45);
}

.import-choice-card__notice strong {
  display: block;
  margin-bottom: 3px;
  font-size: 0.75rem;
  font-weight: 600;
}

.import-choice-card__notice--purpose strong {
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.import-choice-card__notice--warning strong {
  color: rgb(153, 104, 17);
}

.import-choice-card__notice--danger strong {
  color: rgb(167, 53, 45);
}

.import-choice-card__notice p {
  margin: 0;
}

.import-choice-card__purpose-list {
  margin: 0;
  padding-left: 1.2em;
}

.import-choice-card__purpose-list li + li {
  margin-top: 3px;
}

.import-choice-card__purpose-note {
  margin-top: 7px !important;
}

.import-choice-card__notice--warning p + p {
  margin-top: 7px;
}

.import-choice-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.import-choice-card__action {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(var(--v-theme-primary), 0.5);
  border-radius: 5px;
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.import-choice-card__action:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

@media screen and (max-width: 520px) {
  .import-playground {
    padding: 24px 14px 40px;
  }

  .import-choice-card__header {
    min-height: 82px;
    padding: 18px;
  }

  .import-choice-card--expanded .import-choice-card__header {
    padding-bottom: 10px;
  }

  .import-choice-card__expansion-inner {
    padding-right: 18px;
    padding-left: 18px;
  }

  .import-choice-card__avatar {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .import-choice-card,
  .import-choice-card__expansion,
  .import-choice-card__expansion-inner,
  .import-choice-card__action {
    transition: none;
  }
}
</style>
