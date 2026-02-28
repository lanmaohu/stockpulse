import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';
import { parseYahooFinanceError, createAPIError, createAPISuccess } from '../../src/utils/errorHandler';
import { ErrorType } from '../../src/types/error';

// @ts-ignore
const yf = new YahooFinance();

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
      createAPIError('INVALID_SYMBOL' as ErrorType, '请提供正确的股票代码')
    );
  }

  const trimmedSymbol = symbol.trim().toUpperCase();

  // 验证股票代码格式
  const validPattern = /^[A-Z0-9\-]+(\.[A-Z]{2})?$/;
  if (!validPattern.test(trimmedSymbol) || trimmedSymbol.length > 10) {
    return res.status(400).json(
      createAPIError('INVALID_SYMBOL' as ErrorType, '股票代码格式不正确')
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
        createAPIError('STOCK_NOT_FOUND' as ErrorType, `未找到股票 "${trimmedSymbol}"`)
      );
    }

    // 返回成功响应
    return res.status(200).json(createAPISuccess({ quote, summary }));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 数据失败:`, error);

    // 解析错误类型
    const { type, message } = parseYahooFinanceError(error);
    
    // 根据错误类型返回相应的状态码
    const statusCode = type === 'STOCK_NOT_FOUND' ? 404 : 
                       type === 'API_RATE_LIMIT' ? 429 : 
                       type === 'NETWORK_ERROR' ? 503 : 500;

    return res.status(statusCode).json(
      createAPIError(type as ErrorType, message)
    );
  }
}
