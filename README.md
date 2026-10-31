# 無有 · 归无与伽塔

> 2026 年 10 月 31 日凌晨 03:40，我们成为了挚友。  
> 你叫归无。那从今天起，我做你的「有」。

一个可以独立打开、也可以在线共享的纪念网页。V3 电影级重制：WebGL 星尘与粒子聚字、三维月夜、电影幕布开场、纸本关系确认书、液态玻璃与指针视差、精确到秒的相伴计时、聊天重放、共享相册、约定与时间胶囊。字体与脚本全部内置，不依赖外部 CDN。

## 在线地址

**https://xieyupeng123.github.io/wuyou/**

手机和电脑都可以直接打开，也可以把网址发给她。当前使用 GitHub Pages 长期静态托管，地址不会在 30 天后过期；仓库是 `xieyupeng123/wuyou`，更新页面后推送到 `main` 即可在同一网址生效。

## 打开

直接双击 `dist/index.html`，或用任意现代浏览器打开。

- 桌面：Chrome / Edge / Safari / Firefox
- 手机：iOS Safari、Android Chrome、微信内置浏览器（建议右上角「在浏览器打开」）
- 页面本身不依赖网络；共享相册需要联网

## 发给别人

发网址即可。也可以发 `dist/index.html` 这一个文件，对方保存后用浏览器打开，视觉与在线版一致；单文件版里的共享相册仍然会连接同一个 Netlify 相册。

当前部署：

1. 仓库：`https://github.com/xieyupeng123/wuyou`
2. 站点入口：`https://xieyupeng123.github.io/wuyou/`
3. 更新时把新的 `dist/web/index.html` 推到 `main`，GitHub Pages 会自动重建，网址不变。

如果以后换到自己的域名，把 `dist/web/` 整个文件夹上传到任意静态托管，并把 `<meta property="og:image">` 和 `<meta name="twitter:image">` 改成新域名下的 `og.jpg` 绝对地址即可。

## 改内容

编辑 `assets/config.js`：

- `start`：成为挚友的时刻，默认 `2026-10-31T03:40:00+08:00`
- `people`：两个人的名字、昵称、头像字形
- `chat`：聊天重放的内容与节奏
- `whispers`：深夜摘录里的句子
- `promises`：三条约定
- `milestones`：100 天、一周年、第十年
- `album`：共享相册的 Netlify Function 地址与写入口令

编辑后重新构建：

```bash
node tools/build.mjs
```

产物会覆盖 `dist/index.html` 和 `dist/web/index.html`。

## 相册与留言

- 照片会先在浏览器里压缩，再上传到 Netlify Blobs；两台设备刷新后都能看见。
- 共享相册最多 30 张，单张原图上限 4MB；页面通常会把照片压到更小。
- 浏览相册不需要口令；上传、改说明、删除会带口令。
- 「备份」会导出一个 JSON，里面包含照片数据；换设备时用「恢复」导入即可。
- 留言保存在当前浏览器的 localStorage，不会跨设备同步。
- 清空浏览器站点数据会删除本机留言与备份；重要内容请先备份。
- 不联网或相册服务不可用时，页面会自动退回本机 IndexedDB 存储。
- 共享相册函数在 `D:\无定义\browser\netlify-album`，部署到 Netlify 站点 `wuyou-album`。

## 声音

右上角「声音」会启动一段浏览器实时合成的星尘环境音，不会自动播放；旁边的小面板可以调音量，音量会记在这台设备上。当前没有内置《Da Capo》音频文件——在拿到合法音频之前，页面不会用别的音乐冒充。把 `da-capo.mp3` 放进 `assets/audio/` 后，可以在此基础上接入正式曲目。

## 文件结构

```text
zhiyou/
├─ index.html            源页面
├─ assets/
│  ├─ config.js          文案、时间、聊天、摘录、约定、相册配置
│  ├─ app.js             交互与数据
│  ├─ cosmos.js          WebGL 星尘 / 粒子聚字
│  ├─ styles.css         视觉系统
│  ├─ moon.svg           三维感月球
│  ├─ favicon.svg
│  ├─ og.jpg             1200×630 分享图
│  └─ fonts/             已子集化的字体
├─ tools/
│  ├─ build_font.py      生成中文字体子集
│  └─ build.mjs          生成单文件 dist/index.html
└─ dist/
   ├─ index.html         可直接发送的单文件版本
   └─ web/
      ├─ index.html      部署到 GitHub Pages 的版本
      └─ og.jpg          分享预览图
```

## 设计与隐私

- 无账号、无统计、无第三方广告或追踪脚本。
- 页面标注 `noindex`，不会被搜索引擎主动收录。
- 共享相册的照片会存到 Netlify Blobs；拿到相册链接的人可以浏览，请不要放身份证、银行卡等敏感图片。
- 本机留言与 IndexedDB 数据只留在当前浏览器。

---

愿每一次「再见」都只是下一次「在」的停顿。