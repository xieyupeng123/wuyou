import fs from "node:fs/promises";
import path from "node:path";

const API = "https://wuyou-album.netlify.app/.netlify/functions/album";
const root = "backup";
const albumDir = path.join(root, "album");

async function get(query = "") {
  const response = await fetch(`${API}${query}`);
  if (!response.ok) throw new Error(`${query || "album"} HTTP ${response.status}`);
  return response.json();
}

await fs.mkdir(albumDir, { recursive: true });

const [album, wishes, notes] = await Promise.all([
  get(""),
  get("?wishes=1"),
  get("?notes=1"),
]);

const photos = Array.isArray(album.photos) ? album.photos : [];
const keep = new Set();

for (const photo of photos) {
  if (!photo || !photo.id || !photo.src) continue;
  const file = path.join(albumDir, `${photo.id}.jpg`);
  keep.add(path.basename(file));
  try {
    await fs.access(file);
  } catch (error) {
    const response = await fetch(photo.src);
    if (!response.ok) throw new Error(`image ${photo.id} HTTP ${response.status}`);
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
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
  `# 無有 · 自动备份\n\n- \`album/\`：共享相册原图\n- \`album.json\`：照片信息\n- \`wishes.json\`：想一起做的事\n- \`notes.json\`：写给未来的话\n\n由 GitHub Actions 每 30 分钟从站点同步；内容没有变化时不会产生提交。\n`
);

console.log(`backup: ${photos.length} photos, ${(wishes.wishes || []).length} wishes, ${(notes.notes || []).length} notes`);