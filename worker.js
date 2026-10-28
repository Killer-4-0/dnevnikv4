// Cloudflare Worker: прокси для Munito API (обходит CORS-блокировку браузера).
// Как запустить (2 минуты, бесплатно):
//   1. Откройте https://dash.cloudflare.com → Workers & Pages → Create → Worker
//   2. Удалите код по умолчанию, вставьте этот файл целиком → Deploy
//   3. Скопируйте адрес вида https://имя-воркера.работник.workers.dev
//   4. В приложении: Настройки → ИИ → «Прокси» → вставьте адрес → Сохранить
// Лимиты бесплатного тарифа: 100 000 запросов в день.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (request.method !== "POST") return json({ error: { message: "Not found" } }, 404);

    let cfg;
    try { cfg = await request.json(); }
    catch { return json({ error: { message: "Invalid JSON" } }, 400); }

    const { url, key, model, messages } = cfg || {};
    if (!url || !/^https:\/\/[^/]+/i.test(url)) return json({ error: { message: "Missing or invalid url" } }, 400);
    if (!key) return json({ error: { message: "Missing key" } }, 400);
    if (!Array.isArray(messages)) return json({ error: { message: "Missing messages" } }, 400);

    const upstream = await fetch(url.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({ model: model || "gpt-4o-mini", messages, stream: false })
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    });
  }
};
