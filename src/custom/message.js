const style = {
    opacity: '0',
    minWidth: '240px',
    borderRadius: '4px',
    lineHeight: '28px',
    padding: '4px 8px',
    textAlign: 'center',
    position: 'fixed',
    top: '0px',
    left: '50%',
    fontWeight: '600',
    zIndex: '2000',
    transition: 'opacity 0.3s, top 0.5s',
    transform: 'translate(-50%, 0)',
    border:'1px solid #a8ffc1'
}

const colorStyle = {
    success: {
        color: '#3A973AFF',
        background: '#e2ffdb',
        borderColor: '#a8ffc1' // 深绿色
    },
    warn: {
        color: '#fc7303',
        background: '#fcf6ed',
        borderColor: '#c56c02' // 深橙色
    },
    error: {
        color: '#FF4E4EFF',
        background: '#F7E3E3FF',
        borderColor: '#ffa6a6' // 深红色
    }
};

// const color = '#a8ffc1'



let send = 1;
let messageBars = [];

function cMessage(text, type = 'success', duration = 4000) {
    send++;
    let messageBar = document.createElement("div");

    for (const property in style) {
        // messageBar.style.overflow = 'hidden'
        messageBar.style[property] = style[property]
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

export {cMessage};
