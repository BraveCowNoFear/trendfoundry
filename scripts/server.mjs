import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { buildAuthClientConfig, handleAuthApi } from "./lib/auth_broker.mjs";

const port = Number(process.env.PORT || 4173);
const siteDir = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.join(process.cwd(), "site");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(response, payload) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload, null, 2));
}

createServer(async (request, response) => {
  if (await handleAuthApi(request, response)) return;

  const url = new URL(request.url, `http://localhost:${port}`);
  if (url.pathname === "/auth/auth.config.json") {
    sendJson(response, buildAuthClientConfig(request));
    return;
  }

  const safePath = decodeURIComponent(url.pathname)
    .replace(/^\/+/, "")
    .replace(/\.\./g, "");
  const filePath = path.join(siteDir, safePath || "index.html");
  const finalPath = existsSync(filePath)
    ? statSync(filePath).isDirectory()
      ? path.join(filePath, "index.html")
      : filePath
    : path.join(siteDir, "index.html");
  response.setHeader("content-type", types[path.extname(finalPath)] || "application/octet-stream");
  createReadStream(finalPath).pipe(response);
}).listen(port, () => {
  console.log(`TrendFoundry site running at http://localhost:${port}`);
});
