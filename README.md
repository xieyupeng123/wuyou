# 無有 · WÚ YǑU

一座漂浮在月光与星尘之间的记忆空间。为归无（汪超）与伽塔（谢宇鹏）在 **2026.10.31 03:40** 成为挚友而作。

线上地址：<https://xieyupeng123.github.io/wuyou/>

## V4 是什么

- 六幕滚动叙事：虚无 → 月面 → 记忆 → 相册 → 约定 → 未来。
- Three.js / WebGL 实时三维月球、GPU 粒子星尘、三色粒子流、镜头导演与滚动时间轴。
- 精确到秒的相伴计时；聊天逐条重放；关系确认书与印章；共享相册；三条约定；时间胶囊；分享。
- 液态玻璃 UI；移动端降级；`prefers-reduced-motion`；WebGL 不可用时自动切换轻量模式。
- 单文件构建：`dist/index.html` 内联 CSS、JS 与字体；音频与分享图作为静态文件同目录部署。

## 本地开发

```bash
cd v4
npm install
npm run dev      # http://localhost:5174
npm run build    # dist/index.html + dist/audio + dist/og.jpg
npm run preview
```

调试参数：

- `?nogl=1`：不启动 WebGL，直接查看轻量 DOM 版本。
- `?hide=particles,moon,env,streams`：隐藏指定三维层，排查遮挡。

## 部署

GitHub Pages 从仓库 `xieyupeng123/wuyou` 的 `main` 分支根目录发布。

每次构建后，把以下文件复制到仓库根目录并提交：

```text
dist/index.html
dist/audio/da-capo.mp3
dist/og.jpg
```

`index.html` 里的 `og:image` 使用绝对地址 `https://xieyupeng123.github.io/wuyou/og.jpg`，分享预览依赖该文件。

## 共享相册

照片上传到 Netlify Function：

```text
https://wuyou-album.netlify.app/.netlify/functions/album
```

浏览公开；上传、改说明、删除需要 `X-Album-Key`。最多 200 张，单张原图 8MB 内，浏览器会先压缩到 1600px / JPEG 0.84。照片会同步给所有打开网站的人，请只上传愿意共享的内容。

约定清单也走同一个 Function，`GET ?wishes=1` 读取、`POST {action:"wish"}` 新增，双方都可以在页面里添加；最多 100 条。

留言与印章只保存在当前浏览器；相册支持导出 / 恢复 JSON 备份。

## 音乐

《Da Capo (Instrumental)》— HOYO-MiX。  
文件：`public/audio/da-capo.mp3`（4,570,219 bytes），由项目所有者提供。不会自动播放，需点击右上角“声音”。

这是《崩坏3》毕业旅行的《Da Capo》纯音乐版本。它不是 CC0 素材；公开传播前，请确认你拥有相应的使用授权。官方页面：[HOYO-MiX](https://hoyomix.amarea.cn/album/153051033)。

## 目录

```text
v4/
  index.html
  src/
    main.js
    config.js
    core/        Quality / Scroll / Camera / Scene
    world/       Moon / ParticleField / Environment / Streams
    ui/          Interface / Story
    audio/       AudioManager
    styles.css
  public/
    audio/da-capo.mp3
    og.jpg
  tools?        无
```

旧版 V3 保留在 `D:\无定义\zhiyou`（非本目录），作为本地回退。