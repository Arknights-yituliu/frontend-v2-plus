/**
 * 根据传入时间格式字符串格式化时间
 * @param date {Date} 时间类
 * @param format {string} 时间格式字符串
 * @return {string} 传入时间类的格式化字符串
 * @example dateUtil(date, format = 'yyyy/MM/dd') 将返回 2024/01/01
 */
function timeFormat(date, format = 'yyyy/MM/dd') {

    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hour = date.getHours().toString().padStart(2, "0")
    const minute = date.getMinutes().toString().padStart(2, "0")
    const second = date.getSeconds().toString().padStart(2,"0")

    const formatKeys = [
        {key: 'yyyy', value: year},
        {key: 'MM', value: month},
        {key: 'dd', value: day},
        {key: 'HH', value: hour},
        {key: 'mm', value: minute},
        {key: 'ss', value: second}
    ]

    for (const formatKey of formatKeys) {
        format = format.replace(formatKey.key,formatKey.value)
    }

    return format
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
    } else if (typeof input === 'string') {
        return new Date(input)
    } else {
        return new Date()
    }
}

export  {timeFormat,dateDiff}