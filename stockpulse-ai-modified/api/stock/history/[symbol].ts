import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

// @ts-ignore
const yf = new YahooFinance();

// 错误类型定义（内联，避免路径问题）
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 创建 API 错误响应
function createAPIError(type: ErrorType, message: string) {
  return {
    success: false as const,
    error: { type, message },
  };
}

// 创建 API 成功响应
function createAPISuccess<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

// 解析 Yahoo Finance 错误
function parseYahooFinanceError(error: any): { type: ErrorType; message: string } {
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('not found') || lowerMessage.includes('no data found') || lowerMessage.includes('404')) {
    return { type: ErrorType.STOCK_NOT_FOUND, message: '未找到该股票' };
  }
  if (lowerMessage.includes('too many') || lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return { type: ErrorType.API_RATE_LIMIT, message: '请求过于频繁' };
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed') || lowerMessage.includes('timeout')) {
    return { type: ErrorType.NETWORK_ERROR, message: '网络连接失败' };
  }
  if (lowerMessage.includes('internal server error') || lowerMessage.includes('500')) {
    return { type: ErrorType.SERVER_ERROR, message: '服务器错误' };
  }
  
  return { type: ErrorType.UNKNOWN_ERROR, message: errorMessage || '未知错误' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol, interval, period1, period2 } = req.query;

  // 验证股票代码
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json(
      createAPIError(ErrorType.INVALID_SYMBOL, '请提供正确的股票代码')
    );
  }

  const trimmedSymbol = symbol.trim().toUpperCase();

  try {
    const queryOptions: any = {
      interval: (interval as string) || '1d',
    };

    // 处理时间参数
    if (period1) {
      queryOptions.period1 = isNaN(Number(period1)) ? period1 : Number(period1);
    }
    if (period2) {
      queryOptions.period2 = isNaN(Number(period2)) ? period2 : Number(period2);
    }

    // 默认获取最近 3 个月的数据
    if (!queryOptions.period1) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      queryOptions.period1 = threeMonthsAgo;
    }

    const result = await yf.chart(trimmedSymbol, queryOptions);

    // 检查是否有数据
    if (!result || !(result as any).quotes || (result as any).quotes.length === 0) {
      return res.status(404).json(
        createAPIError(ErrorType.NO_DATA_AVAILABLE, '该时间段暂无历史数据')
      );
    }

    return res.status(200).json(createAPISuccess(result));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 历史数据失败:`, error);

    const { type, message } = parseYahooFinanceError(error);
    
    const statusCode = type === ErrorType.STOCK_NOT_FOUND ? 404 : 
                       type === ErrorType.API_RATE_LIMIT ? 429 : 
                       type === ErrorType.NETWORK_ERROR ? 503 : 500;

    return res.status(statusCode).json(createAPIError(type, message));
  }
}
