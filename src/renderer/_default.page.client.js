export { render };

import { createVPSApp } from "./app";

async function render(pageContext) {
  const clientOnly = document.getElementById("client_only") != null;
  const app = createVPSApp(pageContext, clientOnly);
  app.mount("#app");
}
