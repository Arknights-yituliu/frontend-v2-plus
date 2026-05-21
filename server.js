import history  from 'connect-history-api-fallback'
import express from "express";

const server = express()
const port = 4000

server.get('/official-news-proxy/*', async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/official-news-proxy/, '') || '/'
    const targetUrl = new URL(targetPath, 'https://ak.hypergryph.com')
    const response = await fetch(targetUrl, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0'
      }
    })
    const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8'
    const body = await response.arrayBuffer()

    res.status(response.status)
    res.setHeader('content-type', contentType)
    res.send(Buffer.from(body))
  } catch (error) {
    res.status(502).json({
      message: '官网新闻代理请求失败',
      detail: error?.message || String(error)
    })
  }
})

server.use(history())
server.use(express.static('dist'))

server.listen(port, () => console.log(`服务于端口 ${port} 开启成功!`))
