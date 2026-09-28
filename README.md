# tea-mall-admin

茶叶商城运营与管理后台，为管理员提供商品、订单、客户、积分、佣金、邀请奖励、内容和系统配置管理。

## 项目简介

本项目是独立的 Vue 3 管理端，登录后通过 `tea-mall-backend` API 管理商城数据。包含商品与 SKU、订单/售后、客户与合伙人、积分任务和兑换商品、佣金规则、邀请奖励、优惠券、内容社区、页面装修、工单、通知及若依系统管理页面。

## 技术栈

- Vue 3、TypeScript/JavaScript、Vite 5
- Element Plus、Pinia、Vue Router、ECharts
- Axios、Vue Quill、Vite 生产构建
- 通过 REST API 对接 Java/Spring Boot 后端

## 关联仓库

| 项目 | 说明 | GitHub |
|---|---|---|
| tea-mall-backend | 后端服务 | [tea-mall-backend](https://github.com/sickelgroupe-create/tea-mall-backend) |
| tea-mall-admin | 管理后台（当前仓库） | [tea-mall-admin](https://github.com/sickelgroupe-create/tea-mall-admin) |
| tea-mall-app | 用户端 | [tea-mall-app](https://github.com/sickelgroupe-create/tea-mall-app) |

## 快速启动

```sh
npm install
npm run dev
```

生产构建：

```sh
npm run build:prod
```

请在 `.env.development` 或 `.env.production` 中配置后端地址；这些文件只保留本地配置，公开仓库使用对应 `.example` 文件。

## 项目结构

- `src/views/mall/`：商城运营页面
- `src/api/`：后台 API 封装
- `src/store/`：登录、权限和全局状态
- `src/router/`：路由与动态权限
- `src/components/`：通用 UI 组件
- `public/`：公开静态资源

## 简历描述示例

参与茶叶商城运营后台开发，使用 Vue 3、Vite 和 Element Plus 完成商品、订单、客户、积分、佣金、邀请奖励及内容审核等管理功能，并与 Spring Boot 后端实现权限和数据闭环。
