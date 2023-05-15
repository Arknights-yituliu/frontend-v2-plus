
 function OPmessage(text) {
    let message_wrap = document.createElement("div");
    message_wrap.className = "message_wrap";
    let messageBar = document.createElement("div");
    messageBar.className = "messageBar";
    var text = document.createTextNode(text);
    messageBar.appendChild(text);
    message_wrap.appendChild(messageBar);
    document.body.appendChild(message_wrap);

    setTimeout(function () {
      message_wrap.className = "message_wrap message_wrap_open";
    }, 30);

    setTimeout(function () {
      message_wrap.remove();
    }, 4000);
  }

  export{
    OPmessage
  }

