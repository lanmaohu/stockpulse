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

  const { symbol } = req.query;

  // 验证股票代码
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json(
      createAPIError(ErrorType.INVALID_SYMBOL, '请提供正确的股票代码')
    );
  }

  const trimmedSymbol = symbol.trim().toUpperCase();

  // 验证股票代码格式
  const validPattern = /^[A-Z0-9\-]+(\.[A-Z]{2})?$/;
  if (!validPattern.test(trimmedSymbol) || trimmedSymbol.length > 10) {
    return res.status(400).json(
      createAPIError(ErrorType.INVALID_SYMBOL, '股票代码格式不正确')
    );
  }

  try {
    // 并行获取股票报价和详细信息
    const [quote, summary] = await Promise.all([
      yf.quote(trimmedSymbol),
      yf.quoteSummary(trimmedSymbol, {
        modules: [
          'summaryDetail',
          'financialData',
          'defaultKeyStatistics',
          'assetProfile',
          'earnings',
          'cashflowStatementHistory',
        ],
      }),
    ]);

    // 检查数据是否有效
    if (!quote || !quote.symbol) {
      return res.status(404).json(
        createAPIError(ErrorType.STOCK_NOT_FOUND, `未找到股票 "${trimmedSymbol}"`)
      );
    }

    // 返回成功响应
    return res.status(200).json(createAPISuccess({ quote, summary }));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 数据失败:`, error);

    // 解析错误类型
    const { type, message } = parseYahooFinanceError(error);
    
    // 根据错误类型返回相应的状态码
    const statusCode = type === ErrorType.STOCK_NOT_FOUND ? 404 : 
                       type === ErrorType.API_RATE_LIMIT ? 429 : 
                       type === ErrorType.NETWORK_ERROR ? 503 : 500;

    return res.status(statusCode).json(createAPIError(type, message));
  }
}
