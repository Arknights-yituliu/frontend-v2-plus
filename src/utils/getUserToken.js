

function getUserTokenV2() {
    const item = localStorage.getItem('USER_TOKEN');
    return `Authorization${item}`
}

export {
    getUserTokenV2
}