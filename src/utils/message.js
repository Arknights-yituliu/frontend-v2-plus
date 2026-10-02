const BaseStyle = {
    opacity: '0',
    // minWidth: '240px',
    width:'fit-content',
    borderRadius: '4px',
    lineHeight: '24px',
    padding: '4px 12px',
    textAlign: 'center',
    position: 'fixed',
    top: '0px',
    fontSize: '14px',
    display: "flex",
    left: '50%',
    margin: 'auto',
    fontWeight: '600',
    zIndex: '3000',
    transition: 'opacity 0.3s, top 0.5s',
    transform: 'translate(-50%)',
    border: '1px solid #a8ffc1'
}

const colorStyle = {
    success: {
        color: '#4CAF50',
        background: '#ecf6ed',
        borderColor: '#4CAF50' // 深绿色
    },
    warn: {
        color: '#fc7303',
        background: '#fcf6ed',
        borderColor: '#ffc885' // 深橙色
    },
    error: {
        color: '#FF4E4EFF',
        background: '#f8ecec',
        borderColor: '#ffc5c5' // 深红色
    },
    info: {
        color: '#2196F3',
        background: '#f2f9fd',
        borderColor: '#bee9ff' // 深红色
    }
};

// const color = '#a8ffc1'


let send = 1;
let messageBars = [];

/**
 * 消息渲染的统一实现：创建元素、套用色板、淡入淡出并在到期后销毁
 * @param {string} text 消息内容
 * @param {string} type 消息类型，取 colorStyle 的键：success / warn / error / info
 * @param {number} duration 持续时间（毫秒），未传或传 0 时取 4000
 */
function showMessage(text, type, duration) {
    if (!duration) {
        duration = 4000;
    }

    send++;

    //创建一个message元素
    let messageBar = document.createElement("div");

    //赋予message元素基础样式
    Object.assign(messageBar.style, BaseStyle);

    //赋予message元素的特殊样式（type 非法时 colorStyle[type] 为 undefined，Object.assign 会跳过，与原 for...in 行为一致）
    Object.assign(messageBar.style, colorStyle[type]);

    //赋予message元素独立id
    messageBar.id = "messageBar" + send;
    messageBars.push(messageBar.id);

    // const textElement = document.createTextNode(text);
    // messageBar.appendChild(textElement);

    //向message元素写入文本

    messageBar.textContent = text
    document.body.appendChild(messageBar);

    // const componentsContainer = document.getElementById("components-container-w1i3dqk");
    // //将message元素加入根元素
    // componentsContainer.appendChild(messageBar);

    //重新计算堆叠位置：已销毁的条目会先从列表移除，这里再兜底判空
    const relayout = () => {
        messageBars.forEach((barId, index) => {
            const bar = document.getElementById(barId);
            if (bar) {
                bar.style.top = 20 + index * 50 + "px";
            }
        });
    };

    setTimeout( ()=> {
        messageBar.style.opacity = '1'; //淡入
        relayout();
    }, 16);

    // 淡出
    setTimeout(()=>  {
        messageBar.style.opacity = '0';
    }, duration - 300); // 在消息消失前300ms开始淡出，与transition保持一致

    //在持续时间结束后将message元素销毁，将message列表中未过期的message元素向上移动
    setTimeout(()=>  {
        messageBar.remove();
        //按自身 id 精确移除，不依赖销毁顺序（各条消息 duration 可不同）
        messageBars = messageBars.filter((barId) => barId !== messageBar.id);
        relayout();
    }, duration);
}

/**
 * 对象入参形式的消息提示
 * @param {{type:string,text:string,duration:number}} config 消息配置
 * @example
 * 传入参数
 * {
 * type:消息类型,
 * text:消息内容,
 * duration:持续时间
 * }
 */
function createMessage(config) {
    showMessage(config.text, config.type, config.duration);
}

/**
 * 位置参数形式的消息提示
 * @param {string} text 消息内容
 * @param {string} type 消息类型，取 colorStyle 的键：success / warn / error / info，默认 success
 * @param {number} duration 持续时间（毫秒），默认 4000
 */
function cMessage(text, type = 'success', duration = 4000) {
    showMessage(text, type, duration);
}

export {cMessage, createMessage};
