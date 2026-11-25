// Katta fayllarni (25 MiB dan katta PDF'lar) R2'dan beradi — manzil o'zgarmaydi.
// Qaysi manzillar shu yerga keladi: dist/_routes.json (tools/cf-build.sh yozadi).
// Pages loyihasida R2 bog'lanishi: FILES -> alvoramed-files.

const TYPES = { pdf: "application/pdf" };

function baseHeaders(obj) {
  const h = new Headers();
  obj.writeHttpMetadata(h);
  const ext = obj.key.split(".").pop().toLowerCase();
  if (!h.get("content-type")) h.set("content-type", TYPES[ext] || "application/octet-stream");
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("cache-control", "public, max-age=3600");
  return h;
}

async function serve({ request, env, params }) {
  if (!env.FILES) return new Response("R2 ulanmagan", { status: 500 });
  const key = "data/" + [].concat(params.path || []).join("/");

  if (request.method === "HEAD") {
    const head = await env.FILES.head(key);
    if (!head) return new Response(null, { status: 404 });
    const h = baseHeaders(head);
    h.set("content-length", String(head.size));
    return new Response(null, { headers: h });
  }

  const hasRange = request.headers.has("range");
  const obj = await env.FILES.get(key, hasRange ? { range: request.headers } : undefined);
  if (!obj) return new Response("Topilmadi", { status: 404 });

  const h = baseHeaders(obj);
  if (hasRange && obj.range) {
    const r = obj.range;
    const offset = "offset" in r ? r.offset : Math.max(0, obj.size - r.suffix);
    const length = "length" in r && r.length !== undefined ? r.length : obj.size - offset;
    h.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    h.set("content-length", String(length));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(obj.body, { headers: h });
}

export const onRequestGet = serve;
export const onRequestHead = serve;
