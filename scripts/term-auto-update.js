// 自动更新术语解释文件脚本
const fs = require('fs');
const path = require('path');

// 获取命令行参数中的输入路径和输出路径
// 输入路径：ArknightsGameData仓库的术语解释文件路径
// 输出路径：本地项目的术语解释文件路径
const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('错误：需要提供输入路径和输出路径作为命令行参数');
  process.exit(1);
}

// 读取下载的文件内容
const rawData = fs.readFileSync(inputPath, 'utf8');
const jsonData = JSON.parse(rawData);

/**
 * 删除多余的、匹配不上的"<"或">"
 * 每一个"<"都会与最近的一个">"进行匹配，且每个"<"或">"都只能互相匹配一次。
 * @param {string} htmlStr 待清洗的HTML字符串
 * @returns {string} 清洗后的HTML字符串
 */
function removeExcessParentheses(htmlStr) {
  const chars = htmlStr.split('');
  const length = chars.length;
  const matched = new Array(length).fill(false); // 标记每个字符是否已匹配
  const stack = []; // 栈用于存储"<"的索引

  // 遍历字符数组，使用栈匹配"<"与">"
  for (let i = 0; i < length; i++) {
    if (chars[i] === '<') {
      // 将"<"的索引压入栈中
      stack.push(i);
    } else if (chars[i] === '>') {
      if (stack.length > 0) {
        // 弹出栈顶的"<"索引，标记这对"<"和">"为匹配
        const start = stack.pop();
        matched[start] = true;
        matched[i] = true;
      }
      // 如果栈为空，说明当前">"没有对应的"<"，忽略它
    }
  }

  // 构建最终的HTML，保留匹配的"<"和">"，删除未匹配的
  const result = [];
  for (let i = 0; i < length; i++) {
    if (chars[i] === '<' || chars[i] === '>') {
      if (matched[i]) {
        result.push(chars[i]);
      }
      // 未匹配的"<"或">"不添加到结果中
    } else {
      result.push(chars[i]);
    }
  }

  return result.join('');
}

/**
 * 替换描述中的基础标签
 * @param {string} description 原始描述
 * @returns {string} 处理后的描述
 */
function replaceDescriptionBase(description) {
  // 匹配常规标签
  const spliceClassMap = {
    '<@cc.vup>': '<span class=\'cc-vup\'>',
    '<@cc.kw>': '<span class=\'cc-kw\'>',
    '<@cc.vdown>': '<span class=\'cc-vdown\'>',
    '<@cc.rem>': '<span gamedata_const class=\'cc-rem\'>',
    '</>': '</span>',
    '\n': '<br>'
  };

  // 依次替换标签
  for (const [key, value] of Object.entries(spliceClassMap)) {
    description = description.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  // 删除多余的"<"或">"
  description = removeExcessParentheses(description);

  return description;
}

/**
 * 创建术语描述JSON数据
 * @param {Object} termDescriptionDict 术语描述字典
 * @returns {Object} 处理后的术语描述Map
 */
function createTermDescriptionJson(termDescriptionDict) {
  const termDescriptionMap = {};

  // 遍历termDescriptionDict的所有字段
  for (const [termId, termData] of Object.entries(termDescriptionDict)) {
    // 仅添加键名以cc开头的节点
    if (termId.startsWith('cc')) {
      const termName = termData.termName || '';
      let description = replaceDescriptionBase(termData.description || '');

      // 将术语中的术语标签替换为常规标签，防止渲染错误（术语提示文本框中无法再提示术语）
      const pattern = /<\$cc\.(.*?)>/g;
      description = description.replace(pattern, '<span class=\'cc-base\'>');

      // 将术语ID中的点号替换为短横线
      const normalizedTermId = termId.replace(/\./g, '-');

      termDescriptionMap[normalizedTermId] = {
        termName: termName,
        description: description
      };
    }
  }

  return termDescriptionMap;
}

// 处理数据
const termDescriptionDict = jsonData.termDescriptionDict;

if (!termDescriptionDict) {
  console.error('错误：JSON文件中未找到 termDescriptionDict 字段');
  process.exit(1);
}

// 创建术语描述JSON
const termDescriptionMap = createTermDescriptionJson(termDescriptionDict);

// 确保输出目录存在
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 将处理后的文件内容写入本地输出路径
const processedData = JSON.stringify(termDescriptionMap, null, 2);
fs.writeFileSync(outputPath, processedData, 'utf8');

console.log(`转换成功！已将 ${inputPath} 中的内容进行格式化并保存到 ${outputPath}`);
