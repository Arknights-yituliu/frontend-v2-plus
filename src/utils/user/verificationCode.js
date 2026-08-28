import {onBeforeUnmount, ref} from "vue";
import {createMessage} from "/src/utils/message.js";
import {sendEmailCode} from "/src/api/userCenterApi.js";

const VERIFICATION_CODE_COUNTDOWN = 60;

function useVerificationCode() {
  const isSendingCode = ref(false);
  const codeCountdown = ref(0);
  let countdownTimer = null;

  function clearCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown() {
    clearCountdown();
    codeCountdown.value = VERIFICATION_CODE_COUNTDOWN;
    countdownTimer = setInterval(() => {
      if (codeCountdown.value <= 1) {
        codeCountdown.value = 0;
        clearCountdown();
        return;
      }

      codeCountdown.value -= 1;
    }, 1000);
  }

  async function sendVerificationCode(email, mailUsage) {
    const normalizedEmail = String(email ?? '').trim();

    if (!normalizedEmail) {
      createMessage({type: 'warning', text: '请先输入邮箱'});
      return false;
    }

    if (isSendingCode.value || codeCountdown.value > 0) {
      return false;
    }

    isSendingCode.value = true;
    try {
      // 验证码由 UC 直接下发（邮箱验证码注册/登录）
      await sendEmailCode(normalizedEmail, mailUsage);
      createMessage({type: 'success', text: '验证码发送成功'});
      startCountdown();
      return true;
    } catch (error) {
      // 错误提示已由 UC 拦截器（userCenterApi.js）统一弹出，这里仅返回失败状态
      console.error('验证码发送失败', error);
      return false;
    } finally {
      isSendingCode.value = false;
    }
  }

  onBeforeUnmount(clearCountdown);

  return {
    codeCountdown,
    isSendingCode,
    sendVerificationCode
  };
}

export {useVerificationCode};
