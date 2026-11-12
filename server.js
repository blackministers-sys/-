const http = require("node:http");
const PUBLIC_KEY = "https://disk.yandex.ru/i/EZWFhqiT0EvkfA";

async function getPreviewUrl() {
  const api = "https://cloud-api.yandex.net/v1/disk/public/resources?public_key=" + encodeURIComponent(PUBLIC_KEY);
  const response = await fetch(api, { headers: { "accept": "application/json" } });
  if (!response.ok) throw new Error("Yandex public resource lookup failed: " + response.status);
  const data = await response.json();
  if (!data.preview) throw new Error("Yandex did not return an image preview URL");
  return data.preview;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    return res.end("ok");
  }
  if (req.url !== "/photo/cat" && req.url !== "/photo/cat/") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  try {
    const previewUrl = await getPreviewUrl();
    const imageResponse = await fetch(previewUrl, { redirect: "follow" });
    if (!imageResponse.ok) throw new Error("Yandex image fetch failed: " + imageResponse.status);
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("Yandex returned a non-image response");
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    res.writeHead(200, {
      "content-type": contentType,
      "content-length": bytes.length,
      "content-disposition": "inline",
      "cache-control": "public, max-age=60",
      "x-content-type-options": "nosniff"
    });
    if (req.method === "HEAD") return res.end();
    res.end(bytes);
  } catch (error) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("Фото временно недоступно. Попробуйте открыть QR-код ещё раз.");
  }
});

const port = Number(process.env.PORT || 10000);
server.listen(port, "0.0.0.0", () => process.stdout.write("QR photo relay listening on " + port + "\n"));
