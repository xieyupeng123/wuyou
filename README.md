# 無有 · 归无与伽塔

> 2026 年 10 月 31 日凌晨 03:40，我们成为了挚友。  
> 你叫归无。那从今天起，我做你的「有」。

一个可以独立打开的纪念网页。电影感幕布开场、03:40 月球间奏、纸本关系确认书、液态玻璃与指针视差、精确到秒的相伴计时、聊天重放、记忆相册、约定与时间胶囊。没有后端，没有外部 CDN，字体与脚本全部内置。

## 在线地址

**https://xieyupeng123.github.io/wuyou/**

手机和电脑都可以直接打开，也可以把网址发给她。当前使用 GitHub Pages 长期静态托管，地址不会在 30 天后过期；仓库是 `xieyupeng123/wuyou`，更新页面后推送到 `main` 即可在同一网址生效。

## 打开

直接双击 `dist/index.html`，或用任意现代浏览器打开。

- 桌面：Chrome / Edge / Safari / Firefox
- 手机：iOS Safari、Android Chrome、微信内置浏览器（建议右上角「在浏览器打开」）
- 推荐联网与否都不影响：页面不依赖网络

## 发给别人

发 `dist/index.html` 这一个文件即可。对方保存后用浏览器打开，效果与这里一致。

当前已部署到 GitHub Pages：

1. 仓库：`https://github.com/xieyupeng123/wuyou`
2. 站点入口：`https://xieyupeng123.github.io/wuyou/`
3. 更新时把新的 `dist/web/index.html` 推到 `main`，GitHub Pages 会自动重建，网址不变。

如果以后换到自己的域名，把 `dist/web/` 整个文件夹上传到任意静态托管，并把 `<meta property="og:image">` 和 `<meta name="twitter:image">` 改成新域名下的 `og.jpg` 绝对地址即可。

> 单文件版本里的分享按钮会提示直接发送 HTML 文件。部署到网上后，分享按钮会复制当前网址/调起系统分享。

## 改内容

编辑 `assets/config.js`：

- `start`：成为挚友的时刻，默认 `2026-10-31T03:40:00+08:00`
- `people`：两个人的名字、昵称、头像字形
- `chat`：聊天重放的内容与节奏
- `promises`：三条约定
- `milestones`：100 天、一周年、第十年

编辑后重新构建：

```bash
node tools/build.mjs
```

产物会覆盖 `dist/index.html`。

## 相册与留言

- 照片会先在浏览器里压缩，再存进本机 IndexedDB；不会上传到任何服务器。
- 每台设备的数据彼此独立，换设备/换浏览器不会自动同步。
- 「备份」会导出一个 JSON；换设备时用「恢复」导入即可。
- 清空浏览器站点数据会删除照片和留言，重要内容请先备份。
- 单文件 `file://` 版本下，个别浏览器可能限制本地存储；页面会自动退回精简存储模式。

## 文件结构

```text
zhiyou/
├─ index.html            源页面
├─ assets/
│  ├─ config.js          文案、时间、聊天、约定
│  ├─ app.js             交互与数据
│  ├─ styles.css         视觉系统
│  ├─ favicon.svg
│  ├─ og.jpg             1200×630 分享图
│  └─ fonts/             已子集化的字体
├─ tools/
│  ├─ build_font.py      生成中文字体子集
│  └─ build.mjs          生成单文件 dist/index.html
└─ dist/
   ├─ index.html         可直接发送的单文件版本
   └─ web/
      ├─ index.html      部署到静态托管的版本
      └─ og.jpg          分享预览图
```

## 设计与隐私

- 无账号、无统计、无第三方请求。
- 页面标注 `noindex`，不会被搜索引擎主动收录。
- 所有文字与照片都留在本地；只有你主动发送文件或部署时才会离开这台设备。

---

愿每一次「再见」都只是下一次「在」的停顿。