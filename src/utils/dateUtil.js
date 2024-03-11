import {h} from "vue";

/**
 * 根据传入时间格式字符串格式化时间
 * @param date 时间类
 * @param format 时间格式字符串
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

export  {timeFormat}