<script setup>
import {ref} from 'vue'

const loginMode = ref('password')
const account = ref('')
const password = ref('')
const email = ref('')
const verificationCode = ref('')
</script>

<template>
  <main class="auth-card-test-page">
    <v-card class="auth-demo-card" elevation="0">
      <div class="auth-demo-heading">
        <h1>登录</h1>
      </div>

      <div class="auth-demo-mode-switch" role="tablist" aria-label="登录方式">
        <button
            class="auth-demo-mode-button"
            :class="{ 'auth-demo-mode-button--active': loginMode === 'password' }"
            type="button"
            role="tab"
            :aria-selected="loginMode === 'password'"
            @click="loginMode = 'password'"
        >
          账号密码登录
        </button>
        <button
            class="auth-demo-mode-button"
            :class="{ 'auth-demo-mode-button--active': loginMode === 'email' }"
            type="button"
            role="tab"
            :aria-selected="loginMode === 'email'"
            @click="loginMode = 'email'"
        >
          验证码登录
        </button>
      </div>

      <div class="auth-demo-form">
        <template v-if="loginMode === 'password'">
          <v-text-field
              v-model="account"
              class="auth-demo-field"
              label="账号"
              placeholder="请输入账号"
              variant="solo-filled"
              density="comfortable"
              hide-details
          />

          <v-text-field
              v-model="password"
              class="auth-demo-field"
              label="密码"
              placeholder="请输入密码"
              type="password"
              variant="solo-filled"
              density="comfortable"
              hide-details
          />

          <div class="auth-demo-field-footer">
            <span></span>
            <button class="auth-demo-link" type="button">忘记密码？</button>
          </div>
        </template>

        <template v-else>
          <v-text-field
              v-model="email"
              class="auth-demo-field"
              label="邮箱"
              placeholder="请输入绑定邮箱"
              variant="solo-filled"
              density="comfortable"
              hide-details
          >
            <template #append-inner>
              <button class="auth-demo-code-button" type="button">发送验证码</button>
            </template>
          </v-text-field>

          <v-text-field
              v-model="verificationCode"
              class="auth-demo-field"
              label="验证码"
              placeholder="请输入验证码"
              variant="solo-filled"
              density="comfortable"
              hide-details
          />
        </template>

        <v-btn
            class="auth-demo-primary-button"
            color="primary"
            block
            size="large"
            variant="flat"
        >
          登录
        </v-btn>
      </div>

      <div class="auth-demo-bottom">
        <span>还没有账号？</span>
        <button class="auth-demo-link" type="button">注册账号</button>
      </div>

      <section class="auth-demo-notice">
        <ul class="auth-demo-notice-list">
          <li>绑定邮箱后，也可以使用邮箱作为账号登录。</li>
          <li>这是用于保存一图流个人数据的账号，与鹰角通行证无关。</li>
          <li>请勿使用与其他重要账号相同的密码。</li>
        </ul>
      </section>
    </v-card>
  </main>
</template>

<style scoped>
.auth-card-test-page {
  min-height: calc(100vh - 32px);
  display: grid;
  place-items: start center;
  padding: 72px 20px 48px;
  box-sizing: border-box;
}

.auth-demo-card {
  width: min(100%, 400px);
  padding: 28px 28px 22px;
  border: 1px solid rgba(var(--v-border-color), 0.7);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.auth-demo-heading h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.auth-demo-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  margin-top: 24px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.auth-demo-mode-button {
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease;
}

.auth-demo-mode-button:hover {
  color: rgb(var(--v-theme-on-surface));
}

.auth-demo-mode-button--active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.auth-demo-form {
  margin-top: 24px;
}

.auth-demo-field {
  margin-bottom: 14px;
}

.auth-demo-field :deep(.v-field) {
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.055);
  box-shadow: none;
}

.auth-demo-field :deep(.v-field--focused) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.auth-demo-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0;
}

.auth-demo-field :deep(.v-label) {
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.auth-demo-field :deep(input::placeholder) {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.auth-demo-field-footer {
  display: flex;
  justify-content: space-between;
  min-height: 22px;
  margin-top: -5px;
}

.auth-demo-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.auth-demo-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.auth-demo-code-button {
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-size: 0.8125rem;
  white-space: nowrap;
  cursor: pointer;
}

.auth-demo-primary-button {
  min-height: 42px;
  margin-top: 10px;
  border-radius: 6px;
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}

.auth-demo-bottom {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.8125rem;
}

.auth-demo-notice {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.55);
  color: rgba(var(--v-theme-on-surface), 0.48);
}

.auth-demo-notice-title {
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 600;
}

.auth-demo-notice-list {
  margin: 0;
  padding-left: 16px;
  font-size: 0.75rem;
  line-height: 1.55;
}

.auth-demo-notice-list li + li {
  margin-top: 2px;
}

@media screen and (max-width: 600px) {
  .auth-card-test-page {
    min-height: 100vh;
    padding: 28px 12px;
  }

  .auth-demo-card {
    padding: 24px 20px 20px;
  }
}
</style>
