import {onBeforeUnmount, ref} from "vue";
import {createMessage} from "/src/utils/message.js";
import userAPI from "/src/api/userInfo.js";

const VERIFICATION_CODE_COUNTDOWN = 60;

function getRequestErrorMessage(error) {
  return error?.data?.msg || error?.msg || error?.message || '';
}

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
      await userAPI.sendVerificationCodeV2({
        mailUsage,
        email: normalizedEmail
      });
      createMessage({type: 'success', text: '验证码发送成功'});
      startCountdown();
      return true;
    } catch (error) {
      if (!getRequestErrorMessage(error)) {
        createMessage({type: 'error', text: '验证码发送失败，请稍后重试'});
      }
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
