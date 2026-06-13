const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * 后端输入校验中间件 - 绝不信任前端！
 */
const inputValidatorMiddleware = (req, res, next) => {
  console.log('[安全] 接收到请求:', {
    method: req.method,
    path: req.path,
    body: JSON.stringify(req.body).substring(0, 100),
    ip: req.ip
  });

  // 1. CSRF Token验证
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  if (!csrfToken || !validateCSRFToken(csrfToken)) {
    console.warn('[安全警告] CSRF Token验证失败');
    return res.status(403).json({ error: '请求被拒绝 (CSRF验证失败)' });
  }

  // 2. 请求体大小限制（防止DOS）
  if (JSON.stringify(req.body).length > 10000) {
    console.warn('[安全警告] 请求体过大');
    return res.status(413).json({ error: '请求体过大' });
  }

  // 3. 对所有字符串字段进行二次清理
  req.body = sanitizeRequestBody(req.body);

  // 4. 速率限制
  if (!checkRateLimit(req.ip)) {
    console.warn('[安全警告] IP请求频率过高:', req.ip);
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  }

  // 5. 安全日志
  logSecurityEvent({
    timestamp: new Date(),
    type: 'INPUT_VALIDATION',
    ip: req.ip,
    path: req.path,
    status: 'PASS'
  });

  next();
};

/**
 * 递归清理请求体中的所有字符串
 */
function sanitizeRequestBody(obj, depth = 0) {
  if (depth > 5) return obj; // 防止无限递归

  if (typeof obj === 'string') {
    // XSS防护：移除所有HTML标签
    return sanitizeHtml(obj, {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeRequestBody(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeRequestBody(obj[key], depth + 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * 模拟CSRF Token验证
 */
function validateCSRFToken(token) {
  return token && token.startsWith('token_') && token.length > 10;
}

/**
 * 简单速率限制（实际应用使用Redis）
 */
const requestCache = new Map();

function checkRateLimit(ip, limit = 100, window = 60000) {
  const now = Date.now();
  const key = ip;

  if (!requestCache.has(key)) {
    requestCache.set(key, []);
  }

  const requests = requestCache.get(key);
  const recentRequests = requests.filter(time => now - time < window);

  if (recentRequests.length >= limit) {
    return false; // 超限
  }

  recentRequests.push(now);
  requestCache.set(key, recentRequests);
  return true;
}

/**
 * 安全事件日志
 */
function logSecurityEvent(event) {
  console.log('[安全日志]', JSON.stringify(event));
}

module.exports = inputValidatorMiddleware;