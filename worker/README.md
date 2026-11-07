# 無有 · Cloudflare 后端

线上入口：<https://wuyou-api.pages.dev/>

- `src/index.js`：Cloudflare Worker `wuyou-api`，绑定 R2 `wuyou-photos`。
- `pages/functions/[[path]].js`：Cloudflare Pages `wuyou-api` 反向代理，避开 `workers.dev` 在部分地区的 DNS 污染。
- `wrangler.toml`：Worker 名称、R2 binding；账号 ID 不是密钥。
- 元数据 key：`meta/album.json`、`meta/wishes.json`、`meta/notes.json`、`meta/notes-reset.json`、`meta/replies.json`、`meta/visits.json`、`meta/presence.json`。
- 照片 key：`photos/<id>.jpg`。
- 需要的 Worker secrets：`ALBUM_KEY`、`ADMIN_KEY`、`GITHUB_BACKUP_TOKEN`、`GITHUB_BACKUP_REPO`。

部署：

```powershell
npx wrangler deploy
npx wrangler pages deploy pages --project-name wuyou-api --branch main --commit-dirty=true
```

前端 `src/config.js` 的 `album.endpoint` 指向 `https://wuyou-api.pages.dev/`。
