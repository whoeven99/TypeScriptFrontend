import express from 'express';
const app = express();
app.use(express.json());

app.post('/api/log', (req, res) => {
  console.log('收到日志:', req.body);
  // 你可以把日志写入数据库、文件，或第三方日志平台
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
const HOST = "https://01e1b0cc3292.ngrok.app";

app.listen(PORT, HOST, () => {
  console.log(`日志服务器已启动，监听地址：http://${HOST}:${PORT}`);
});