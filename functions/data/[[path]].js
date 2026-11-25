// 25 MiB dan katta fayllarni (ant.pdf) bo'laklardan yig'ib, AYNAN o'sha manzildan beradi.
// Bo'laklar va ro'yxat: <fayl>.part00, .part01 ..., <fayl>.parts.json — tools/cf-build.sh yaratadi.
// Qaysi manzillar shu yerga keladi: dist/_routes.json. Range (sahifalab yuklash) qo'llab-quvvatlanadi.

async function manifest(env, url) {
  const r = await env.ASSETS.fetch(new URL(url.pathname + ".parts.json", url.origin));
  if (!r.ok) return null;
  const m = await r.json();
  let at = 0;
  for (const p of m.parts) { p.start = at; at += p.size; }
  return m;
}

// Bo'lakning [from, to] (ikkalasi ham kiradi) baytlari oqimi. Server Range'ni bajarmasa, qo'lda kesiladi.
async function pieceStream(env, origin, dir, part, from, to) {
  const whole = from === 0 && to === part.size - 1;
  const res = await env.ASSETS.fetch(new Request(new URL(dir + part.name, origin),
    whole ? {} : { headers: { range: `bytes=${from}-${to}` } }));
  if (!res.ok || !res.body) throw new Error("part " + part.name + " " + res.status);
  if (whole || res.status === 206) return res.body;
  let skip = from, left = to - from + 1;
  return res.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      if (left <= 0) return;
      if (skip >= chunk.length) { skip -= chunk.length; return; }
      const piece = chunk.subarray(skip, skip + left);
      skip = 0; left -= piece.length;
      ctl.enqueue(piece);
    }
  }));
}

function parseRange(h, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((h || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start, end;
  if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start > end || start >= size) return "bad";
  return { start, end };
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
  const url = new URL(request.url);
  const m = await manifest(env, url);
  if (!m) return env.ASSETS.fetch(request);

  const etag = `"${m.etag}"`;
  // Diqqat: alvoramed.com domeni orqali Cloudflare "Range" sarlavhasini funksiyaga yetkazmaydi.
  // Shuning uchun butun fayl javobida "accept-ranges" e'lon qilinmaydi: PDF.js bo'laklab so'rash o'rniga
  // faylni bir marta oqim bilan yuklaydi (service worker uni keshlab, keyin internetsiz ochadi).
  // Range kelsa (masalan *.pages.dev da), u baribir to'g'ri bajariladi.
  const h = new Headers({
    "content-type": m.type || "application/octet-stream",
    "etag": etag,
    // CDN keshlamasin va siqmasin (no-transform): aks holda domen orqali Range so'rovlariga
    // butun fayl (200) qaytadi va content-length yo'qoladi
    "cache-control": "private, max-age=3600, no-transform",
    "x-content-type-options": "nosniff"
  });
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: h });

  let range = request.headers.has("range") ? parseRange(request.headers.get("range"), m.size) : null;
  if (range === "bad") {
    h.set("content-range", `bytes */${m.size}`);
    return new Response(null, { status: 416, headers: h });
  }
  if (range) h.set("accept-ranges", "bytes");
  const start = range ? range.start : 0, end = range ? range.end : m.size - 1;
  h.set("content-length", String(end - start + 1));
  if (range) h.set("content-range", `bytes ${start}-${end}/${m.size}`);
  const status = range ? 206 : 200;
  if (request.method === "HEAD") return new Response(null, { status, headers: h });

  const dir = url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
  const parts = m.parts.filter((p) => p.start <= end && p.start + p.size - 1 >= start);
  // FixedLengthStream: javobda aniq content-length bo'ladi (bo'lakli uzatish emas)
  const { readable, writable } = new FixedLengthStream(end - start + 1);
  (async () => {
    try {
      for (const p of parts) {
        const from = Math.max(start, p.start) - p.start;
        const to = Math.min(end, p.start + p.size - 1) - p.start;
        const s = await pieceStream(env, url.origin, dir, p, from, to);
        await s.pipeTo(writable, { preventClose: true });
      }
      await writable.close();
    } catch (e) {
      await writable.abort(e);
    }
  })();
  return new Response(readable, { status, headers: h });
}
