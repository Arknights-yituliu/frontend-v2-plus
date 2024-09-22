function getViewportInfo() {
    let viewportHeight ,viewportWidth = 0;
    if (typeof window.innerHeight === 'number') {
        // 对于大多数现代浏览器
        viewportHeight = window.innerHeight;
        viewportWidth = window.innerWidth;
    } else {
        // 对于一些不支持 window.innerHeight 的旧版浏览器
        viewportHeight = document.documentElement.clientHeight;
        viewportWidth = document.documentElement.clientWidth;
    }
    return {viewportHeight:viewportHeight,viewportWidth:viewportWidth};
}


export { getViewportInfo }
