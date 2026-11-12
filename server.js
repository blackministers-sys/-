const http = require("node:http");
const PUBLIC_KEY = "https://disk.yandex.ru/i/iKHPHTsEsdU1Ug";

async function getOriginalDownloadUrl() {
  const api = "https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=" + encodeURIComponent(PUBLIC_KEY);
  const response = await fetch(api, { headers: { "accept": "application/json" } });
  if (!response.ok) throw new Error("Yandex download URL lookup failed: " + response.status);
  const data = await response.json();
  if (!data.href) throw new Error("Yandex did not return a download URL");
  return data.href;
}

const page = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>Открытка</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;background:#fff}
body{display:flex;align-items:center;justify-content:center;overflow:hidden}
img{display:block;width:100vw;height:100vh;height:100dvh;object-fit:contain;object-position:center center}
</style>
</head>
<body><img src="/image/card" alt="Праздничная открытка"></body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    return res.end("ok");
  }
  if (req.url === "/photo/card" || req.url === "/photo/card/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    return res.end(page);
  }
  if (req.url === "/image/card") {
    try {
      const downloadUrl = await getOriginalDownloadUrl();
      const imageResponse = await fetch(downloadUrl, { redirect: "follow" });
      if (!imageResponse.ok) throw new Error("Yandex image fetch failed: " + imageResponse.status);
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) throw new Error("Yandex returned a non-image response");
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      res.writeHead(200, { "content-type": contentType, "content-length": bytes.length, "content-disposition": "inline", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" });
      if (req.method === "HEAD") return res.end();
      return res.end(bytes);
    } catch (error) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      return res.end("Открытка временно недоступна. Попробуйте открыть QR-код ещё раз.");
    }
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => process.stdout.write("QR photo relay listening on " + port + "\n"));
