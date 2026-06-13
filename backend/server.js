const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const inputValidatorMiddleware = require('./middleware/inputValidator');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ===== 安全中间件 =====

// 1. Helmet - 设置安全HTTP头
app.use(helmet());

// 2. CORS - 跨域资源共享
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// 3. 请求体大小限制
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// 4. 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制100个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===== 应用路由 =====

app.use('/api/users', inputValidatorMiddleware, userRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[错误]', err);
  res.status(500).json({
    error: '服务器内部错误',
    errorCode: 'INTERNAL_ERROR'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});

module.exports = app;