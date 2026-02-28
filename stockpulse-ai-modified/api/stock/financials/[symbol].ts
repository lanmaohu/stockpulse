import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

// @ts-ignore
const yf = new YahooFinance();

// 错误类型定义
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

function createAPIError(type: ErrorType, message: string) {
  return {
    success: false as const,
    error: { type, message },
  };
}

function createAPISuccess<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

function parseYahooFinanceError(error: any): { type: ErrorType; message: string } {
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return { type: ErrorType.STOCK_NOT_FOUND, message: '未找到该股票' };
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return { type: ErrorType.NETWORK_ERROR, message: '网络连接失败' };
  }
  return { type: ErrorType.UNKNOWN_ERROR, message: errorMessage || '未知错误' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol } = req.query;

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
    // 获取详细的财务数据
    const quote = await yf.quote(trimmedSymbol);
    const summary = await yf.quoteSummary(trimmedSymbol, {
      modules: [
        'financialData',
        'earnings',
        'cashflowStatementHistory',
        'defaultKeyStatistics',
      ],
    });

    if (!quote || !quote.symbol) {
      return res.status(404).json(
        createAPIError(ErrorType.STOCK_NOT_FOUND, `未找到股票 "${trimmedSymbol}"`)
      );
    }

    // 提取关键财务数据
    const financialData = summary?.financialData || {};
    const earnings = summary?.earnings || {};
    const cashflowHistory = summary?.cashflowStatementHistory?.cashflowStatements || [];
    const keyStats = summary?.defaultKeyStatistics || {};

    // 获取最新年度数据
    const annualEarnings = earnings?.financialsChart?.annual || [];
    const latestAnnual = annualEarnings[0] || {};

    // 获取最新自由现金流（优先从 cashflowStatementHistory 获取）
    let latestFCF = financialData?.freeCashflow || 0;
    let fcfYear = 'TTM';
    
    if (cashflowHistory.length > 0) {
      const latestCashflow = cashflowHistory[0];
      if (latestCashflow?.freeCashFlow) {
        latestFCF = latestCashflow.freeCashFlow;
        fcfYear = new Date(latestCashflow.endDate).getFullYear().toString();
      }
    }

    // 获取最新营收
    let latestRevenue = financialData?.totalRevenue || 0;
    let revenueYear = 'TTM';
    
    if (latestAnnual?.date && latestAnnual?.revenue) {
      latestRevenue = latestAnnual.revenue;
      revenueYear = latestAnnual.date;
    }

    // 计算 FCF 利润率
    const fcfMargin = latestRevenue > 0 ? (latestFCF / latestRevenue) : 0;

    // 获取营收增长率（如果有）
    const revenueGrowth = financialData?.revenueGrowth || 0;

    // 构建返回数据
    const result = {
      symbol: trimmedSymbol,
      companyName: quote.shortName || quote.longName || trimmedSymbol,
      currency: quote.currency || 'USD',
      currentPrice: quote.regularMarketPrice || 0,
      
      // 最新年度财务数据
      latestRevenue: {
        value: latestRevenue,
        year: revenueYear,
        formatted: formatNumber(latestRevenue),
      },
      
      latestFCF: {
        value: latestFCF,
        year: fcfYear,
        formatted: formatNumber(latestFCF),
      },
      
      // 计算指标
      fcfMargin: fcfMargin,
      fcfMarginPercent: (fcfMargin * 100).toFixed(2),
      
      // 增长率
      revenueGrowth: revenueGrowth,
      revenueGrowthPercent: (revenueGrowth * 100).toFixed(2),
      
      // 其他关键指标
      sharesOutstanding: keyStats?.sharesOutstanding || quote.sharesOutstanding || 0,
      marketCap: quote.marketCap || 0,
      
      // 原始数据（用于调试）
      raw: {
        totalRevenue: financialData?.totalRevenue,
        freeCashflow: financialData?.freeCashflow,
      },
    };

    return res.status(200).json(createAPISuccess(result));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 财务数据失败:`, error);
    const { type, message } = parseYahooFinanceError(error);
    const statusCode = type === ErrorType.STOCK_NOT_FOUND ? 404 : 500;
    return res.status(statusCode).json(createAPIError(type, message));
  }
}

// 格式化数字（转换为 M/B/T）
function formatNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else {
    return num.toLocaleString();
  }
}
