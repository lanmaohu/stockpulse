import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

// @ts-ignore
const yf = new YahooFinance();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: '请提供股票代码' });
  }

  try {
    const quote = await yf.quote(symbol);
    const summary = await yf.quoteSummary(symbol, {
      modules: [
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'assetProfile',
        'earnings',
        'cashflowStatementHistory',
      ],
    });
    res.status(200).json({ quote, summary });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: '未找到该股票' });
  }
}
