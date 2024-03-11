import history  from 'connect-history-api-fallback'
import express from "express";

const server = express()
const port = 3000


server.use(express.static('dist'))

server.use(history())



server.listen(port, () => console.log(`服务于端口 ${port} 开启成功!`))
