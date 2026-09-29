const { createApp } = require("../dist/main");

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  handler(req, res);
};
