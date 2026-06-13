// utils/FormValidator.ts
import DOMPurify from 'dompurify';
import validator from 'validator';

/**
 * 校验规则类型定义
 */
interface ValidationRule {
  type: 'string' | 'email' | 'number' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  errorMsg: string;
}

/**
 * 校验结果类型定义
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
  warnings?: string[];
}

/**
 * 前端表单安全校验引擎
 * 防御：XSS、注入、格式欺骗、DOS
 */
class FormValidator {
  
  // 1. 基础类型校验规则
  private validationRules: Record<string, ValidationRule> = {
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/, // 只允许字母数字下划线
      errorMsg: '用户名只能包含字母、数字、下划线，长度3-20'
    },
    email: {
      type: 'email',
      maxLength: 100,
      errorMsg: '请输入有效的邮箱地址'
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 32,
      pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/,
      errorMsg: '密码必须包含大小写字母、数字、特殊字符，长度8-32'
    },
    phone: {
      type: 'string',
      pattern: /^1[3-9]\d{9}$/,
      errorMsg: '请输入有效的手机号码'
    },
    comments: {
      type: 'string',
      maxLength: 1000,
      errorMsg: '评论不超过1000字'
    }
  };

  /**
   * 第1层：基础校验（类型、长度、格式）
   */
  validateBasic(fieldName: string, value: any): ValidationResult {
    const rule = this.validationRules[fieldName];
    
    // 如果没有定义规则，认为校验通过
    if (!rule) {
      return { valid: true };
    }

    // 类型检查
    if (typeof value !== 'string' && rule.type !== 'email') {
      return { 
        valid: false, 
        error: `${fieldName}必须是字符串类型` 
      };
    }

    // 空值检查
    if (!value || value.trim() === '') {
      return {
        valid: false,
        error: `${fieldName}不能为空`
      };
    }

    // 长度检查
    if (rule.minLength && value.length < rule.minLength) {
      return { valid: false, error: rule.errorMsg };
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return { valid: false, error: rule.errorMsg };
    }

    // 格式检查（正则表达式）
    if (rule.pattern && !rule.pattern.test(value)) {
      return { valid: false, error: rule.errorMsg };
    }

    // Email特殊处理
    if (rule.type === 'email' && !validator.isEmail(value)) {
      return { valid: false, error: rule.errorMsg };
    }

    // 电话号码特殊处理
    if (rule.type === 'phone' && !validator.isMobilePhone(value, 'zh-CN')) {
      return { valid: false, error: rule.errorMsg };
    }

    return { valid: true };
  }

  /**
   * 第2层：XSS防护（关键！）
   * 防御攻击：<img src=x onerror="alert('xss')"> 
   */
  sanitizeXSS(input: string, fieldType: 'html' | 'text' = 'text'): string {
    if (!input) {
      return '';
    }

    if (fieldType === 'html') {
      // 允许HTML但过滤危险标签
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'title'],
        RETURN_DOM: false,
      }) as string;
    }
    
    // 纯文本模式：转义所有HTML特殊字符
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // 移除所有标签
      ALLOWED_ATTR: [],
    }) as string;
  }

  /**
   * 第3层：SQL注入防护（客户端提示）
   * 真正防护在后端，这里是提前预警
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bEXEC\b|\bEXECUTE\b)/i,
      /(-{2}|\/\*|\*\/|;|\||&&)/,
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 第4层：综合校验流程（推荐使用）
   */
  validateField(fieldName: string, value: string): ValidationResult {
    const warnings: string[] = [];

    // 1. 基础校验
    const basicCheck = this.validateBasic(fieldName, value);
    if (!basicCheck.valid) {
      return { 
        valid: false, 
        error: basicCheck.error 
      };
    }

    // 2. XSS检测与清理
    const sanitized = this.sanitizeXSS(value, 'text');
    if (sanitized !== value) {
      warnings.push('输入包含可疑HTML标签，已自动清理');
    }

    // 3. SQL注入检测
    if (this.detectSQLInjection(value)) {
      warnings.push('输入包含可疑SQL关键词，后端将进行严格验证');
    }

    // 4. 黑名单检查
    if (this.containsForbiddenWords(sanitized)) {
      return { 
        valid: false, 
        error: '输入包含不允许的内容' 
      };
    }

    return {
      valid: true,
      sanitized,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 黑名单过滤
   */
  private containsForbiddenWords(input: string): boolean {
    const forbiddenWords = ['admin', 'root', 'delete', 'drop'];
    return forbiddenWords.some(word => 
      input.toLowerCase().includes(word.toLowerCase())
    );
  }

  /**
   * CSRF Token生成（结合后端）
   */
  generateCSRFToken(): string {
    return `token_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证多个字段
   */
  validateForm(formData: Record<string, string>): {
    isValid: boolean;
    errors: Record<string, string>;
    sanitized: Record<string, string>;
    warnings: Record<string, string[]>;
  } {
    const errors: Record<string, string> = {};
    const sanitized: Record<string, string> = {};
    const warnings: Record<string, string[]> = {};

    for (const [fieldName, value] of Object.entries(formData)) {
      const result = this.validateField(fieldName, value);
      
      if (!result.valid) {
        errors[fieldName] = result.error || '验证失败';
      } else {
        sanitized[fieldName] = result.sanitized || value;
        if (result.warnings) {
          warnings[fieldName] = result.warnings;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitized,
      warnings
    };
  }
}

export default new FormValidator();