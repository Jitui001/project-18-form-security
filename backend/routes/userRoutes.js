const express = require('express');
const validator = require('validator');

const router = express.Router();

/**
 * 用户注册端点 - 完整安全流程演示
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('[注册] 收到请求:', { username, email });

    // 1. 后端二次验证
    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 2. 参数类型检查
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: '参数类型错误' });
    }

    // 3. 使用validator库进行详细验证
    if (!validator.isAlphanumeric(username) || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名格式不正确' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    if (password.length < 8 || password.length > 32) {
      return res.status(400).json({ error: '密码长度不正确' });
    }

    // 4. 演示参数化查询概念
    // ✅ 正确做法：使用参数化查询
    // const query = 'SELECT * FROM users WHERE username = ? AND email = ?';
    // const params = [username, email];
    // 这样完全防止SQL注入，因为数据和代码严格分离

    // ❌ 错误做法（绝不要这样做）：
    // const query = `SELECT * FROM users WHERE username = '${username}'`;
    // 这样会被SQL注入攻击利用

    console.log('[注册成功]', { username });

    return res.status(201).json({
      success: true,
      message: '注册成功',
      userId: Math.floor(Math.random() * 10000),
      data: {
        username,
        email,
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('[注册错误]', error);
    
    // ⚠️ 关键：不要返回具体的数据库错误给客户端
    return res.status(500).json({
      error: '注册失败，请稍后重试',
      errorCode: 'REGISTER_FAILED'
    });
  }
});

/**
 * 搜索用户端点 - 防止搜索型SQL注入
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.length > 100) {
      return res.status(400).json({ error: '搜索关键词无效' });
    }

    // ✅ 使用LIKE的参数化查询
    // const query = 'SELECT id, username, email FROM users WHERE username LIKE ? LIMIT 10';
    // const params = [`%${keyword}%`]; // 参数自动转义

    console.log('[搜索] 关键词:', keyword);

    // 模拟返回结果
    return res.json({
      success: true,
      data: [
        { id: 1, username: keyword + '_user1', email: 'user1@example.com' },
        { id: 2, username: keyword + '_user2', email: 'user2@example.com' }
      ],
      count: 2
    });

  } catch (error) {
    console.error('[搜索错误]', error);
    return res.status(500).json({ error: '搜索失败' });
  }
});

/**
 * 获取用户信息
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  // 参数验证
  if (!validator.isNumeric(id)) {
    return res.status(400).json({ error: '用户ID必须是数字' });
  }

  // 模拟返回用户信息
  return res.json({
    success: true,
    data: {
      id: parseInt(id),
      username: 'user_' + id,
      email: `user${id}@example.com`,
      createdAt: new Date()
    }
  });
});

module.exports = router;