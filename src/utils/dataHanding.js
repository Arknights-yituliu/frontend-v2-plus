// 将"HH:mm:ss"字符串转换为等价秒数
function timeStringToSeconds(timeString) {
    const parts = timeString.toString().split(':')
    if (parts.length !== 3) {
        return null
    }
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseInt(parts[2], 10)

    return hours * 3600 + minutes * 60 + seconds
}

//提取Date对象的时分秒并转换为总秒数
function convertToSeconds(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return hours * 3600 + minutes * 60 + seconds;
}

//将总秒数再转换回去
function secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // 将小时、分钟和秒转换为两位数的字符串
    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    const formattedSeconds = secs.toString().padStart(2, '0')

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}

//获取从当天零点起始，至现在渡过的总秒数
function getSecondsSinceMidnight() {
    const now = new Date(); // 获取当前时间
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 获取当天零点的时间

    // 计算差异（以毫秒为单位）并转换为秒
    const secondsSinceMidnight = (now.getTime() - midnight.getTime()) / 1000;
    return secondsSinceMidnight;
}

export {timeStringToSeconds, convertToSeconds, secondsToTimeString, getSecondsSinceMidnight}
