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
#photo{display:block;width:100vw;height:100vh;height:100dvh;object-fit:contain;object-position:center center}
#error{display:none;padding:24px;max-width:600px;text-align:center;font:16px/1.5 Arial,sans-serif;color:#222;overflow-wrap:anywhere}
</style>
</head>
<body>
<img id="photo" alt="Праздничная открытка">
<div id="error">Не удалось загрузить открытку. <span id="detail"></span></div>
<script>
fetch("/image/card",{cache:"no-store"}).then(async r=>{
  const type=r.headers.get("content-type")||"";
  if(!r.ok || !type.startsWith("image/")) {
    const msg=await r.text();
    throw new Error("Сервер вернул "+r.status+". "+msg);
  }
  const blob=await r.blob();
  document.getElementById("photo").src=URL.createObjectURL(blob);
}).catch(e=>{
  document.getElementById("photo").style.display="none";
  document.getElementById("error").style.display="block";
  document.getElementById("detail").textContent=e.message;
});
</script>
</body>
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
      const downloadUrl = await getOriginalDownloadUrl();
      const imageResponse = await fetch(downloadUrl, { redirect: "follow" });
      if (!imageResponse.ok) throw new Error("Yandex file download returned " + imageResponse.status);
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) throw new Error("Yandex returned non-image content: " + contentType);
      const bytes = Buffer.from(await imageResponse.arrayBuffer());
      res.writeHead(200, { "content-type": contentType, "content-length": bytes.length, "content-disposition": "inline", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" });
      if (req.method === "HEAD") return res.end();
      return res.end(bytes);
    } catch (error) {
      process.stderr.write("IMAGE_FETCH_ERROR: " + (error?.stack || error) + "\n");
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      return res.end("Ошибка получения изображения: " + (error?.message || "неизвестная ошибка"));
    }
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => process.stdout.write("QR photo relay listening on " + port + "\n"));
