const PHOTO_PREFIX = "photos/";
const ALBUM_KEY_NAME = "meta/album.json";
const WISHES_KEY = "meta/wishes.json";
const NOTES_KEY = "meta/notes.json";
const NOTES_RESET_KEY = "meta/notes-reset.json";
const REPLIES_KEY = "meta/replies.json";
const VISITS_KEY = "meta/visits.json";
const PRESENCE_KEY = "meta/presence.json";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 100000;
const MAX_WISHES = 100;
const MAX_NOTES = 500;
const MAX_REPLIES = 5000;
const MAX_VISITS = 5000;
const MAX_PRESENCE = 50;
const PRESENCE_TTL = 45 * 1000;
const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;
const DEFAULT_PHOTO_BYTES = 300 * 1024;

const ALLOWED_HEADERS = "Content-Type, X-Album-Key, X-Admin-Key";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra
    }
  });
}

function albumKey(env) {
  return env.ALBUM_KEY || "";
}

function adminKey(env) {
  return env.ADMIN_KEY || "";
}

function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return Boolean(adminKey(env)) && key === adminKey(env);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readData(env, key, fallback) {
  const object = await env.BUCKET.get(key);
  if (!object) return clone(fallback);
  try {
    return await object.json();
  } catch (error) {
    console.error("[readData]", key, error);
    return clone(fallback);
  }
}

async function writeData(env, key, data) {
  await env.BUCKET.put(key, JSON.stringify(data), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

async function triggerBackup(env) {
  if (!env.GITHUB_BACKUP_TOKEN || !env.GITHUB_BACKUP_REPO) return;
  try {
    await fetch(`https://api.github.com/repos/${env.GITHUB_BACKUP_REPO}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_BACKUP_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "wuyou-worker",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ event_type: "content-changed" })
    });
  } catch (error) {
    console.error("[backup dispatch]", error);
  }
}

function scheduleBackup(env, ctx) {
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(triggerBackup(env));
  }
}

async function readManifest(env) {
  const data = await readData(env, ALBUM_KEY_NAME, { photos: [] });
  return { photos: Array.isArray(data.photos) ? data.photos : [] };
}
async function writeManifest(env, manifest) {
  await writeData(env, ALBUM_KEY_NAME, { photos: manifest.photos || [] });
}
async function readWishes(env) {
  const data = await readData(env, WISHES_KEY, { wishes: [] });
  return { wishes: Array.isArray(data.wishes) ? data.wishes : [] };
}
async function writeWishes(env, wishes) {
  await writeData(env, WISHES_KEY, { wishes: wishes || [] });
}
async function readNotes(env) {
  const data = await readData(env, NOTES_KEY, { notes: [] });
  return { notes: Array.isArray(data.notes) ? data.notes : [] };
}
async function writeNotes(env, notes) {
  await writeData(env, NOTES_KEY, { notes: notes || [] });
}
async function readNotesReset(env) {
  const data = await readData(env, NOTES_RESET_KEY, { clearedAt: 0 });
  return Number(data.clearedAt) || 0;
}
async function readReplies(env) {
  const data = await readData(env, REPLIES_KEY, { replies: [] });
  return Array.isArray(data.replies) ? data.replies : [];
}
async function writeReplies(env, replies) {
  await writeData(env, REPLIES_KEY, { replies: replies || [] });
}
async function readVisits(env) {
  const data = await readData(env, VISITS_KEY, { visits: [] });
  return Array.isArray(data.visits) ? data.visits : [];
}
async function writeVisits(env, visits) {
  await writeData(env, VISITS_KEY, { visits: visits || [] });
}
async function readPresence(env) {
  const data = await readData(env, PRESENCE_KEY, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}
async function writePresence(env, presence) {
  await writeData(env, PRESENCE_KEY, presence || {});
}

function clientIp(request) {
  return String(
    request.headers.get("x-wuyou-client-ip") ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      ""
  )
    .split(",")[0]
    .trim();
}

async function ipHash(ip) {
  if (!ip) return "";
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function geoValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return String(value.name || value.long_name || value.code || value.iso_code || "");
  }
  return String(value);
}

function parseGeo(request) {
  const cf = request.cf || {};
  const proxied = Boolean(request.headers.get("x-wuyou-public-origin"));
  return {
    country: request.headers.get("x-wuyou-country") || (proxied ? "" : geoValue(cf.country)),
    region: request.headers.get("x-wuyou-region") || (proxied ? "" : geoValue(cf.region)),
    city: request.headers.get("x-wuyou-city") || (proxied ? "" : geoValue(cf.city))
  };
}

function imageUrl(origin, id) {
  return `${origin}?image=${encodeURIComponent(id)}`;
}

function publicOrigin(request) {
  const forwarded = request.headers.get("x-wuyou-public-origin");
  return forwarded ? forwarded.replace(/\/$/, "") : new URL(request.url).origin;
}

function publicPhoto(photo, origin) {
  return {
    id: photo.id,
    caption: photo.caption || "",
    width: Number(photo.width) || 0,
    height: Number(photo.height) || 0,
    uploader: photo.uploader || "",
    createdAt: Number(photo.createdAt) || 0,
    src: imageUrl(origin, photo.id)
  };
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sortByCreatedAtAsc(items) {
  return items.slice().sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (method === "GET" && url.searchParams.get("wishes")) {
        const { wishes } = await readWishes(env);
        return json({ wishes: wishes.filter((wish) => wish && typeof wish.id === "string") });
      }

      if (method === "GET" && url.searchParams.get("notes")) {
        const { notes } = await readNotes(env);
        const clearedAt = await readNotesReset(env);
        return json({ notes: notes.filter((note) => note && typeof note.id === "string"), clearedAt });
      }

      if (method === "GET" && url.searchParams.get("health")) {
        const { photos } = await readManifest(env);
        return json({ ok: true, service: "wuyou-api", photos: photos.length, now: Date.now() });
      }

      if (method === "GET" && url.searchParams.get("storage")) {
        const { photos } = await readManifest(env);
        const used = photos.reduce(
          (sum, photo) => sum + (Number(photo && photo.size) || DEFAULT_PHOTO_BYTES),
          0
        );
        const percent = Math.round((used / STORAGE_LIMIT) * 10000) / 100;
        return json({ used, limit: STORAGE_LIMIT, percent, photos: photos.length });
      }

      if (method === "GET" && url.searchParams.get("image")) {
        const id = url.searchParams.get("image");
        const { photos } = await readManifest(env);
        const photo = photos.find((item) => item && item.id === id);
        if (!photo) return json({ error: "photo not found" }, 404);
        const object = await env.BUCKET.get(photo.path);
        if (!object) return json({ error: "image unavailable" }, 404);
        const headers = new Headers(corsHeaders());
        headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(object.body, { status: 200, headers });
      }

      if (
        method === "GET" &&
        (url.searchParams.get("replies") ||
          url.searchParams.get("reply-counts") ||
          url.searchParams.get("visits") ||
          url.searchParams.get("stats") ||
          url.searchParams.get("geo"))
      ) {
        const publicReplyQuery =
          url.searchParams.get("reply-counts") ||
          (url.searchParams.get("replies") &&
            url.searchParams.get("targetType") &&
            url.searchParams.get("targetId"));
        if (!publicReplyQuery && !isAdmin(request, env)) {
          return json({ error: "仅限后台查看" }, 401);
        }

        if (url.searchParams.get("reply-counts")) {
          const replies = await readReplies(env);
          const counts = {};
          replies.forEach((reply) => {
            if (!reply || !reply.targetType || !reply.targetId) return;
            const key = `${reply.targetType}:${reply.targetId}`;
            counts[key] = (counts[key] || 0) + 1;
          });
          return json({ counts });
        }

        if (url.searchParams.get("stats")) {
          const [{ photos }, { wishes }, { notes }, replies, visits] = await Promise.all([
            readManifest(env),
            readWishes(env),
            readNotes(env),
            readReplies(env),
            readVisits(env)
          ]);
          const since = Date.now() - 24 * 60 * 60 * 1000;
          const recent = visits.filter((visit) => Number(visit.createdAt) >= since);
          const regions = {};
          visits.forEach((visit) => {
            const key = [visit.country, visit.region, visit.city].filter(Boolean).join(" / ") || "未知";
            regions[key] = (regions[key] || 0) + 1;
          });
          const topRegions = Object.entries(regions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
          return json({
            photos: photos.length,
            wishes: wishes.length,
            notes: notes.length,
            replies: replies.length,
            visits: visits.length,
            visits24h: recent.length,
            uniqueIps: new Set(visits.map((visit) => visit.ipHash).filter(Boolean)).size,
            topRegions,
            latest: visits.length ? visits[visits.length - 1] : null
          });
        }

        if (url.searchParams.get("geo")) {
          const ip = clientIp(request);
          return json({ ip, ipHash: await ipHash(ip), ...parseGeo(request) });
        }

        if (url.searchParams.get("replies")) {
          const targetType = String(url.searchParams.get("targetType") || "");
          const targetId = String(url.searchParams.get("targetId") || "");
          const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 200));
          const replies = (await readReplies(env))
            .filter(
              (reply) =>
                (!targetType || reply.targetType === targetType) &&
                (!targetId || reply.targetId === targetId)
            )
            .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
          const [{ photos }, { wishes }, { notes }] = await Promise.all([
            readManifest(env),
            readWishes(env),
            readNotes(env)
          ]);
          const target = (reply) => {
            if (reply.targetType === "photo") {
              const photo = photos.find((item) => item && item.id === reply.targetId);
              return photo ? `照片 · ${photo.caption || photo.uploader || photo.id}` : "照片已删除";
            }
            if (reply.targetType === "wish") {
              const wish = wishes.find((item) => item && item.id === reply.targetId);
              return wish ? `约定 · ${String(wish.text || "").slice(0, 60)}` : "约定已删除";
            }
            const note = notes.find((item) => item && item.id === reply.targetId);
            return note ? `留言 · ${String(note.text || "").slice(0, 60)}` : "留言已删除";
          };
          return json({
            replies: replies.slice(-limit).map((reply) => ({ ...reply, targetLabel: target(reply) })),
            total: replies.length
          });
        }

        const region = String(url.searchParams.get("region") || "").trim().toLowerCase();
        const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 50));
        const visits = (await readVisits(env))
          .filter((visit) => {
            if (!region) return true;
            const haystack = `${visit.region || ""} ${visit.city || ""} ${visit.country || ""}`.toLowerCase();
            return haystack.includes(region) || (region === "anhui" && /安徽/.test(haystack));
          })
          .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
        return json({
          visits: visits.slice(-limit),
          latest: visits.length ? visits[visits.length - 1] : null,
          total: visits.length
        });
      }

      if (method === "GET") {
        const { photos } = await readManifest(env);
        const all = photos
          .filter((photo) => photo && typeof photo.id === "string" && typeof photo.path === "string")
          .map((photo) => publicPhoto(photo, publicOrigin(request)))
          .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        const groupOf = (value) => {
          if (value === "xyp" || value === "jia") return "jia";
          if (value === "wc" || value === "gui") return "gui";
          return "shared";
        };
        const counts = { all: all.length, jia: 0, gui: 0, shared: 0 };
        all.forEach((photo) => {
          counts[groupOf(photo.uploader)] += 1;
        });
        const uploader = url.searchParams.get("uploader") || "all";
        const filtered =
          uploader === "all" ? all : all.filter((photo) => groupOf(photo.uploader) === uploader);
        const limitParam = url.searchParams.get("limit");
        if (limitParam !== null || url.searchParams.get("offset") !== null) {
          const limit = Math.max(1, Math.min(120, Number(limitParam) || 24));
          const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
          return json({
            photos: filtered.slice(offset, offset + limit),
            total: filtered.length,
            counts,
            offset,
            limit
          });
        }
        return json({ photos: filtered, total: filtered.length, counts });
      }

      const key = request.headers.get("x-album-key") || "";
      if (key !== albumKey(env)) return json({ error: "共享口令不正确" }, 401);

      if (method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: "请求内容无效" }, 400);

        if (body.action === "visit") {
          const ip = clientIp(request);
          const hash = await ipHash(ip);
          const visits = await readVisits(env);
          const last = visits[visits.length - 1];
          if (!last || last.ipHash !== hash || Date.now() - Number(last.createdAt) > 30000) {
            const geo = parseGeo(request);
            visits.push({
              id: crypto.randomUUID(),
              createdAt: Date.now(),
              ip,
              ipHash: hash,
              country: geo.country,
              region: geo.region,
              city: geo.city,
              path: String(body.path || "").slice(0, 200),
              referrer: String(body.referrer || "").slice(0, 300),
              userAgent: String(request.headers.get("user-agent") || "").slice(0, 300)
            });
            await writeVisits(env, visits.slice(-MAX_VISITS));
          }
          return json({ ok: true });
        }

        if (body.action === "reply") {
          const targetType = String(body.targetType || "");
          const targetId = String(body.targetId || "");
          const text = String(body.text || "").trim().slice(0, 180);
          const author = String(body.author || "").trim().slice(0, 12) || "我们";
          const parentId = String(body.parentId || "").slice(0, 80);
          if (!["photo", "wish", "note"].includes(targetType) || !targetId || !text) {
            return json({ error: "回复内容不完整" }, 400);
          }
          let exists = false;
          if (targetType === "photo") {
            const { photos } = await readManifest(env);
            exists = photos.some((photo) => photo && photo.id === targetId);
          } else if (targetType === "wish") {
            const { wishes } = await readWishes(env);
            exists = wishes.some((wish) => wish && wish.id === targetId);
          } else {
            const { notes } = await readNotes(env);
            exists = notes.some((note) => note && note.id === targetId);
          }
          if (!exists) return json({ error: "被回复的内容不存在" }, 404);
          const replies = await readReplies(env);
          let parent = null;
          if (parentId) {
            parent = replies.find(
              (item) =>
                item &&
                item.id === parentId &&
                item.targetType === targetType &&
                item.targetId === targetId
            );
            if (!parent) return json({ error: "被回复的留言不存在" }, 404);
          }
          if (replies.length >= MAX_REPLIES) return json({ error: "回复已经存满" }, 409);
          const reply = {
            id: crypto.randomUUID(),
            targetType,
            targetId,
            author,
            text,
            createdAt: Date.now(),
            ...(parent ? { parentId: parent.id } : {})
          };
          replies.push(reply);
          await writeReplies(env, replies);
          return json({ ok: true, reply });
        }

        if (body.action === "reply-delete") {
          if (!isAdmin(request, env)) return json({ error: "仅限后台操作" }, 401);
          const id = String(body.id || "");
          const replies = await readReplies(env);
          const next = replies.filter((reply) => reply && reply.id !== id);
          if (next.length === replies.length) return json({ error: "回复不存在" }, 404);
          await writeReplies(env, next);
          return json({ ok: true });
        }

        if (body.action === "visit-delete") {
          if (!isAdmin(request, env)) return json({ error: "仅限后台操作" }, 401);
          const id = String(body.id || "");
          const visits = await readVisits(env);
          const next = visits.filter((visit) => visit && visit.id !== id);
          if (next.length === visits.length) return json({ error: "访问记录不存在" }, 404);
          await writeVisits(env, next);
          return json({ ok: true });
        }

        if (body.action === "migrate-r2") {
          return json({ ok: true, migrated: 0, skipped: 0, failed: [], done: true });
        }

        if (body.action === "presence-clear") {
          await writePresence(env, {});
          return json({ ok: true, count: 0 });
        }

        if (body.action === "presence-leave") {
          const id = String(body.id || "").slice(0, 64);
          if (!id) return json({ error: "缺少在线标识" }, 400);
          const presence = await readPresence(env);
          delete presence[id];
          await writePresence(env, presence);
          return json({ ok: true, count: Object.keys(presence).length });
        }

        if (body.action === "presence") {
          const id = String(body.id || "").slice(0, 64);
          if (!id) return json({ error: "缺少在线标识" }, 400);
          const now = Date.now();
          const presence = await readPresence(env);
          for (const [presenceId, value] of Object.entries(presence)) {
            if (!Number.isFinite(Number(value)) || now - Number(value) > PRESENCE_TTL) {
              delete presence[presenceId];
            }
          }
          presence[id] = now;
          const entries = Object.entries(presence).sort((a, b) => a[1] - b[1]);
          while (entries.length > MAX_PRESENCE) {
            delete presence[entries.shift()[0]];
          }
          await writePresence(env, presence);
          return json({ ok: true, count: Object.keys(presence).length });
        }

        if (body.action === "wish") {
          const text = String(body.text || "").trim().slice(0, 80);
          if (!text) return json({ error: "写点什么再保存" }, 400);
          const author = String(body.author || "").trim().slice(0, 12) || "匿名";
          const manifest = await readWishes(env);
          if (manifest.wishes.length >= MAX_WISHES) {
            return json({ error: "约定已经写满了" }, 409);
          }
          const wish = {
            id: crypto.randomUUID(),
            text,
            author,
            status: "open",
            createdAt: Date.now()
          };
          manifest.wishes.push(wish);
          await writeWishes(env, manifest.wishes);
          scheduleBackup(env, ctx);
          return json({ ok: true, wish });
        }

        if (body.action === "note") {
          const text = String(body.text || "").trim().slice(0, 180);
          if (!text) return json({ error: "写点什么再封存" }, 400);
          const manifest = await readNotes(env);
          const existing = manifest.notes.find(
            (note) => note && note.text === text && Math.abs(Number(note.createdAt) - Date.now()) < 3000
          );
          if (existing) return json({ ok: true, note: existing });
          if (manifest.notes.length >= MAX_NOTES) {
            return json({ error: "时间胶囊已经满了" }, 409);
          }
          const raw = Number(body.createdAt);
          const createdAt =
            Number.isFinite(raw) && raw > 1600000000000 && raw <= Date.now() + 86400000 ? raw : Date.now();
          const clearedAt = await readNotesReset(env);
          if (clearedAt && createdAt <= clearedAt) {
            return json({ error: "留言已经清空，请重新写一条" }, 409);
          }
          const author = String(body.author || "").trim().slice(0, 12) || "我们";
          const note = {
            id: crypto.randomUUID(),
            text,
            author,
            status: "open",
            createdAt
          };
          manifest.notes.push(note);
          await writeNotes(env, manifest.notes);
          scheduleBackup(env, ctx);
          return json({ ok: true, note });
        }

        if (body.action === "note-status") {
          const id = String(body.id || "");
          const status = ["open", "done", "archived"].includes(body.status) ? body.status : "";
          if (!id || !status) return json({ error: "状态不对" }, 400);
          const manifest = await readNotes(env);
          const note = manifest.notes.find((item) => item && item.id === id);
          if (!note) return json({ error: "留言不存在" }, 404);
          note.status = status;
          if (status === "done") note.doneAt = Date.now();
          if (status === "archived") note.archivedAt = Date.now();
          await writeNotes(env, manifest.notes);
          scheduleBackup(env, ctx);
          return json({ ok: true, note });
        }

        if (body.action === "notes-clear") {
          const clearedAt = Date.now();
          await writeNotes(env, []);
          await writeData(env, NOTES_RESET_KEY, { clearedAt });
          scheduleBackup(env, ctx);
          return json({ ok: true, clearedAt });
        }

        if (body.action === "wish-status") {
          const id = String(body.id || "");
          const status = ["open", "done", "archived"].includes(body.status) ? body.status : "";
          if (!id || !status) return json({ error: "状态不对" }, 400);
          const manifest = await readWishes(env);
          const wish = manifest.wishes.find((item) => item && item.id === id);
          if (!wish) return json({ error: "约定不存在" }, 404);
          wish.status = status;
          if (status === "done") wish.doneAt = Date.now();
          if (status === "archived") wish.archivedAt = Date.now();
          await writeWishes(env, manifest.wishes);
          scheduleBackup(env, ctx);
          return json({ ok: true, wish });
        }

        if (body.action === "caption") {
          if (!body.id) return json({ error: "缺少照片 id" }, 400);
          const manifest = await readManifest(env);
          const photo = manifest.photos.find((item) => item && item.id === body.id);
          if (!photo) return json({ error: "照片不存在" }, 404);
          photo.caption = String(body.caption || "").slice(0, 60);
          await writeManifest(env, manifest);
          scheduleBackup(env, ctx);
          return json({ ok: true, photo: publicPhoto(photo, publicOrigin(request)) });
        }

        if (typeof body.image !== "string") return json({ error: "缺少图片数据" }, 400);
        const match = body.image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
        if (!match) return json({ error: "图片格式不支持" }, 400);
        const base64 = match[2];
        const bytes = Math.floor(base64.length * 0.75);
        if (bytes > MAX_BYTES) return json({ error: "图片太大" }, 413);

        const manifest = await readManifest(env);
        if (manifest.photos.length >= MAX_PHOTOS) {
          return json({ error: `最多保存 ${MAX_PHOTOS} 张照片` }, 409);
        }

        const id = crypto.randomUUID();
        const path = `${PHOTO_PREFIX}${id}.jpg`;
        const binary = base64ToBytes(base64);
        await env.BUCKET.put(path, binary, {
          httpMetadata: { contentType: "image/jpeg" }
        });

        const photo = {
          id,
          path,
          caption: String(body.caption || "").slice(0, 60),
          width: Number(body.width) || 0,
          height: Number(body.height) || 0,
          uploader: String(body.uploader || "").slice(0, 20),
          size: bytes,
          createdAt: Date.now()
        };
        manifest.photos.push(photo);
        await writeManifest(env, manifest);
        scheduleBackup(env, ctx);
        return json({ ok: true, photo: publicPhoto(photo, publicOrigin(request)) });
      }

      if (method === "DELETE") {
        const noteId = url.searchParams.get("note");
        if (noteId) {
          const manifest = await readNotes(env);
          const exists = manifest.notes.some((note) => note && note.id === noteId);
          if (!exists) return json({ error: "留言不存在" }, 404);
          await writeNotes(env, manifest.notes.filter((note) => note && note.id !== noteId));
          scheduleBackup(env, ctx);
          return json({ ok: true });
        }

        const wishId = url.searchParams.get("wish");
        if (wishId) {
          const manifest = await readWishes(env);
          const exists = manifest.wishes.some((wish) => wish && wish.id === wishId);
          if (!exists) return json({ error: "约定不存在" }, 404);
          await writeWishes(env, manifest.wishes.filter((wish) => wish && wish.id !== wishId));
          scheduleBackup(env, ctx);
          return json({ ok: true });
        }

        const id = url.searchParams.get("id");
        if (!id) return json({ error: "缺少照片 id" }, 400);
        const manifest = await readManifest(env);
        const photo = manifest.photos.find((item) => item && item.id === id);
        if (!photo) return json({ error: "照片不存在" }, 404);
        try {
          await env.BUCKET.delete(photo.path);
        } catch (error) {
          console.error("[delete photo]", error);
        }
        manifest.photos = manifest.photos.filter((item) => item && item.id !== id);
        await writeManifest(env, manifest);
        scheduleBackup(env, ctx);
        return json({ ok: true });
      }

      return json({ error: "method not allowed" }, 405);
    } catch (error) {
      console.error("[wuyou-api]", error);
      return json(
        { error: "相册服务暂时不可用", detail: String((error && error.message) || error).slice(0, 200) },
        500
      );
    }
  }
};
