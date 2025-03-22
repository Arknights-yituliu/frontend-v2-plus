function addScrollListener(func){
    // 绑定scroll事件到window对象上，保证在页面任何地方滚动都能触发
    if (window.addEventListener) {
        // 现代浏览器
        window.addEventListener('scroll', func, { passive: true });
    } else if (window.attachEvent) {
        // 对于IE浏览器
        window.attachEvent('onscroll', func);
    } else {
        // 对于不支持以上两种方法的老版本浏览器
        window.onscroll = func;
    }
}

export {
    addScrollListener
}

