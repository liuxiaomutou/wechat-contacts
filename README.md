# 📇 微信名片库

微信小程序 + Node.js 后端 + Web 管理后台项目。支持用户登录、名片库管理、成员权限、名片扩展字段、照片上传、生日提醒、查重合并、导入导出。

## 当前提交状态

代码已提交并推送到 Gitea：

```text
https://git.jianxiao.net:8043/LXM/wechat-contacts
```

最近关键提交：

```text
ad1699e feat: add birthday reminder scheduling
3dd1909 feat: expand card profile fields and avatar upload
b0035e9 feat: improve settings permissions and card fields
```

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
│   │   ├── index.ts                 # 服务入口，启动 API 和生日提醒扫描器
│   │   ├── middleware/              # 登录认证、权限控制
│   │   ├── routes/
│   │   │   ├── auth.ts              # 登录/注册/当前用户/用户管理
│   │   │   ├── libraries.ts         # 名片库与成员管理
│   │   │   ├── cards.ts             # 名片 CRUD 与字段可见性
│   │   │   ├── duplicates.ts        # 查重与合并
│   │   │   ├── exportImport.ts      # 导入导出
│   │   │   ├── uploads.ts           # 图片上传
│   │   │   └── reminders.ts         # 生日提醒设置、扫描、记录
│   │   ├── services/
│   │   │   └── birthdayReminders.ts # 生日提醒扫描与订阅消息发送
│   │   ├── utils/
│   │   │   └── birthday.ts          # 阳历/农历生日换算与匹配
│   │   ├── reminders.test.ts        # 生日提醒逻辑测试
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
│   │   ├── card-edit/               # 新增/编辑名片，支持照片上传和扩展字段
│   │   ├── profile/                 # 我的
│   │   ├── reminders/               # 生日提醒设置和订阅授权
│   │   ├── members/                 # 成员管理
│   │   └── visibility/              # 字段可见性设置
│   ├── utils/
│   │   └── api.js                   # API 封装
│   ├── images/                      # tabBar 图标
│   ├── gen_icons.py                 # 图标生成脚本
│   └── project.config.json          # 小程序项目配置
└── README.md
```

## 核心能力

### 名片管理

- 多名片库管理。
- 成员权限：`admin / manager / editor / viewer`。
- 名片字段级可见性控制。
- 多手机号、多邮箱。
- 照片上传。
- 教育经历、工作经历、社会职务。
- 阳历生日、农历生日、民族、籍贯、婚姻、地址。
- 查重、合并、忽略。
- 导入导出。

### 生日提醒

支持按名片中的生日自动提醒：

```text
提前一周
提前三天
提前一天
生日当天
```

支持：

- 提醒设置表。
- 提醒发送记录。
- 防重复发送。
- 后端定时扫描。
- 阳历生日匹配。
- 农历生日换算。
- 微信小程序订阅消息授权。

农历格式支持：

```text
正月初一
腊月初八
1-1
12-8
```

生日提醒扫描器随后端启动，每 10 分钟扫描一次。

## 核心数据模型

- **User** — 用户，支持普通用户、超级管理员，含手机号和微信 `openid` 绑定字段。
- **CardLibrary** — 名片库，一个用户可以拥有多个名片库。
- **LibraryMember** — 名片库成员与权限，支持 `admin / manager / editor / viewer`。
- **Card** — 名片，支持手机号、邮箱、公司、职位、生日、地址、履历、头像等扩展字段。
- **Group / CardGroup** — 名片分组。
- **CardFieldVisibility** — 名片字段级可见性控制。
- **DuplicateGroup / DuplicateMember / MergeLog** — 查重、合并与操作日志。
- **BirthdayReminderSetting** — 用户生日提醒设置。
- **BirthdayReminderLog** — 生日提醒发送记录，用于防重复发送。

## 后端 API

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/auth` | 登录、注册、当前用户、资料更新、用户管理 |
| 名片库 | `/api/libraries` | 名片库 CRUD、成员管理 |
| 名片 | `/api/cards` | 名片 CRUD、分页搜索、字段可见性 |
| 图片上传 | `/api/uploads` | 名片照片上传 |
| 生日提醒 | `/api/reminders` | 提醒设置、微信绑定、手动扫描、提醒记录 |
| 查重 | `/api/duplicates` | 重复检测、重复组、合并、忽略 |
| 导入导出 | `/api/export` | 名片数据导入导出 |
| 健康检查 | `/api/health` | 服务状态 |

### 生日提醒接口

```text
GET  /api/reminders/birthday/settings
PUT  /api/reminders/birthday/settings
POST /api/reminders/wechat/bind
POST /api/reminders/birthday/scan      # 仅 super_admin
GET  /api/reminders/birthday/logs
```

### 图片上传接口

```text
POST /api/uploads/image
```

上传成功返回：

```json
{
  "url": "http://host/uploads/xxx.jpg"
}
```

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

## 微信订阅消息配置

如果要真实发送生日提醒，需要在服务端配置：

```bash
WECHAT_MINI_APPID=你的小程序appid
WECHAT_MINI_SECRET=你的小程序secret
WECHAT_BIRTHDAY_TEMPLATE_ID=订阅消息模板ID
```

如果没有配置，系统仍会扫描生日并写入提醒记录，但状态会是：

```text
skipped
```

常见原因：

```text
未配置订阅消息模板 ID
未配置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET
用户未绑定微信 openid
```

小程序端路径：

```text
我的 → 生日提醒
```

用户可在这里：

- 开启/关闭提醒。
- 设置提醒时间。
- 勾选提醒节点。
- 填写订阅模板 ID。
- 绑定微信。
- 授权订阅消息。
- 查看最近提醒记录。

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

后台已支持：

- 用户管理。
- 新建/编辑用户手机号。
- 名片库字段设置。
- 名片扩展字段管理。

## 验证命令

后端：

```bash
cd /opt/data/wechat-contacts/server
npm run db:generate
npx prisma db push --accept-data-loss
npm run build
npx tsx src/reminders.test.ts
curl -sS http://127.0.0.1:3000/api/health
```

前端 JS 语法检查：

```bash
cd /opt/data/wechat-contacts
node --check miniapp/utils/api.js
node --check miniapp/pages/reminders/index.js
node --check miniapp/pages/profile/index.js
node --check admin/modules.js
```

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
