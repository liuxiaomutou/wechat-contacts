# 📇 微信名片库

微信小程序 + Node.js 后端 + Web 管理后台项目。支持用户登录、名片库管理、成员权限、名片扩展字段、查重合并、导入导出。

## 项目结构

```text
wechat-contacts/
├── admin/                           # Web 管理后台（静态页面）
│   ├── index.html
│   ├── app.js
│   ├── modules.js
│   └── style.css
│
├── server/                          # 后端 API（Node.js + Express + Prisma + SQLite）
│   ├── src/
│   │   ├── index.ts                 # 服务入口
│   │   ├── middleware/              # 登录认证、权限控制
│   │   ├── routes/
│   │   │   ├── auth.ts              # 登录/注册/当前用户
│   │   │   ├── libraries.ts         # 名片库与成员管理
│   │   │   ├── cards.ts             # 名片 CRUD 与字段可见性
│   │   │   ├── duplicates.ts        # 查重与合并
│   │   │   └── exportImport.ts      # 导入导出
│   │   └── seed.ts                  # 测试种子数据
│   ├── prisma/
│   │   └── schema.prisma            # 数据库模型
│   ├── package.json
│   └── tsconfig.json
│
├── miniapp/                         # 微信小程序前端
│   ├── app.json / app.js / app.wxss
│   ├── pages/
│   │   ├── login/                   # 登录
│   │   ├── index/                   # 首页/名片库入口
│   │   ├── cards/                   # 名片列表
│   │   ├── card-detail/             # 名片详情
│   │   ├── card-edit/               # 新增/编辑名片
│   │   ├── profile/                 # 我的
│   │   ├── members/                 # 成员管理
│   │   └── visibility/              # 字段可见性设置
│   ├── utils/
│   │   └── api.js                   # API 封装
│   ├── images/                      # tabBar 图标
│   ├── gen_icons.py                 # 图标生成脚本
│   └── project.config.json          # 小程序项目配置
└── README.md
```

## 核心数据模型

- **User** — 用户，支持普通用户、库管理员、超级管理员。
- **CardLibrary** — 名片库，一个用户可以拥有多个名片库。
- **LibraryMember** — 名片库成员与权限，支持 `admin / manager / editor / viewer`。
- **Card** — 名片，支持手机号、邮箱、公司、职位、地址、履历、技能等扩展字段。
- **Group / CardGroup** — 名片分组。
- **CardFieldVisibility** — 名片字段级可见性控制。
- **DuplicateGroup / DuplicateMember / MergeLog** — 查重、合并与操作日志。

## 后端 API

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/auth` | 登录、注册、当前用户、资料更新 |
| 名片库 | `/api/libraries` | 名片库 CRUD、成员管理 |
| 名片 | `/api/cards` | 名片 CRUD、分页搜索、字段可见性 |
| 查重 | `/api/duplicates` | 重复检测、重复组、合并、忽略 |
| 导入导出 | `/api/export` | 名片数据导入导出 |
| 健康检查 | `/api/health` | 服务状态 |

## 后端启动

```bash
cd /opt/data/wechat-contacts/server
npm install
npx prisma generate
npx prisma db push
npx tsx src/seed.ts        # 可选：插入测试数据
npm run dev                # 开发模式
```

默认端口是 **3000**，可通过环境变量修改：

```bash
PORT=3001 npm run dev
```

SQLite 数据库默认位置：

```text
server/prisma/dev.db
```

这个文件已被 `.gitignore` 忽略，不建议随手删除，除非你要重置本地数据。

## 小程序配置

1. 打开 **微信开发者工具**。
2. 导入目录：

   ```text
   /opt/data/wechat-contacts/miniapp/
   ```

3. 修改 `miniapp/app.js` 里的接口地址：

   ```js
   baseUrl: 'http://localhost:3000/api'
   ```

   生产环境改成你的 HTTPS 域名。

4. 修改 `miniapp/project.config.json` 中的 `appid` 为你的小程序 AppID。

开发调试时，可在微信开发者工具里勾选：

```text
详情 → 本地设置 → 不校验合法域名
```

## 管理后台

管理后台位于：

```text
admin/index.html
```

它通过后端 API 工作。部署时可用 Nginx、Caddy 或任意静态文件服务托管 `admin/` 目录。

## 图标生成

如果需要重新生成小程序 tabBar 图标：

```bash
cd /opt/data/wechat-contacts/miniapp
python3 gen_icons.py
```

脚本会生成：

```text
miniapp/images/lib.png
miniapp/images/lib-active.png
miniapp/images/me.png
miniapp/images/me-active.png
```
