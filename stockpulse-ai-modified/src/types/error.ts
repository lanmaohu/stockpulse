// ==================== 错误类型定义 ====================

/**
 * 应用错误类型枚举
 * 用于区分不同类型的错误，提供针对性的提示
 */
export enum ErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',           // 网络连接失败
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',           // 请求超时
  
  // 股票数据相关错误
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',       // 股票不存在
  INVALID_SYMBOL = 'INVALID_SYMBOL',         // 股票代码格式错误
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',   // 该股票暂无数据
  
  // API 相关错误
  API_RATE_LIMIT = 'API_RATE_LIMIT',         // API 调用频率限制
  API_KEY_INVALID = 'API_KEY_INVALID',       // API Key 无效
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 服务暂时不可用
  
  // 服务器错误
  SERVER_ERROR = 'SERVER_ERROR',             // 服务器内部错误
  
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',           // 未知错误
}

/**
 * 友好的错误信息接口
 */
export interface FriendlyError {
  type: ErrorType;
  title: string;           // 错误标题（简短）
  message: string;         // 错误详情
  suggestion: string;      // 解决建议
  icon?: string;           // 图标类型
  canRetry: boolean;       // 是否可以重试
}

/**
 * 错误信息映射表
 * 根据错误类型返回对应的中文提示
 */
export const ErrorMessages: Record<ErrorType, Omit<FriendlyError, 'type'>> = {
  [ErrorType.NETWORK_ERROR]: {
    title: '网络连接失败',
    message: '无法连接到服务器，请检查您的网络连接。',
    suggestion: '请检查：\n1. 您的网络连接是否正常\n2. 是否开启了 VPN 或代理\n3. 防火墙是否阻止了连接',
    icon: 'wifi-off',
    canRetry: true,
  },
  [ErrorType.TIMEOUT_ERROR]: {
    title: '请求超时',
    message: '服务器响应时间过长，请稍后重试。',
    suggestion: '可能原因：\n1. 网络信号较弱\n2. 服务器繁忙\n建议稍后重试或检查网络',
    icon: 'clock',
    canRetry: true,
  },
  [ErrorType.STOCK_NOT_FOUND]: {
    title: '未找到该股票',
    message: '您输入的股票代码可能不存在或已退市。',
    suggestion: '请检查：\n1. 股票代码是否正确（如：AAPL、TSLA、0700.HK）\n2. 是否包含了正确的市场后缀（如 .HK 表示港股）\n3. 该股票是否仍在交易',
    icon: 'search-x',
    canRetry: false,
  },
  [ErrorType.INVALID_SYMBOL]: {
    title: '股票代码格式错误',
    message: '请输入正确的股票代码格式。',
    suggestion: '正确的格式示例：\n• 美股：AAPL、TSLA、MSFT\n• 港股：0700.HK、9988.HK\n• A股：000001.SZ、600000.SS\n注意：不要包含特殊字符或空格',
    icon: 'alert-triangle',
    canRetry: false,
  },
  [ErrorType.NO_DATA_AVAILABLE]: {
    title: '暂无数据',
    message: '该股票暂时无法获取数据，可能是新股或数据更新中。',
    suggestion: '建议：\n1. 该股票可能是新上市，数据尚未完善\n2. 可以稍后再试\n3. 尝试搜索其他相关股票',
    icon: 'database',
    canRetry: true,
  },
  [ErrorType.API_RATE_LIMIT]: {
    title: '请求过于频繁',
    message: '您操作得太快了，请稍等片刻再试。',
    suggestion: '为了保护服务器，我们对请求频率做了限制。\n建议：\n1. 等待 30 秒后重试\n2. 减少频繁的搜索操作\n3. 如需大量查询，请联系开发者',
    icon: 'timer',
    canRetry: true,
  },
  [ErrorType.API_KEY_INVALID]: {
    title: 'API 密钥无效',
    message: '系统配置出现问题，无法获取数据。',
    suggestion: '这可能是因为：\n1. API 密钥已过期\n2. 环境变量配置错误\n如果您是开发者，请检查 .env.local 文件中的 KIMI_API_KEY 配置。',
    icon: 'key',
    canRetry: false,
  },
  [ErrorType.SERVICE_UNAVAILABLE]: {
    title: '服务暂时不可用',
    message: '数据服务正在维护或暂时无法访问。',
    suggestion: '建议：\n1. 等待几分钟后重试\n2. 查看 Yahoo Finance 官网是否正常\n3. 关注系统状态公告',
    icon: 'cloud-off',
    canRetry: true,
  },
  [ErrorType.SERVER_ERROR]: {
    title: '服务器错误',
    message: '服务器遇到了意外情况，无法完成您的请求。',
    suggestion: '这可能是一个临时问题。建议：\n1. 刷新页面重试\n2. 如果问题持续，请截图并联系技术支持',
    icon: 'server-off',
    canRetry: true,
  },
  [ErrorType.UNKNOWN_ERROR]: {
    title: '发生未知错误',
    message: '系统遇到了意外问题，我们深表歉意。',
    suggestion: '建议：\n1. 刷新页面后重试\n2. 清除浏览器缓存\n3. 如果问题持续，请向开发者反馈',
    icon: 'help-circle',
    canRetry: true,
  },
};

/**
 * 根据 HTTP 状态码获取错误类型
 */
export function getErrorTypeFromStatus(status: number, message?: string): ErrorType {
  // 根据状态码判断
  switch (status) {
    case 400:
      return ErrorType.INVALID_SYMBOL;
    case 401:
    case 403:
      return ErrorType.API_KEY_INVALID;
    case 404:
      return ErrorType.STOCK_NOT_FOUND;
    case 408:
      return ErrorType.TIMEOUT_ERROR;
    case 429:
      return ErrorType.API_RATE_LIMIT;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER_ERROR;
    default:
      break;
  }

  // 根据错误消息判断
  if (message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (lowerMsg.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (lowerMsg.includes('not found') || lowerMsg.includes('未找到')) {
      return ErrorType.STOCK_NOT_FOUND;
    }
    if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
      return ErrorType.API_RATE_LIMIT;
    }
    if (lowerMsg.includes('invalid') || lowerMsg.includes('无效')) {
      return ErrorType.INVALID_SYMBOL;
    }
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 创建友好的错误对象
 */
export function createFriendlyError(type: ErrorType, customMessage?: string): FriendlyError {
  const defaultError = ErrorMessages[type];
  return {
    type,
    title: defaultError.title,
    message: customMessage || defaultError.message,
    suggestion: defaultError.suggestion,
    icon: defaultError.icon,
    canRetry: defaultError.canRetry,
  };
}

/**
 * 解析错误并返回友好的错误信息
 */
export function parseError(error: any): FriendlyError {
  // 如果已经是 FriendlyError，直接返回
  if (error?.type && Object.values(ErrorType).includes(error.type)) {
    return error as FriendlyError;
  }

  // 网络错误（fetch 失败）
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createFriendlyError(ErrorType.NETWORK_ERROR);
  }

  // HTTP 错误
  if (error?.status) {
    const type = getErrorTypeFromStatus(error.status, error.message);
    return createFriendlyError(type, error.message);
  }

  // 字符串错误
  if (typeof error === 'string') {
    if (error.includes('未找到') || error.includes('not found')) {
      return createFriendlyError(ErrorType.STOCK_NOT_FOUND);
    }
    if (error.includes('timeout') || error.includes('超时')) {
      return createFriendlyError(ErrorType.TIMEOUT_ERROR);
    }
    return createFriendlyError(ErrorType.UNKNOWN_ERROR, error);
  }

  // 默认未知错误
  return createFriendlyError(ErrorType.UNKNOWN_ERROR, error?.message);
}
