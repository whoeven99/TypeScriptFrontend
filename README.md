项目运行流程和遇到问题的相关解决方法

首先使用ngrok反向代理生成临时服务
假设生成的域名为https://example.ngrok.app

运行shopify app dev --tunnel-url https://example.ngrok.app:443

相关配置文件在shopify.app.toml具体代码含义查阅shopify.dev

如果运行项目后出现网络问题查看视频也许能够解决
https://www.youtube.com/watch?v=Q9dzfPfhF3U&t=65s

其他命令同样查阅shopify.dev

## 自动部署到 Render.com

本项目支持通过 GitHub Actions 自动部署到 Render.com。部署会在以下情况自动触发：
- 向 `main` 分支推送代码
- 向 `deploy` 分支推送代码
- 手动触发 GitHub Actions 工作流程

### 配置步骤

1. 在 Render.com 上创建 Web Service 或 Static Site
2. 获取 Deploy Hook URL 或 API Key
3. 在 GitHub 仓库中配置 Secrets
4. 推送代码到触发分支

详细配置说明请参考：
- [中文文档](./docs/render-deployment.md)
- [English Documentation](./docs/render-deployment-en.md)