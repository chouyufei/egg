# 凤伯乐（Fengbole）· 项目开发说明

> 蛋品在线撮合 / 竞价平台。养殖场发布货源、采购商在线报价，价优者到期成交；
> 也支持采购商发布求购、养殖场应标。公司：湖北省乘子农业科技有限公司。
> 客服：186-7554-5968。

**新会话续开**：代码即事实来源，全部已 commit+push。拉分支即可继续开发。

## 仓库 & 分支

| 仓库 | 内容 |
|---|---|
| `chouyufei/egg`（本仓库） | 微信小程序 `miniprogram/` + Vue3 后台 `src/` + 文档 `docs/` |
| `chouyufei/rest` | 后端（Node/Express），代码在 `egg-platform/` 子目录 |

- **开发分支（两仓库同名）**：`claude/egg-trading-platform-uYSOL`
- 流程：改动 → `commit` → `git push -u origin <branch>`。**不主动建 PR**，除非明确要求。
- 小程序改动（WXML/WXSS/JS）**必须在微信开发者工具重新编译/上传**才会在手机生效——只推仓库不会自动更新到设备。

## 本仓库结构

- `miniprogram/` — 微信小程序
  - `pages/` — index(首页) / login / me(我的) / orders(订单) / resource-detail(货源·求购详情) /
    order-detail / publish(发布) / qualify(资质认证) / wallet / withdraw / recharge /
    messages / seller-profile(卖家信用) / settings(界面设置) / about / agreement / privacy 等
  - `utils/` — api / auth(游客) / prefs(字体·主题) / share / location / subscribe / deposit / format / upload
  - `components/` — egg-card 等（**组件样式隔离**，全局主题/字体不作用其内部）
  - `images/` — share-logo.png（分享封面）
  - `app.js / app.json / app.wxss`
- `src/` — Vue 3 管理后台（vue-router `createWebHashHistory`，vant，axios）
  - `views/admin/` — Dashboard / Users / Qualifications(资质审核) / Resources(资源监管) /
    Orders / Withdrawals / Deposits / DepositSettings / NoticeSettings / ReviewMode / Settings / Shell
  - `api/index.js` — 有 `api.get/post/put/patch/delete`
- `docs/` — 产品使用文档（md/pdf/docx 图解手册）

## 领域概念 & 术语约定（重要）

- **角色**：`farm`(养殖场/卖) / `buyer`(采购商/买) / `admin`。同一用户可在首页切「买/卖」，
  会调 `/auth/switch-role` 改 DB role。**资质认证与角色已解耦**：切模式不改 `license_status`。
- **货源(supply) vs 求购(demand)**：同一 `resources` 表，`kind` 字段区分。
- **成交规则**：货源＝采购商报价、价高者优先；求购＝养殖场应标、价低者优先。
  订单有效期 **30/60/90 分钟**，到期系统自动选当前最优价成交。
- **术语（统一，勿用旧词）**：用「出价 / 报价 / 加价（货源）/ 让价（求购）」，
  **不要**用「竞拍 / 竞价 / 还价」。保证金统一叫「**服务保障金**」，后台可配金额、**只扣卖方**。
- **养殖规模单位＝「万只」**：表单按万只录入，DB 存「只」整数（＝万只×10000）。
  展示处（资质表单/详情、货源详情、卖家信用、后台）统一「万只」。
- **weight_specs**：各规格「箱数/价格」，形如 `[{weight, boxes, price}]`（每个斤值一行）。
- **allow_provinces**：求购的「允许参与地区」，限定哪些省份养殖场可应标。
- **重新上架 relist**：流拍/取消资源可复用（`POST /resources/:id/relist`），
  `weight_specs`、`allow_provinces` 会保留；小程序发布页用 `?from=<id>` 预填全部字段。
- **游客模式**：未登录也能浏览（首页/订单/我的/详情/卖家信用），启动页＝首页；
  受限操作（发布/报价/下单/钱包/消息）用 `utils/auth.js` 的 `requireLogin` 弹框引导登录。
- **界面设置**：`utils/prefs.js` 存 字体大小(normal/large/xlarge) + 主题(day/night)，
  通过 `<page-meta page-style>` 注入 CSS 变量（`--fs-scale/--bg/--fg/--card/--muted`），
  `app.wxss` 用 `var()`+`calc()` 全局响应。已接入 首页/订单/我的/设置。
- **审核模式 reviewMode**：从 `/auth/app-config` 拉；开启后小程序藏起金融/复杂功能，提审时用。

## 易踩的坑

- 小程序 `utils/api.js` 删除方法是 **`api.del`**，不是 `api.delete`；后台 `src/api` 才是 `api.delete`。
- 微信 `wx.requestSubscribeMessage` **必须由用户手势触发**，别放 onLoad 自动调。
- 微信小程序 **rpx 没有全局字体倍率**；组件样式隔离，`egg-card` 等不随全局主题/字体变。
- 分享 `imageUrl` 为空时微信会自动截当前页面截图；已统一用 `/images/share-logo.png`。
- 浮点误差：余额相关一律用**分位整数**（见后端 `balance.js`）。

## 提现 / 支付要点（腾讯审核相关）

- 微信零钱：单笔 ≤ 200 元，**实时到账**；银行卡：单笔 ≤ 5000 元，**2 小时内到账**。
- 审核要求：**不能设"提现门槛"话术**，要「实时提现 / 2 小时内到账」。
- 微信商家转账走**新版 transfer-bills API**（scene 1011）+ **微信支付公钥模式**。

## 通知体系

站内信 + 微信订阅消息（单模板多场景）+ 短信 + 企业微信机器人。
**短信按模板 ID 区分类型（模板不支持参数）**：订单提醒 `2657517` / 报价提醒 `2673307` /
货源提醒 `2673308`；平台方 `2657523`。可用环境变量 `SMS_NOTICE_TPL_ORDER/QUOTE/SUPPLY` 覆盖。
距离推送：发布货源/求购给附近（`push_radius_km`，默认 500km）用户推订阅消息 + 短信。

## 语言

回复与提交说明用中文（客户为中文养殖户/蛋商）。代码风格、注释密度对齐周边现有代码。
