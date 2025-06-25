import history  from 'connect-history-api-fallback'
import express from "express";

const server = express()
const port = 4000

server.use(history())
server.use(express.static('dist'))

server.listen(port, () => console.log(`服务于端口 ${port} 开启成功!`))
