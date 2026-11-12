const http = require("node:http");
const PUBLIC_KEY = "https://disk.yandex.ru/i/iKHPHTsEsdU1Ug";

async function getOriginalDownloadUrl() {
  const api = "https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=" + encodeURIComponent(PUBLIC_KEY);
  const response = await fetch(api, { headers: { "accept": "application/json" } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error("Yandex API returned " + response.status + ": " + body.slice(0, 400));
  }
  const data = await response.json();
  if (!data.href) throw new Error("Yandex API response has no download URL");
  return data.href;
}

let imageCache = null;
let imageCachePromise = null;

async function getCachedImage() {
  if (imageCache) return imageCache;
  if (imageCachePromise) return imageCachePromise;

  imageCachePromise = (async () => {
    const downloadUrl = await getOriginalDownloadUrl();
    const upstream = await fetch(downloadUrl, { headers: { "accept": "image/*,*/*" } });
    if (!upstream.ok) throw new Error("Image download returned " + upstream.status);
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("Expected image, received " + contentType);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length < 1000) throw new Error("Image response is unexpectedly small: " + bytes.length + " bytes");
    imageCache = { bytes, contentType };
    process.stdout.write("POSTCARD_CACHE_READY: " + bytes.length + " bytes\n");
    return imageCache;
  })();

  try {
    return await imageCachePromise;
  } catch (error) {
    imageCachePromise = null;
    throw error;
  }
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
  if (req.url === "/" || req.url === "/photo/card" || req.url === "/photo/card/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    return res.end(page);
  }
  if (req.url === "/image/card") {
    try {
      const { bytes, contentType } = await getCachedImage();
      res.writeHead(200, {
        "content-type": contentType,
        "content-length": bytes.length,
        "content-disposition": "inline; filename=postcard",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      });
      return req.method === "HEAD" ? res.end() : res.end(bytes);
    } catch (error) {
      process.stderr.write("POSTCARD_IMAGE_ERROR: " + error.message + "\\n");
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      return res.end("Не удалось загрузить открытку");
    }
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => {
  process.stdout.write("QR photo relay listening on " + port + "\n");
  getCachedImage().catch(error => process.stderr.write("POSTCARD_PRELOAD_ERROR: " + error.message + "\n"));
});
