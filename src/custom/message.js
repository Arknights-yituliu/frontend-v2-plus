

const style = {
    minWidth: '240px',
    borderRadius: '2px',
    lineHeight: '28px',
    // height: '28px',
    textAlign: 'center',
    position: 'fixed',
    top: '0px',
    left: '50%',
    fontWeight: '600',
    zIndex: '2000',
    transition: 'all 0.3s',
    transform: 'translate(-50%, 0)'
}

const colorStyle = {
    success: {
        color: '#3A973AFF',
        background: '#e2ffdb'
    },
    error: {
        color: '#FF4E4EFF',
        background: '#F7E3E3FF'
    }

}



let send = 1;
let messageBars = [];

function cMessage(text, type = 'success', duration= 4000) {
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
        for (let i in messageBars) {
            document.getElementById(messageBars[i]).style.top = 20 + i * 50 + "px";
        }
    }, 16);


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
