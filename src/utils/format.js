/**
 * 格式化数字
 * @param {Object} num 数字
 * @param {number} acc 位数
 * @returns {string} 格式化后的数字
 */
function formatNumber(num, acc=2) {
    acc = typeof acc !== "undefined" ? acc : 2;
    if (typeof num === "undefined") return ''
    return parseFloat(num.toString()).toFixed(acc);
}


export { formatNumber };