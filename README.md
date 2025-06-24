项目运行流程和遇到问题的相关解决方法

首先使用ngrok反向代理生成临时服务
假设生成的域名为https://example.ngrok.app

运行shopify app dev --tunnel-url https://example.ngrok.app:443

相关配置文件在shopify.app.toml具体代码含义查阅shopify.dev

如果运行项目后出现网络问题查看视频也许能够解决
https://www.youtube.com/watch?v=Q9dzfPfhF3U&t=65s

其他命令同样查阅shopify.dev