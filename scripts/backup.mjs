import fs from "node:fs/promises";
import path from "node:path";

const API = "https://wuyou-api.pages.dev/";
const root = "backup";
const albumDir = path.join(root, "album");

async function get(query = "") {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`${API}${query}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${query || "album"} HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchBuffer(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`image HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

await fs.mkdir(albumDir, { recursive: true });

async function allPhotos() {
  let offset = 0;
  let total = Infinity;
  const photos = [];
  while (offset < total) {
    const page = await get(`?limit=120&offset=${offset}&uploader=all`);
    const batch = Array.isArray(page.photos) ? page.photos : [];
    photos.push(...batch);
    total = Number(page.total) || 0;
    offset = photos.length;
    if (!batch.length) break;
  }
  return photos;
}

const photos = await allPhotos();
const wishes = await get("?wishes=1");
const notes = await get("?notes=1");
const keep = new Set();

for (const photo of photos) {
  if (!photo || !photo.id || !photo.src) continue;
  const file = path.join(albumDir, `${photo.id}.jpg`);
  keep.add(path.basename(file));
  try {
    await fs.access(file);
  } catch (error) {
    await fs.writeFile(file, await fetchBuffer(photo.src));
  }
}

for (const name of await fs.readdir(albumDir)) {
  if (name.endsWith(".jpg") && !keep.has(name)) {
    await fs.unlink(path.join(albumDir, name));
  }
}

await fs.writeFile(
  path.join(root, "album.json"),
  JSON.stringify({ photos }, null, 2)
);
await fs.writeFile(
  path.join(root, "wishes.json"),
  JSON.stringify({ wishes: wishes.wishes || [] }, null, 2)
);
await fs.writeFile(
  path.join(root, "notes.json"),
  JSON.stringify({ notes: notes.notes || [] }, null, 2)
);
await fs.writeFile(
  path.join(root, "README.md"),
  `# 無有 · 自动备份\n\n- \`album/\`：共享相册原图\n- \`album.json\`：照片信息\n- \`wishes.json\`：想一起做的事\n- \`notes.json\`：写给未来的话\n\n由 GitHub Actions 每 5 分钟从站点同步；内容没有变化时不会产生提交。\n`
);

console.log(`backup: ${photos.length} photos, ${(wishes.wishes || []).length} wishes, ${(notes.notes || []).length} notes`);