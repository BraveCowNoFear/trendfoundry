import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const port = Number(process.env.PORT || 4173);
const siteDir = path.join(process.cwd(), "site");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

createServer((request, response) => {
  const safePath = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname)
    .replace(/^\/+/, "")
    .replace(/\.\./g, "");
  const filePath = path.join(siteDir, safePath || "index.html");
  const finalPath = existsSync(filePath) ? filePath : path.join(siteDir, "index.html");
  response.setHeader("content-type", types[path.extname(finalPath)] || "application/octet-stream");
  createReadStream(finalPath).pipe(response);
}).listen(port, () => {
  console.log(`TrendFoundry site running at http://localhost:${port}`);
});
