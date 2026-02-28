import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

// @ts-ignore
const yf = new YahooFinance();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol, interval, period1, period2 } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: '请提供股票代码' });
  }

  try {
    const queryOptions: any = {
      interval: (interval as string) || '1d',
    };

    if (period1) queryOptions.period1 = isNaN(Number(period1)) ? period1 : Number(period1);
    if (period2) queryOptions.period2 = isNaN(Number(period2)) ? period2 : Number(period2);

    if (!queryOptions.period1) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      queryOptions.period1 = threeMonthsAgo;
    }

    const result = await yf.chart(symbol, queryOptions);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: '获取历史数据失败' });
  }
}
