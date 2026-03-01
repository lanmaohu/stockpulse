import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol } = req.query;
  const period = (req.query.period as string) || '1d';

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({
      success: false,
      error: '请提供正确的股票代码'
    });
  }

  try {
    // 根据周期设置时间范围
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setMonth(now.getMonth() - 6); // 日线：6个月
        break;
      case '1wk':
        startDate.setFullYear(now.getFullYear() - 2); // 周线：2年
        break;
      case '1mo':
        startDate.setFullYear(now.getFullYear() - 5); // 月线：5年
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    const queryOptions = {
      period1: startDate,
      period2: now,
      interval: period as any,
    };

    const result = await yahooFinance.historical(symbol, queryOptions);
    
    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到历史数据'
      });
    }

    // 转换为蜡烛图格式
    const candles = result.map(item => ({
      time: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    // 获取股票基本信息
    const quote = await yahooFinance.quote(symbol);

    return res.status(200).json({
      success: true,
      data: {
        candles,
        symbol,
        name: quote.shortName || quote.longName || symbol,
        market: symbol.endsWith('.HK') ? 'HK' : symbol.endsWith('.SS') || symbol.endsWith('.SZ') ? 'CN' : 'US',
        currentPrice: quote.regularMarketPrice || candles[candles.length - 1]?.close,
      }
    });

  } catch (error: any) {
    console.error('Error fetching historical data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '获取历史数据失败'
    });
  }
}
