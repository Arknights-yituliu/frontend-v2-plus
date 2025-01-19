/**
 * 根据传入时间格式字符串格式化时间
 * @param input {Date} 时间类
 * @param template {string} 时间格式字符串
 * @return {string} 传入时间类的格式化字符串
 * @example dateUtil(date, format = 'yyyy/MM/dd') 将返回 2024/01/01
 */
function dateFormat(input, template = 'yyyy/MM/dd') {

    const date = checkType(input);


    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hour = date.getHours().toString().padStart(2, "0")
    const minute = date.getMinutes().toString().padStart(2, "0")
    const second = date.getSeconds().toString().padStart(2, "0")
    const milliseconds = date.getMilliseconds().toString().padStart(2, "0")



    const formatKeys = {
        'yyyy': year,
        'MM': month,
        'dd': day,
        'HH': hour,
        'mm': minute,
        'ss': second,
        'SSS': milliseconds
    };


    // 替换模板中的标记符
    return template.replace(/yyyy|MM|dd|HH|mm|ss|SSS/g, match => formatKeys[match]);
}

/**
 * 计算俩个日期天数之差
 * @param startDate {Date|string} 开始日期
 * @param endDate {Date|string}   结束日期
 * @return {number}  天数之差
 */
function dateDiff(startDate, endDate) {
    // 将输入的字符串日期转换为Date对象
    const firstDate = checkType(startDate);
    const secondDate = checkType(endDate);
    // 计算两个日期的毫秒差
    const diff = Math.abs(firstDate.getTime() - secondDate.getTime());
    // 将毫秒差转换为天数
    // 使用Math.ceil如果想要包含开始和结束日期都算一天
    return Math.ceil(diff / (1000 * 3600 * 24));

}

function checkType(input) {
    if (typeof input === 'object' && input instanceof Date) {
        return input
    }

    if (typeof input === 'string'||typeof input === 'number') {
        return new Date(input)
    }

    return new Date()

}

export {dateFormat, dateDiff}