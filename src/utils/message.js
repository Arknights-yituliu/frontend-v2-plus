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
 *
 * @param {{type:string,text:string,duration:number}} config  消息配置
 * @example
 * 传入参数
 * {
 * type:消息类型,
 * text:消息内容,
 * duration:持续时间
 * }
 */
function createMessage(config) {
    let {text, duration, type} = config;
    if (!duration) {
        duration = 4000;
    }


    send++;

    //创建一个message元素
    let messageBar = document.createElement("div");

    //赋予message元素基础样式
    for (const property in BaseStyle) {
        messageBar.style[property] = BaseStyle[property]
    }

    //赋予message元素的特殊样式
    for (const property in colorStyle[type]) {
        messageBar.style[property] = colorStyle[type][property]
    }

    //赋予message元素独立id
    messageBar.id = "messageBar" + send;
    messageBars.push("messageBar" + send);

    // const textElement = document.createTextNode(text);
    // messageBar.appendChild(textElement);

    //向message元素写入文本

    messageBar.textContent = text
    document.body.appendChild(messageBar);

    // const componentsContainer = document.getElementById("components-container-w1i3dqk");
    // //将message元素加入根元素
    // componentsContainer.appendChild(messageBar);



    setTimeout( ()=> {
        messageBar.style.opacity = '1'; //淡入
        for (let i in messageBars) {
            document.getElementById(messageBars[i]).style.top = 20 + i * 50 + "px";
        }
    }, 16);

    // 淡出
    setTimeout(()=>  {
        messageBar.style.opacity = '0';
    }, duration - 300); // 在消息消失前300ms开始淡出，与transition保持一致

    //在持续时间结束后将message元素销毁，将message列表中未过期的message元素向上移动
    setTimeout(()=>  {
        messageBar.remove();
        messageBars = messageBars.splice(1);
        // console.log(messageBars)
        for (let i in messageBars) {
            document.getElementById(messageBars[i]).style.top = 20 + i * 50 + "px";
        }
    }, duration);


}

function cMessage(text, type = 'success', duration = 4000) {
    send++;
    let messageBar = document.createElement("div");

    for (const property in BaseStyle) {
        // messageBar.style.overflow = 'hidden'
        messageBar.style[property] = BaseStyle[property]
    }


    messageBar.id = "messageBar" + send;
    messageBars.push("messageBar" + send);

    // const textElement = document.createTextNode(text);
    // messageBar.appendChild(textElement);
    messageBar.textContent = text
    document.body.appendChild(messageBar);


    for (const property in colorStyle[type]) {
        messageBar.style[property] = colorStyle[type][property]
    }

    setTimeout(function () {
        messageBar.style.opacity = '1'; //淡入
        for (let i in messageBars) {
            document.getElementById(messageBars[i]).style.top = 20 + i * 50 + "px";
        }
    }, 16);

    // 淡出
    setTimeout(function () {
        messageBar.style.opacity = '0';
    }, duration - 300); // 在消息消失前300ms开始淡出，与transition保持一致

    setTimeout(function () {
        messageBar.remove();
        messageBars = messageBars.splice(1);
        // console.log(messageBars)
        for (let i in messageBars) {
            document.getElementById(messageBars[i]).style.top = 20 + i * 50 + "px";
        }
    }, duration);

}

export {cMessage, createMessage};
