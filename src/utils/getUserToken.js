function getUserToken() {
    const item = localStorage.getItem('USER_TOKEN');

    if (item === null || item === 'undefined') {
        throw new Error('获取不到Token')
    }

    return item
}

function getUserTokenV2() {
    const item = localStorage.getItem('USER_TOKEN');
    return `Authorization ${item}`
}

export {
    getUserToken,getUserTokenV2
}