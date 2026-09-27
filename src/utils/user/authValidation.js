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

// 用户名规则：UC 统一注册形态要求 3-20 位字母、数字、下划线
const userNameRegex = /^[A-Za-z0-9_]{3,20}$/;
const userNameRules = [
  requiredRule,
  value => userNameRegex.test(String(value ?? '').trim()) || '用户名仅支持字母、数字、下划线，长度 3-20 位'
];

// 注册密码规则：UC 统一注册形态要求 6-32 位，仅允许字母、数字、@、下划线
const registerPasswordRegex = /^[A-Za-z0-9@_]{6,32}$/;
const registerPasswordRules = [
  requiredRule,
  value => registerPasswordRegex.test(String(value)) || '密码需为 6-32 位数字、字母、@ 或下划线'
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

/**
 * 校验注册表单（UC 统一注册形态：邮箱 + 验证码 + 用户名 + 密码必填，昵称选填）
 * @param {Object} inputContent 表单内容
 * @returns {string} 错误文案，校验通过返回空串
 */
function validateRegisterSubmission(inputContent) {
  const checks = [
    ['邮箱', inputContent.email, emailRules],
    ['验证码', inputContent.verificationCode, verificationCodeRules],
    ['用户名', inputContent.userName, userNameRules],
    ['密码', inputContent.password, registerPasswordRules],
    ['确认密码', inputContent.confirmPassword, registerPasswordRules]
  ];

  for (const [, value, rules] of checks) {
    const error = getFirstRuleError(value, rules);
    if (error) {
      return error;
    }
  }

  if (inputContent.confirmPassword !== inputContent.password) {
    return '两次密码输入不一致';
  }

  return '';
}

/**
 * 校验登录/注册表单提交
 * @param {Object} inputContent 表单内容
 * @param {string} formType 表单类型：login=登录 / register=注册
 * @returns {string} 错误文案，校验通过返回空串
 */
function validateAuthSubmission(inputContent, formType) {
  // 注册已统一为单一形态，不再区分账号注册 / 邮箱注册
  if (formType === 'register') {
    return validateRegisterSubmission(inputContent);
  }

  const {accountType} = inputContent;

  if (accountType === 'password') {
    return getFirstRuleError(inputContent.userName, accountRules)
      || getFirstRuleError(inputContent.password, passwordRules)
      || '';
  }

  if (accountType === 'email') {
    return getFirstRuleError(inputContent.email, emailRules)
      || getFirstRuleError(inputContent.verificationCode, verificationCodeRules)
      || '';
  }

  return '请选择登录方式';
}

export {
  accountRules,
  passwordRules,
  emailRules,
  verificationCodeRules,
  userNameRules,
  registerPasswordRules,
  validateAuthSubmission
};
