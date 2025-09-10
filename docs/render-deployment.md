# Render.com 自动部署配置指南

本文档说明如何配置 GitHub Actions 以实现向 Render.com 的自动部署功能。

## 概述

该工作流程支持以下功能：
- 当代码推送到 `main` 或 `deploy` 分支时自动触发部署
- 支持手动触发部署
- 使用 GitHub Secrets 安全管理敏感信息
- 支持两种部署方式：Deploy Hook（推荐）和 Render API

## 前置条件

1. **Render.com 账户**：需要有一个 Render.com 账户
2. **Render 服务**：已在 Render 上创建了 Web Service 或 Static Site
3. **GitHub 仓库**：具有管理员权限的 GitHub 仓库

## 配置步骤

### 1. 在 Render.com 上设置服务

#### 方式一：使用 Deploy Hook（推荐）

1. 登录 [Render.com](https://render.com)
2. 进入你的服务（Web Service 或 Static Site）
3. 在服务设置中找到 "Deploy Hook"
4. 复制 Deploy Hook URL（类似：`https://api.render.com/deploy/srv-xxxxxxxxx?key=yyyyyyyyy`）

#### 方式二：使用 Render API

1. 登录 [Render.com](https://render.com)
2. 进入 [Account Settings](https://dashboard.render.com/account) > API Keys
3. 创建新的 API Key 并复制
4. 记录你的服务 ID（在服务 URL 中可以找到，格式如 `srv-xxxxxxxxx`）

### 2. 配置 GitHub Secrets

1. 进入 GitHub 仓库
2. 导航到 **Settings** > **Environments**
3. 创建名为 `RenderConfig` 的环境（如果不存在）
4. 在 `RenderConfig` 环境中添加以下 secrets：

#### 方式一 secrets（使用 Deploy Hook）：
```
RENDER_DEPLOY_HOOK_URL: 你的 Deploy Hook URL
```

#### 方式二 secrets（使用 Render API）：
```
RENDER_API_KEY: 你的 Render API Key
RENDER_SERVICE_ID: 你的服务 ID（如 srv-xxxxxxxxx）
```

**注意**：只需要配置其中一种方式即可。Deploy Hook 方式更简单，推荐使用。

### 3. 触发部署

部署会在以下情况自动触发：
- 向 `main` 分支推送代码
- 向 `deploy` 分支推送代码
- 手动在 GitHub Actions 中触发工作流程

## Render 服务配置建议

### 对于 Web Service（Node.js 应用）

在 Render 服务配置中设置：

```yaml
# 构建命令
Build Command: npm ci && npm run build

# 启动命令  
Start Command: npm start

# 环境变量
NODE_ENV: production
PORT: 10000  # Render 会自动设置 PORT 环境变量
```

### 对于 Static Site

在 Render 服务配置中设置：

```yaml
# 构建命令
Build Command: npm ci && npm run build

# 发布目录
Publish Directory: build  # 或 dist，取决于你的构建输出目录
```

## 工作流程详解

### 触发条件
- `push` 到 `main` 或 `deploy` 分支
- `workflow_dispatch`（手动触发）

### 执行步骤
1. **检出代码**：获取最新代码
2. **设置 Node.js**：安装 Node.js 20.x 版本
3. **安装依赖**：执行 `npm ci` 安装项目依赖
4. **构建应用**：执行 `npm run build` 构建生产版本
5. **部署到 Render**：根据配置的方式触发 Render 部署
6. **通知状态**：输出部署结果和相关信息

### 安全措施
- 所有敏感信息存储在 GitHub Secrets 中
- 使用专门的环境（`RenderConfig`）隔离配置
- API 密钥不会在日志中显示

## 故障排除

### 常见问题及解决方案

#### 1. 部署失败：401 Unauthorized
**原因**：API Key 或 Deploy Hook URL 无效
**解决方案**：
- 检查 GitHub Secrets 中的配置是否正确
- 重新生成 Render API Key 或 Deploy Hook
- 确保 secrets 名称完全匹配

#### 2. 部署失败：404 Not Found
**原因**：Service ID 不正确或服务不存在
**解决方案**：
- 验证 `RENDER_SERVICE_ID` 是否正确
- 确保服务在 Render 上存在且可访问

#### 3. 构建失败
**原因**：依赖安装或构建过程出错
**解决方案**：
- 检查 `package.json` 中的依赖和脚本
- 确保本地构建成功
- 检查 Node.js 版本兼容性

#### 4. 环境变量问题
**原因**：Render 服务缺少必要的环境变量
**解决方案**：
- 在 Render 服务设置中添加所需的环境变量
- 确保 `NODE_ENV=production`

### 调试步骤

1. **检查 GitHub Actions 日志**：查看详细的错误信息
2. **验证 Render 服务状态**：确保 Render 服务正常运行
3. **测试本地构建**：在本地环境中测试构建过程
4. **检查 secrets 配置**：确保所有必需的 secrets 都已正确配置

## 高级配置

### 自定义分支触发

如果需要修改触发分支，编辑 `.github/workflows/render-deploy.yml`：

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # 添加或修改分支名称
```

### 添加构建优化

在工作流程中添加缓存和并行处理：

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 环境特定部署

可以为不同环境配置不同的 Render 服务：

```yaml
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  env:
    RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_STAGING_DEPLOY_HOOK_URL }}

- name: Deploy to Production  
  if: github.ref == 'refs/heads/main'
  env:
    RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_PROD_DEPLOY_HOOK_URL }}
```

## 监控和通知

### 部署状态监控

1. **GitHub Actions**：在 Actions 标签页查看工作流程状态
2. **Render Dashboard**：在 Render 控制台查看部署进度
3. **部署日志**：查看详细的构建和部署日志

### 设置通知（可选）

可以添加 Slack、Discord 或邮件通知：

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 最佳实践

1. **使用 Deploy Hook**：比 API 方式更简单可靠
2. **环境隔离**：为不同环境使用不同的 Render 服务
3. **密钥轮换**：定期更新 API 密钥和 Deploy Hook
4. **监控日志**：定期检查部署日志以发现潜在问题
5. **测试分支**：使用 `deploy` 分支进行部署测试
6. **回滚计划**：了解如何在 Render 上回滚到上一版本

## 相关链接

- [Render.com 文档](https://render.com/docs)
- [Render API 文档](https://api-docs.render.com)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Secrets 管理](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 支持

如有问题，请查看：
1. GitHub Actions 执行日志
2. Render 服务部署日志
3. 本文档的故障排除部分

---

*最后更新时间：2024年12月*