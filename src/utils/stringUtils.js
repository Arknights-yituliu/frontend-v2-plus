function stringToArray(string, delimiter) {
    if(!string){
        return []
    }
    return string.split(',').map((item) => {
        return item.trim();
    }).filter(item => item);
}

function arrayToString(array) {
    array = array.filter(item => item);
    if (array.length === 0) {
        return ''
    }
    return array.join(",")
}

function stringToNumber(str) {
    // 检查是否为 null 或 undefined
    if (str === null || str === undefined) {
        return 0;
    }

    // 如果传入的是字符串，则尝试转换
    if (typeof str === 'string') {
        // 尝试将字符串转换为数字
        const num = parseFloat(str);
        // 检查转换结果是否为有效数字
        return isNaN(num) ? 0 : num;
    }

    // 如果不是字符串，尝试直接使用 Number 进行转换
    const num = Number(str);
    return isNaN(num) ? 0 : num;
}

export {stringToArray,stringToNumber,arrayToString};