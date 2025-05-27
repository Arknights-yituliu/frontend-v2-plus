/**
 * 简单的 JavaScript 代码格式化函数（不依赖任何库）
 * @param code {string} - 原始代码字符串
 * @param indentChar {string} - 缩进字符，默认为两个空格
 * @returns {[]}
 */
function formatCode(code, indentChar = '  ') {
    // 清理前后空白并按行分割
    const lines = code.trim().split(/\r?\n/);

    let result = [];
    let indentLevel = 0;


    for (let line of lines) {

        // 去掉行首尾空白
        line = line.trim();
        const pElement = document.createElement("p");
        // 如果是空行就跳过
        if (!line) {
            pElement.textContent = "";
            result.push('');
            continue;
        }

        // 判断是否减少缩进（比如遇到 } 或 ]）
        if (line.indexOf('}') >= 0 || line.indexOf(']') >= 0) {
            indentLevel--;
        }

        indentLevel = Math.max(0, indentLevel);
        pElement.textContent = indentChar.repeat(indentLevel) + line;

        // 添加当前行并加上缩进
        result.push(pElement);

        // 判断是否增加缩进（比如以 { 或 [ 结尾）
        if (line.indexOf('{') >= 0 || line.indexOf('[') >= 0) {
            indentLevel++;
        }
    }

    return result;
}


function formatCodeElement() {
    const elements = document.querySelectorAll("code")

    for (const element of elements) {
        // 如果 code 里已经有 <p> 标签，则跳过
        if (element.querySelector("p")) {
            continue;
        }
        let rawCode = element.textContent
        // 格式化代码
        const formattedCodeElement = formatCode(rawCode)

        // 写回 code 元素中
        element.textContent = ''

        for (const formattedElement of formattedCodeElement) {
            element.appendChild(formattedElement)
        }
    }
}


export {
    formatCode, formatCodeElement
}