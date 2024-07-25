

const getUserToken = ()=>{
    const item = localStorage.getItem('USER_TOKEN');
    if(item===null||item==='undefined'){
       throw new Error('获取不到Token')
    }

    return item
}
export {
    getUserToken
}