# 前端表单输入安全校验系统

**项目编号**: 18  
**项目名称**: 前端表单输入安全校验系统  
**技术栈**: React + TypeScript + Express + Node.js

## 📚 项目概述

本项目是一个完整的Web表单安全解决方案，从前端输入校验到后端安全验证，实现分层防护。核心目标是防御以下安全威胁：

- **XSS (跨站脚本攻击)** - 防止恶意JavaScript执行
- **SQL注入** - 防止数据库被恶意查询
- **CSRF (跨站请求伪造)** - 防止未授权的请求
- **DOS (拒绝服务)** - 防止超大请求和爆破
- **格式欺骗** - 验证数据类型和格式

## 🏗️ 项目架构

```
┌─────────────────────────────────────┐
│         前端 (React)                 │
│  ┌─────────────────────────────┐    │
│  │ FormValidator (校验引擎)     │    │
│  │ - 类型检查                  │    │
│  │ - XSS防护                  │    │
│  │ - SQL注入检测              │    │
│  │ - 格式验证                  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓ HTTPS ↓
┌─────────────────────────────────────┐
│      后端 (Express/Node.js)         │
│  ┌─────────────────��───────────┐    │
│  │ 安全中间件                  │    │
│  │ - CSRF验证                 │    │
│  │ - 速率限制                  │    │
│  │ - 日志记录                  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 后端二次校验                │    │
│  │ - 参数类型检查              │    │
│  │ - 参数化查询 (防SQL注入)    │    │
│  │ - 业务逻辑验证              │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓ 数据库 ↓
┌─────────────────────────────────────┐
│      数据库 (MySQL)                 │
│  - 预编译语句执行                    │
│  - 审计日志记录                      │
└─────────────────────────────────────┘
```

## 🔒 核心安全机制

### 1. XSS防护（三层）

**第一层 - 输入验证**
```typescript
// 检查输入是否包含可疑HTML标签
const result = FormValidator.validateField('comments', userInput);
if (result.warnings) {
  console.log('检测到可疑内容:', result.warnings);
}
```

**第二层 - HTML清理**
```typescript
// 使用DOMPurify库移除危险标签
const sanitized = DOMPurify.sanitize(input, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: ['href']
});
```

**第三层 - 后端转义**
```javascript
// 服务器再次清理所有HTML
const cleaned = sanitizeHtml(input, { allowedTags: [] });
```

### 2. SQL注入防护（参数化查询）

❌ **易被注入的做法**
```javascript
const query = `SELECT * FROM users WHERE username = '${username}'`;
// 攻击: username = "admin' OR '1'='1"
// 结果: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
```

✅ **安全的做法**
```javascript
const query = 'SELECT * FROM users WHERE username = ?';
const params = [username];
// 数据库驱动自动转义，完全隔离数据和代码
```

### 3. CSRF防护

```javascript
// 服务器生成Token
const csrfToken = crypto.randomBytes(32).toString('hex');
session.csrfToken = csrfToken;

// 表单提交时必须包含Token
fetch('/api/register', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify(formData)
});

// 服务器验证Token
if (req.headers['x-csrf-token'] !== req.session.csrfToken) {
  return res.status(403).json({ error: 'CSRF Token无效' });
}
```

### 4. 速率限制

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: '请求过于频繁'
});

app.use('/api/', limiter);
```

## 🚀 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端

```bash
cd backend
npm install
npm run dev
```

### 运行测试

```bash
# XSS防护测试
node tests/xssVulnerability.test.js

# 渗透测试
node tests/penetrationTest.js
```

## 📊 测试覆盖

✅ **XSS防护**
- `<script>` 标签注入
- 事件处理器注入 (`onerror`, `onclick`)
- SVG向量攻击

✅ **SQL注入**
- OR注入 (`' OR '1'='1`)
- UNION查询注入
- 注释绕过 (`'--`)

✅ **格式验证**
- 邮箱格式
- 密码强度
- 用户名规范

✅ **DOS防护**
- 超长输入检测
- 请求频率限制

## 📁 文件结构

```
project-18-form-security/
├── frontend/                    # React前端
│   ├── src/
│   │   ├── components/         # React组件
│   │   ├── utils/
│   │   │   └── FormValidator.ts # 校验引擎
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # Express后端
│   ├── server.js
│   ├── middleware/
│   │   └── inputValidator.js   # 安全中间件
│   ├── routes/
│   │   └── userRoutes.js       # 用户接口
│   └── package.json
│
├── tests/                       # 测试脚本
│   ├── xssVulnerability.test.js
│   └── penetrationTest.js
│
├── database/
│   └── schema.sql              # 数据库脚本
│
└── docs/
    └── README.md
```

## 🎯 关键特性

✨ **分层防护** - 前端+后端双重校验  
✨ **实时反馈** - 用户友好的错误提示  
✨ **完整日志** - 安全事件审计追踪  
✨ **防护全面** - XSS、SQL注入、CSRF、DOS  
✨ **生产就绪** - Helmet、CORS、Rate Limiting  
✨ **易于扩展** - 模块化设计，易于定制  

## 📖 答辩要点

1. **为什么需要前后端都做校验？**
   - 前端提升UX，检测无意错误
   - 后端是真正防线，攻击者可绕过前端

2. **SQL注入如何完全防止？**
   - 使用参数化查询/预编译语句
   - 数据和代码严格分离
   - 数据库驱动自动进行安全转义

3. **XSS有哪些防护层级？**
   - 输入验证：检查格式和内容
   - HTML清理：移除危险标签
   - 输出转义：在显示前再次清理

4. **CSRF是什么，如何防护？**
   - 跨站请求伪造攻击
   - 使用CSRF Token，每个请求都验证
   - Token只有通过正常表单才能获取

## 🔗 相关资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Helmet.js](https://helmetjs.github.io/)
- [Express安全最佳实践](https://expressjs.com/en/advanced/best-practice-security.html)

---

**最后更新**: 2026年6月13日  
**维护者**: Jitui001
