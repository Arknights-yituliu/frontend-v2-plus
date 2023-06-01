import "@/element/css/message.css";

let send = 1
let messageBars = []
function cMessage(text, type, duration) {
  // let message_wrap = document.createElement("div");
  // message_wrap.className = "message_wrap";
  // message_wrap.id = "message_wrap";
  send++
  let messageBar = document.createElement('div')
  messageBar.className = 'messageBar'
  messageBar.id = 'messageBar' + send
  messageBars.push('messageBar' + send)

  var text = document.createTextNode(text)
  messageBar.appendChild(text)
  document.body.appendChild(messageBar)

  type = type === undefined ? 'success' : type
  setTimeout(function () {
    for (let i in messageBars) {
      document.getElementById(messageBars[i]).style.top = (20+i*40)+'px'
    }
    messageBar.className = 'messageBar_' + type
  }, 500)

  if (duration === undefined) duration = 4000

  setTimeout(function () {
    messageBar.remove()
    messageBars =  messageBars.splice(1)
    // console.log(messageBars)
    for (let i in messageBars) {
      document.getElementById(messageBars[i]).style.top = (20+i*40)+'px'
    }
  }, duration)
}

export { cMessage }
