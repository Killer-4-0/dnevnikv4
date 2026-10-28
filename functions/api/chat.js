// Cloudflare Pages Function: прокси для Munito API (обход CORS).
// Ничего вручную загружать не нужно: поместите этот файл в репозиторий
// (папка functions/api/), и Cloudflare Pages сам подхватит его при деплое.
// Тогда «Прокси» в приложении = адрес вашего сайта на Pages,
// например https://dnevnik-v3.pages.dev

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

export async function onRequest(context) {
  const request = context.request;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "POST") {
    return json({ error: { message: "Not found" } }, 404);
  }

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
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
