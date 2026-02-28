import type { ErrorType, FriendlyError } from '../types/error';

/**
 * API 错误响应结构
 */
export interface APIErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: string;
  };
}

/**
 * API 成功响应结构
 */
export interface APISuccessResponse<T> {
  success: true;
  data: T;
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

/**
 * 创建 API 错误响应
 */
export function createAPIError(
  type: ErrorType, 
  message: string, 
  details?: string
): APIErrorResponse {
  return {
    success: false,
    error: {
      type,
      message,
      details,
    },
  };
}

/**
 * 创建 API 成功响应
 */
export function createAPISuccess<T>(data: T): APISuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * 检查股票代码格式是否有效
 */
export function isValidSymbol(symbol: string): boolean {
  // 支持格式：
  // AAPL, TSLA (美股)
  // 0700.HK, 9988.HK (港股)
  // 000001.SZ, 600000.SS (A股)
  // BTC-USD, ETH-USD (加密货币)
  const validPattern = /^[A-Z0-9\-]+(\.[A-Z]{2})?$/;
  return validPattern.test(symbol.toUpperCase()) && symbol.length >= 1 && symbol.length <= 10;
}

/**
 * 从 Yahoo Finance 错误中提取有用的信息
 */
export function parseYahooFinanceError(error: any): { type: ErrorType; message: string } {
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();

  // 股票不存在
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('no data found') ||
    lowerMessage.includes('invalid crumb') ||
    lowerMessage.includes('404')
  ) {
    return {
      type: 'STOCK_NOT_FOUND' as ErrorType,
      message: '未找到该股票，请检查代码是否正确',
    };
  }

  // 频率限制
  if (
    lowerMessage.includes('too many') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429')
  ) {
    return {
      type: 'API_RATE_LIMIT' as ErrorType,
      message: '请求过于频繁，请稍后再试',
    };
  }

  // 网络错误
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('timeout')
  ) {
    return {
      type: 'NETWORK_ERROR' as ErrorType,
      message: '网络连接失败，请检查网络设置',
    };
  }

  // 服务器错误
  if (
    lowerMessage.includes('internal server error') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('503')
  ) {
    return {
      type: 'SERVER_ERROR' as ErrorType,
      message: '服务器暂时不可用，请稍后重试',
    };
  }

  // 数据不可用
  if (lowerMessage.includes('no data')) {
    return {
      type: 'NO_DATA_AVAILABLE' as ErrorType,
      message: '该股票暂无可用数据',
    };
  }

  // 默认
  return {
    type: 'UNKNOWN_ERROR' as ErrorType,
    message: errorMessage || '获取数据时发生错误',
  };
}

/**
 * 全局错误处理器（可用于 window.onerror）
 */
export function setupGlobalErrorHandler(onError?: (error: Error) => void) {
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('全局错误捕获:', { message, source, lineno, colno, error });
      onError?.(error || new Error(String(message)));
      return false;
    };

    window.onunhandledrejection = (event) => {
      console.error('未处理的 Promise 拒绝:', event.reason);
      onError?.(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };
  }
}
