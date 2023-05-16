function OPmessage(text) {
  let message_wrap = document.createElement("div");
  message_wrap.className = "message_wrap";
  message_wrap.id = "message_wrap";
  let messageBar = document.createElement("div");
  messageBar.id = "messageBar" + new Date().getTime();
  messageBar.className = "messageBar";
  var text = document.createTextNode(text);
  messageBar.appendChild(text);
  let message_wrapDom = document.getElementById("message_wrap");
  if (message_wrapDom != undefined) {
    message_wrapDom.appendChild(messageBar);
  } else {
    message_wrap.appendChild(messageBar);
    document.body.appendChild(message_wrap);
  }

  setTimeout(function () {
    message_wrap.className = "message_wrap message_wrap_open";
  }, 30);

  setTimeout(function () {
    messageBar.remove();
  }, 4000);
}

export { OPmessage };
