import history  from 'connect-history-api-fallback'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import express from "express";

const server = express()
const port = 3000

import stage from '/src/pages/material/stageV3.page.vue'

server.get('/', (req, res) => {
    const app = createSSRApp(stage)

    renderToString(app).then((html) => {
        res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Vue SSR Example</title>
      </head>
      <body>
        <div id="app">${html}</div>
      </body>
    </html>
    `)
    })
})


server.use(history())
server.use(express.static('dist'))

server.listen(port, () => console.log(`服务于端口 ${port} 开启成功!`))
