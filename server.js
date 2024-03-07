import pkg from 'express'
import history  from 'connect-history-api-fallback' 

const { Express } = pkg
const port = 3000

const app = pkg()

app.use(history())

app.use(pkg.static('dist'))

app.all(function (req, res, next) {
  // Your 404 logic here
})

app.listen(port, () => console.log(`服务于端口 ${port} 开启成功!`))
