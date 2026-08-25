# ChenBlog

基于 **Hexo + GitHub Pages** 的个人博客系统，0 元部署，并附带一个无需自建服务器的「后台管理」页面（Git 即数据库 / CMS）。

## 功能

后台管理（部署后访问 `你的网站地址/admin/`）：

- 切换用户端背景图片（上传或填写 URL）
- 发布文章（正文支持 Markdown，可上传并插入图片、设置封面图）
- 草稿：保存到 `source/_drafts/`，不会发布到线上；可随时一键发布
- 删除文章
- 修改文章（含修改标题、分类、日期、slug）
- 文章置顶：勾选后首页 / 分类页排在最前
- 确定文章是否可以被评论（每篇文章独立开关）
- 分类的增 / 删 / 改 / 查、排序
- 分类同时作为博客顶部导航栏，每篇文章可挂多个分类

用户端：

- 查看已发布文章（首页列表、分类页、归档页）
- 站内搜索（纯前端静态搜索，基于 `/search.json`）
- 深色 / 浅色主题切换（跟随系统偏好，可手动切换并记住）
- 评论：使用 Giscus（基于 GitHub Discussions，完全免费，无需自建后端）

## 目录结构

```
.
├── _config.yml                 # Hexo 站点配置（改这里的 title / url / root）
├── package.json
├── scripts/search-generator.js # 生成 /search.json（供前端搜索）
├── source/
│   ├── _data/site.json         # 背景图 + 导航分类（后台会自动读写）
│   ├── _posts/                 # 已发布文章（Markdown，后台会自动读写）
│   ├── _drafts/                # 草稿（不会发布到线上）
│   ├── search/index.md         # 搜索页
│   └── admin/                  # 后台管理（静态页面，直接随站点发布）
├── themes/chen/                # 自定义主题（含搜索、暗色主题、置顶、评论）
└── .github/workflows/deploy.yml
```

## 一、部署到 GitHub Pages

1. 在 GitHub 新建用户主页仓库 `ChenCoder23.github.io`（已按用户主页配置，根路径 `/`）。
   - 以后若想改用普通项目仓库（如 `ChenBlog`），把 `_config.yml` 的 `root` 改为 `/仓库名/`、`url` 改为 `https://ChenCoder23.github.io/仓库名/` 即可。
2. 把本项目推到该仓库的 `main` 分支。
3. 修改 `_config.yml`：
   - `title`：博客名
   - `url`：已填为 `https://ChenCoder23.github.io/`（如需可改）
   - `root`：已填为 `/`（用户主页）
4. 仓库 `Settings` → `Pages` → `Source` 选择 **GitHub Actions**。
5. 打开 `Actions` 页面，首次可能需要点击「I understand my workflows, go ahead and enable them」。
6. 每次 push 到 `main`，Action 会自动构建并发布；后台保存 / 删除 / 上传操作都会触发自动发布。

> 分支名如果不是 `main`，请同时修改 `.github/workflows/deploy.yml` 里的 `branches: [main]` 和后台里填的分支名。

## 二、创建 GitHub Token（后台使用）

后台直接调用 GitHub API 读写仓库，需要一个 **个人访问令牌**：

1. GitHub 右上角头像 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**（推荐）。
2. Repository access 选择你博客所在的仓库。
3. Permissions 里把 **Contents** 设为 **Read and write**。
4. 生成后复制 token（只显示一次）。

> 也可以使用 Classic token，勾选 `repo` 权限即可。

## 三、使用后台

1. 部署完成后访问 `https://<你的用户名>.github.io/admin/`（项目主页则是 `/仓库名/admin/`）。
2. 首次进入会看到「账号设置」，填入：
   - GitHub Token
   - 用户名 / 组织名
   - 仓库名（已预填 `ChenCoder23.github.io`）
   - 分支（默认 `main`）
   - 站点根路径（已预填 `/`）
3. 点击「保存」后即可管理文章、草稿、分类、背景图。

> Token 只保存在浏览器 localStorage 中，不会上传到其它服务器。注意不要把 token 提交到仓库里。

## 四、评论系统（Giscus，0 元）

Giscus 用 GitHub Discussions 存储评论，完全免费、无需自建后端。每个 GitHub 账号都可以用。

1. 仓库需为 **public**，并在 `Settings` → `General` → `Features` 里开启 **Discussions**。
2. 到 <https://giscus.app/zh-CN> 按提示安装 Giscus GitHub App 并选择你的仓库，获取配置。
3. 把得到的值填入 `themes/chen/_config.yml`：

```yaml
comments:
  enabled: true
  giscus:
    repo: "你的用户名/你的仓库"
    repo_id: "R_xxx"
    category: "Announcements"
    category_id: "DIC_xxx"
    mapping: "pathname"
    ...
```

4. 发布文章时，在后台勾选 / 取消勾选「允许评论」，即可控制每一篇文章是否显示评论区。

如果暂时不想用 Giscus，也可以：

- **utterances**：同样是 GitHub Issues 评论，配置更简单，把主题里 giscus 的 `<script>` 换成 utterances 脚本即可。
- **Waline / Twikoo**：需要配合免费的 Serverless / 云数据库（如 Vercel + LeanCloud / Supabase），功能更强（访客留言、通知等）。
- **Disqus**：第三方，有广告，国内访问不稳定。

## 五、本地运行（可选）

需要 Node.js 20+：

```bash
npm ci
npx hexo server
```

浏览器打开 <http://localhost:4000> 预览；后台页面为 <http://localhost:4000/admin/>，搜索页为 <http://localhost:4000/search/>。

## 说明

- 后台的「保存 / 删除 / 上传图片」本质是向仓库提交 commit，随后由 GitHub Actions 自动构建发布，所以页面上线会有几十秒到一两分钟的延迟。
- 文章里插入的图片会提交到 `source/images/uploads/`；背景图提交到 `source/images/background/`。
- 草稿保存在 `source/_drafts/`，Hexo 默认不会发布草稿，需在后台点「发布」才会进入 `_posts/`。
- 置顶通过文章 front-matter 的 `sticky: true` 实现；搜索索引只包含已发布文章。