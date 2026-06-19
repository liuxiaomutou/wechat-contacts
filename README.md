# 📇 通讯录小程序

微信小程序 + Node.js 后端全栈项目，支持联系人管理、分组、搜索、导入导出。

## 项目结构

```
contact-book/
├── server/                          # 后端 API（Node.js + Express + Prisma + SQLite）
│   ├── src/
│   │   ├── index.ts                 # 服务入口
│   │   ├── routes/
│   │   │   ├── contacts.ts          # 联系人 CRUD API
│   │   │   └── groups.ts            # 分组管理 API
│   │   └── seed.ts                  # 测试种子数据
│   ├── prisma/
│   │   └── schema.prisma            # 数据库模型
│   ├── package.json
│   └── tsconfig.json
│
├── miniapp/                         # 微信小程序前端
│   ├── app.json / app.js / app.wxss
│   ├── pages/
│   │   ├── index/                   # 联系人列表（首页）
│   │   ├── contact-detail/          # 联系人详情
│   │   ├── contact-edit/            # 新增/编辑联系人
│   │   ├── groups/                  # 分组管理
│   │   └── search/                  # 搜索
│   ├── utils/
│   │   ├── api.js                   # API 封装
│   │   └── util.js                  # 工具函数
│   ├── images/                      # 图标
│   └── project.config.json          # 小程序项目配置
```

## 数据库模型

- **Contact** — 联系人（姓名、手机、邮箱、公司、职位、备注、收藏）
- **Group** — 分组（名称、排序）
- **ContactGroup** — 多对多关联

## 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/contacts` | 联系人列表（分页、搜索、分组筛选、收藏筛选） |
| GET | `/api/contacts/:id` | 联系人详情 |
| POST | `/api/contacts` | 新建联系人 |
| PUT | `/api/contacts/:id` | 更新联系人 |
| DELETE | `/api/contacts/:id` | 删除联系人 |
| GET | `/api/groups` | 全部分组（含联系人数量） |
| POST | `/api/groups` | 创建分组 |
| PUT | `/api/groups/:id` | 更新分组 |
| DELETE | `/api/groups/:id` | 删除分组 |
| GET | `/api/groups/:id/contacts` | 分组下的联系人 |

## 部署步骤

### 1. 后端（服务器端，推荐跑在你的 UnRAID 上）

```bash
cd contact-book/server
npm install
npx prisma generate
npx prisma db push        # 创建 SQLite 数据库
npx tsx src/seed.ts        # （可选）插入测试数据
npx tsx src/index.ts       # 启动 API 服务
```

**生产部署建议（UnRAID）：**
- 用 Docker 或 pm2 保持后端运行
- 默认端口 **3000**，可通过 `PORT` 环境变量修改
- 数据库文件在 `server/prisma/dev.db`

### 2. 小程序前端配置

1. 打开 **微信开发者工具**
2. 导入 `contact-book/miniapp/` 目录
3. 修改 `utils/api.js` 中的 `baseUrl` 为你的服务器地址：
   - 开发时：`http://localhost:3000/api`（需关掉微信开发者工具的安全域名校验）
   - 生产时：`https://你的域名/api`
4. 修改 `project.config.json` 中的 `appid` 为你的小程序 AppID

### 3. 小程序开发者工具注意事项

- 勾选「详情 → 本地设置 → 不校验合法域名」
- `"es6": true` 已配置，ES module 会自动转译
- 基础库版本 **3.7.5+**

## 功能预览

- 📋 联系人列表 — 分页加载、分组筛选、收藏置顶
- 🔍 搜索 — 按姓名/手机号/邮箱实时搜索
- ➕ 新增/编辑 — 表单校验、分组多选
- 📄 详情页 — 打电话、发短信、收藏切换
- 📁 分组管理 — 增删改、联系人计数
