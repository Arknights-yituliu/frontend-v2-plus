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
    const startTimeStamp = checkType(startDate);
    const endTimeStamp = checkType(endDate);
    if(startTimeStamp>endTimeStamp){
        return 0
    }
    // 计算两个日期的毫秒差
    const diff = Math.abs(startTimeStamp - endTimeStamp);
    // 将毫秒差转换为天数
    // 使用Math.ceil如果想要包含开始和结束日期都算一天
    return Math.ceil(diff / (1000 * 3600 * 24));

}


function formatDateString(dateStr) {
    if(!dateStr){
        return  dateFormat(new Date())
    }
    // 使用正则表达式匹配日期字符串的格式
    const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) {
        throw new Error("Invalid date format. Expected format: YYYY/MM/DD");
    }

    const year = match[1]; // 年份
    const month = match[2].padStart(2, '0'); // 月份补零
    const day = match[3].padStart(2, '0'); // 天数补零

    // 返回格式化后的日期字符串
    return `${year}/${month}/${day}`;
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

export {dateFormat, dateDiff,formatDateString}