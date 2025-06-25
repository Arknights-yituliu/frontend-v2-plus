// Note that this file isn't processed by Vite, see https://github.com/brillout/vite-plugin-ssr/issues/562

const express = require("express");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const { renderPage } = require("vite-plugin-ssr/server");

const isProduction = process.env.NODE_ENV === "production";
const root = `${__dirname}/..`;

startServer();

async function startServer() {
  const app = express();

  app.use(compression());
  app.use(cookieParser());

  if (isProduction) {
    const sirv = require("sirv");
    app.use(sirv(`${root}/dist/client`));
  } else {
    const vite = require("vite");
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true },
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  app.get("*", async (req, res, next) => {
    theme = req.cookies.theme || "light";
    const pageContextInit = {
      urlOriginal: req.originalUrl,
      theme: theme,
    };
    const pageContext = await renderPage(pageContextInit);
    const { httpResponse } = pageContext;
    if (!httpResponse) return next();
    // const { body, statusCode, contentType, earlyHints } = httpResponse;
    // if (res.writeEarlyHints) res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) });
    const { body, statusCode, contentType } = httpResponse;
    res.status(statusCode).type(contentType).send(body);
  });

  const port = process.env.PORT || 3000;
  app.listen(port);
  console.log(`Server running at http://localhost:${port}`);
}
