function splitToArray(string, delimiter) {
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

export {splitToArray,arrayToString};