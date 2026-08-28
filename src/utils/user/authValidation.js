const chineseEnglishNumberRegex = /^[\u4e00-\u9fa5A-Za-z0-9]+$/;
const englishNumberRegex = /^[A-Za-z0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const verificationCodeRegex = /^\d{6}$/;

const requiredRule = value => String(value ?? '').trim().length > 0 || '不能为空';
const requiredRules = [requiredRule];

// 账号规则：登录/注册账号既可以是邮箱，也可以是用户名（汉字、数字、英文）
const accountRules = [
  requiredRule,
  value => emailRegex.test(String(value).trim()) || chineseEnglishNumberRegex.test(String(value)) || '账号仅可为邮箱或汉字、数字、英文'
];

// 邮箱规则：邮箱验证码登录/注册
const emailRules = [
  requiredRule,
  value => emailRegex.test(String(value).trim()) || '邮箱格式不正确'
];

// 邮箱验证码规则：6 位数字
const verificationCodeRules = [
  requiredRule,
  value => verificationCodeRegex.test(String(value)) || '验证码为 6 位数字'
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
      ['邮箱', inputContent.email, emailRules],
      ['验证码', inputContent.verificationCode, verificationCodeRules]
    );

    // 邮箱验证码注册也必填密码（UC 注册两种方式均需设置密码）
    if (formType === 'register') {
      checks.push(['密码', inputContent.password, passwordRules]);
    }
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
  emailRules,
  verificationCodeRules,
  validateAuthSubmission
};
