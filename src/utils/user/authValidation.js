const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;

const requiredRule = value => String(value ?? '').trim().length > 0 || '不能为空';
const requiredRules = [requiredRule];

const accountRules = [
  requiredRule,
  value => chineseEnglishNumberRegex.test(String(value)) || '账号仅可由汉字、数字、英文组成'
];

const passwordRules = [
  requiredRule,
  value => englishNumberRegex.test(String(value)) || '密码仅可由数字、英文组成'
];

function getFirstRuleError(value, rules) {
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) {
      return result;
    }
  }

  return '';
}

function validateRecoveryVerification(inputContent) {
  return getFirstRuleError(inputContent.email, requiredRules)
    || getFirstRuleError(inputContent.verificationCode, requiredRules)
    || '';
}

function validatePasswordReset(inputContent) {
  const passwordError = getFirstRuleError(inputContent.password, passwordRules);
  if (passwordError) {
    return passwordError;
  }

  const confirmPasswordError = getFirstRuleError(inputContent.confirmPassword, passwordRules);
  if (confirmPasswordError) {
    return confirmPasswordError;
  }

  if (inputContent.confirmPassword !== inputContent.password) {
    return '两次密码输入不一致';
  }

  return '';
}

/**
 * Validate only the fields required by the current auth mode.
 */
function validateAuthSubmission(inputContent, formType) {
  const {accountType} = inputContent;
  const checks = [];

  if (accountType === 'password') {
    checks.push(
      ['账号', inputContent.userName, accountRules],
      ['密码', inputContent.password, passwordRules]
    );

    if (formType === 'register') {
      checks.push(['确认密码', inputContent.confirmPassword, passwordRules]);
    }
  } else if (accountType === 'email') {
    checks.push(
      ['邮箱', inputContent.email, requiredRules],
      ['验证码', inputContent.verificationCode, requiredRules]
    );
  } else {
    return '请选择登录或注册方式';
  }

  for (const [, value, rules] of checks) {
    const error = getFirstRuleError(value, rules);
    if (error) {
      return error;
    }
  }

  if (
    accountType === 'password' &&
    formType === 'register' &&
    inputContent.confirmPassword !== inputContent.password
  ) {
    return '两次密码输入不一致';
  }

  return '';
}

export {
  accountRules,
  passwordRules,
  validatePasswordReset,
  validateRecoveryVerification,
  validateAuthSubmission
};
