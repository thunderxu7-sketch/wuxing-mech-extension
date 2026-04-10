# 五行校准 落地页

这是 v1 上线用的最小静态落地页。它**不**和扩展构建链路绑定，是一个独立的纯静态站点，可直接托管到 Cloudflare Pages / GitHub Pages / Vercel / Netlify 任意一家。

## 文件

- `index.html` — 单页落地页，中英双语
- `styles.css` — 样式
- `icon128.png` — 从 `public/icon128.png` 拷贝过来的 logo

## 本地预览

直接用任意静态服务器跑这个目录即可，例如：

```sh
cd landing
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 部署到 Cloudflare Pages

1. 登录 https://dash.cloudflare.com/ → Workers & Pages → Create → Pages → Connect to Git
2. 选中本仓库
3. 构建设置：
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `landing`
   - **Root directory**: 留空（仓库根）
4. 部署后会得到 `xxx.pages.dev` 域名，记下来

## 把 URL 接回扩展

得到落地页 URL 后，需要写进扩展的 `wuxing_share_config`，让分享图和分享文案指向真实落地页。两种方式：

1. **改默认值**（推荐）— 编辑 `src/api/chromeStorage.ts` 的 `getDefaultShareConfig()`，把 `fallbackUrl` 换成新的 Pages 域名（建议带 UTM 参数，例如 `https://xxx.pages.dev/?utm_source=extension&utm_medium=share`）。然后改 `tests/chromeStorage.test.ts` 里对应的断言。
2. **运行时配置** — 在扩展 popup 加一个隐藏的设置入口，写入 `chrome.storage.local` 的 `wuxing_share_config`。适合多渠道场景，v1 不必做。

## 待办

- [ ] 真实截图（目前没有截图区，先发布通了再补）
- [ ] 短链（v1 暂时和主链接相同，后续接 t.cn / 自建跳转）
- [ ] 中文 SEO meta 和 OG 图（先用 icon，后续替换）
