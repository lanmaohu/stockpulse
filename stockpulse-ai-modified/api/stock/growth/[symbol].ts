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

// 计算同比增长率
function calculateGrowthRates(revenues: Array<{ year: string; value: number }>): Array<{
  year: string;
  revenue: number;
  growthRate: number | null;
}> {
  return revenues.map((item, index) => {
    if (index === 0) {
      return { year: item.year, revenue: item.value, growthRate: null };
    }
    const prevRevenue = revenues[index - 1].value;
    const growthRate = prevRevenue > 0 ? (item.value - prevRevenue) / prevRevenue : null;
    return { year: item.year, revenue: item.value, growthRate };
  });
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
    // 获取财务数据
    const quote = await yf.quote(trimmedSymbol);
    const summary = await yf.quoteSummary(trimmedSymbol, {
      modules: ['earnings', 'financialData'],
    });

    if (!quote || !quote.symbol) {
      return res.status(404).json(
        createAPIError(ErrorType.STOCK_NOT_FOUND, `未找到股票 "${trimmedSymbol}"`)
      );
    }

    // 获取年度营收数据 - 尝试多个可能的数据源
    const earnings = summary?.earnings || {};
    const financialData = summary?.financialData || {};
    
    // 首先尝试 financialsChart.yearly
    let yearlyData = earnings?.financialsChart?.yearly || [];
    
    // 如果没有 yearly，尝试 annual
    if (!yearlyData || yearlyData.length === 0) {
      yearlyData = earnings?.financialsChart?.annual || [];
    }

    console.log(`[API] ${trimmedSymbol} yearlyData:`, JSON.stringify(yearlyData).substring(0, 200));

    // 转换为标准格式
    const revenues = yearlyData
      .filter((item: any) => {
        // 支持多种字段名
        const revenue = item.revenue || item.totalRevenue || item.Revenue;
        const year = item.date || item.year || item.fiscalYear;
        return revenue && year;
      })
      .map((item: any) => ({
        year: String(item.date || item.year || item.fiscalYear),
        value: item.revenue || item.totalRevenue || item.Revenue,
      }))
      .sort((a: any, b: any) => parseInt(a.year) - parseInt(b.year));

    console.log(`[API] ${trimmedSymbol} parsed revenues:`, revenues);

    if (revenues.length < 2) {
      return res.status(404).json(
        createAPIError(ErrorType.NO_DATA_AVAILABLE, `营收数据不足 (${revenues.length} 年)，无法计算增长率`)
      );
    }

    // 计算增长率
    const growthData = calculateGrowthRates(revenues);

    // 取最近5年（最后5条数据，因为有增长率的从第二条开始）
    const recent5Years = growthData.slice(-6); // 取6年才有5个增长率
    const growthRates = recent5Years
      .filter((item) => item.growthRate !== null)
      .map((item) => ({
        year: item.year,
        revenue: item.revenue,
        growthRate: item.growthRate,
        growthRatePercent: item.growthRate ? (item.growthRate * 100).toFixed(2) : null,
      }));

    // 获取最近一年的增长率
    const latestGrowth = growthRates[growthRates.length - 1];
    const latestGrowthRate = latestGrowth?.growthRate || 0;

    // 获取 TTM 增长率（如果有）
    const ttmGrowth = financialData?.revenueGrowth || latestGrowthRate;

    // 计算平均增长率
    const avgGrowth = growthRates.reduce((sum, item) => sum + (item.growthRate || 0), 0) / growthRates.length;

    // 构建返回数据
    const result = {
      symbol: trimmedSymbol,
      companyName: quote.shortName || quote.longName || trimmedSymbol,
      
      // 最近5年详细数据
      history: growthRates,
      
      // 统计数据
      latestYear: latestGrowth?.year || '',
      latestRevenue: latestGrowth?.revenue || 0,
      latestGrowthRate: latestGrowthRate,
      latestGrowthRatePercent: (latestGrowthRate * 100).toFixed(2),
      
      // TTM 增长率
      ttmGrowthRate: ttmGrowth,
      ttmGrowthRatePercent: (ttmGrowth * 100).toFixed(2),
      
      // 平均增长率
      avgGrowthRate: avgGrowth,
      avgGrowthRatePercent: (avgGrowth * 100).toFixed(2),
      
      // 建议的默认值
      suggestedDefaults: {
        // 1-5年使用最近一年增长率
        growthRate1to5: latestGrowthRate,
        growthRate1to5Percent: (latestGrowthRate * 100).toFixed(2),
        // 6-10年使用最近一年的50%
        growthRate6to10: latestGrowthRate * 0.5,
        growthRate6to10Percent: (latestGrowthRate * 50).toFixed(2),
      },
    };

    return res.status(200).json(createAPISuccess(result));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 增长率数据失败:`, error);
    const { type, message } = parseYahooFinanceError(error);
    const statusCode = type === ErrorType.STOCK_NOT_FOUND ? 404 : 500;
    return res.status(statusCode).json(createAPIError(type, message));
  }
}
