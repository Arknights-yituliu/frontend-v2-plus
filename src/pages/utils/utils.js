import {cMessage} from "../../custom/message";

/**
 * 函数防抖
 * @param {function(...[*])} func 传入一个函数
 * @param {number} duration  防抖间隔时间
 * @returns {(function(...[*]): void)|*} 返回一个参数可空的函数
 */
function debounce(func, duration = 500) {
    let timeout;
    return function (...args) {

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
            console.log('最终执行')
        }, duration);
    };
}

/**
 * 节流函数 执行间隔内只会执行一次函数
 * @param {function(...[*])} func 传入一个函数
 * @param {Date} begin 开始时间，需要在传入的函数中将他再次赋值为当前时间
 * @param {number} delay 执行函数间隔
 * @returns {(function(...[*]): void)|*} 返回一个参数可空的函数
 */
function throttle(func,begin, delay = 500) {
    const current = new Date();
    return function (...args) {
        console.log(current - begin )
        if(current - begin >=delay){
            func.apply(this, args);
            console.log('最终执行')
        }else {
            cMessage('正在加载中')
        }
    };
}


export default {
    debounce, throttle
}