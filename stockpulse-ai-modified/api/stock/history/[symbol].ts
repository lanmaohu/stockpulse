import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';
import { parseYahooFinanceError, createAPIError, createAPISuccess } from '../../../src/utils/errorHandler';
import { ErrorType } from '../../../src/types/error';

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

  const { symbol, interval, period1, period2 } = req.query;

  // 验证股票代码
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json(
      createAPIError('INVALID_SYMBOL' as ErrorType, '请提供正确的股票代码')
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
    if (!result || !result.quotes || result.quotes.length === 0) {
      return res.status(404).json(
        createAPIError('NO_DATA_AVAILABLE' as ErrorType, '该时间段暂无历史数据')
      );
    }

    return res.status(200).json(createAPISuccess(result));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 历史数据失败:`, error);

    const { type, message } = parseYahooFinanceError(error);
    
    const statusCode = type === 'STOCK_NOT_FOUND' ? 404 : 
                       type === 'API_RATE_LIMIT' ? 429 : 
                       type === 'NETWORK_ERROR' ? 503 : 500;

    return res.status(statusCode).json(
      createAPIError(type as ErrorType, message)
    );
  }
}
