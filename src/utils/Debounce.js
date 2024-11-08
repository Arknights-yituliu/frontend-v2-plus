import {cMessage} from "./Message.js";

/**
 * 函数防抖
 * @param {function(...[*])} func 传入一个函数
 * @param {number} duration  防抖间隔时间 单位ms
 * @returns {(function(...[*]): void)|*} 返回一个参数可空的函数
 */
function debounce(func, duration = 500) {
    let timeout = 0;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, duration);
    };
}

/**
 * 节流函数 执行间隔内（当前时间-传入时间）只会执行一次函数
 * @param {function(...[*])} func 传入一个函数
 * @param {Date} begin 传入一个时间，需要在传入的函数中将他再次赋值为当前时间
 * @param {number} delay 执行函数间隔
 * @param {string} message 操作频繁时的弹窗消息提示内容
 * @returns {(function(...[*]): void)|*} 返回一个参数可空的函数
 */
function throttle(func,begin, delay = 500,message = '操作过于频繁') {
    const current = new Date();
    return function (...args) {
        if(current - begin >=delay){
            func.apply(this, args);
        }else {
            cMessage(message)
        }
    };
}




export {
    debounce, throttle
}