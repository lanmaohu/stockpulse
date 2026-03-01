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

// 判断市场类型
function getMarketType(symbol: string): 'US' | 'HK' | 'CN' {
  if (symbol.endsWith('.SS') || symbol.endsWith('.SZ')) {
    return 'CN';
  } else if (symbol.endsWith('.HK')) {
    return 'HK';
  }
  return 'US';
}

// A股代码转换 (akshare格式)
function convertAStockSymbol(symbol: string): string {
  // 移除 .SS 或 .SZ 后缀
  return symbol.replace(/\.SS$|\.SZ$/g, '');
}

// 从 akshare 获取 A股财务数据
async function fetchAStockData(symbol: string) {
  const code = convertAStockSymbol(symbol);
  
  try {
    // 使用东方财富 API 获取财务数据
    const response = await fetch(`https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/Index?type=web&code=${code}`);
    
    if (!response.ok) {
      throw new Error('获取A股数据失败');
    }
    
    // 由于 akshare 需要 Python，我们使用简化的模拟数据
    // 实际部署时应该调用 akshare 服务或使用其他 A股数据源
    // 这里使用预设的A股数据作为回退
    return null;
  } catch (error) {
    console.error('A股数据获取失败:', error);
    return null;
  }
}

// 从 Yahoo Finance 获取美股/港股数据
async function fetchYahooFinanceData(symbol: string) {
  try {
    const quote = await yf.quote(symbol);
    const summary = await yf.quoteSummary(symbol, {
      modules: [
        'financialData',
        'earnings',
        'cashflowStatementHistory',
        'balanceSheetHistory',
        'defaultKeyStatistics',
      ],
    });

    if (!quote || !quote.symbol) {
      throw new Error('未找到股票');
    }

    const financialData = summary?.financialData || {};
    const cashflowHistory = summary?.cashflowStatementHistory?.cashflowStatements || [];
    const balanceSheet = summary?.balanceSheetHistory?.balanceSheetStatements || [];
    const keyStats = summary?.defaultKeyStatistics || {};

    // 获取自由现金流
    let latestFCF = financialData?.freeCashflow || 0;
    if (cashflowHistory.length > 0 && cashflowHistory[0]?.freeCashFlow) {
      latestFCF = cashflowHistory[0].freeCashFlow;
    }

    // 获取现金和负债
    let cashAndEquivalents = financialData?.totalCash || 0;
    let totalDebt = financialData?.totalDebt || 0;
    
    if (balanceSheet.length > 0) {
      const latestBalance = balanceSheet[0];
      cashAndEquivalents = latestBalance.cash || latestBalance.cashAndCashEquivalents || cashAndEquivalents;
      totalDebt = latestBalance.shortLongTermDebtTotal || latestBalance.totalDebt || totalDebt;
    }

    // 转换单位（美元/港币转亿人民币，约 7.2/0.92）
    const currency = quote.currency || 'USD';
    let exchangeRate = 1;
    if (currency === 'USD') {
      exchangeRate = 7.2;  // 美元兑人民币
    } else if (currency === 'HKD') {
      exchangeRate = 0.92; // 港币兑人民币
    }

    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      market: currency === 'HKD' ? 'HK' : 'US',
      currentPrice: (quote.regularMarketPrice || 0) * exchangeRate, // 转为人民币
      currentFCF: (latestFCF / 1e8) * exchangeRate, // 转为亿元人民币
      cashAndEquivalents: (cashAndEquivalents / 1e8) * exchangeRate,
      totalDebt: (totalDebt / 1e8) * exchangeRate,
      sharesOutstanding: (keyStats?.sharesOutstanding || quote.sharesOutstanding || 0) / 1e8, // 转为亿股
      currency: 'CNY',
    };
  } catch (error) {
    console.error('Yahoo Finance 获取失败:', error);
    return null;
  }
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
  const marketType = getMarketType(trimmedSymbol);

  try {
    let result = null;

    if (marketType === 'CN') {
      // A股 - 尝试获取实时数据（暂时使用模拟数据）
      result = await fetchAStockData(trimmedSymbol);
      
      // 如果获取失败，返回预设数据
      if (!result) {
        // 查找预设的A股数据
        const presetData = getPresetAStockData(trimmedSymbol);
        if (presetData) {
          result = presetData;
        } else {
          return res.status(404).json(
            createAPIError(ErrorType.NO_DATA_AVAILABLE, '未找到该A股数据')
          );
        }
      }
    } else {
      // 美股/港股 - 使用 Yahoo Finance
      result = await fetchYahooFinanceData(trimmedSymbol);
      
      if (!result) {
        // 尝试预设数据
        const presetData = getPresetStockData(trimmedSymbol);
        if (presetData) {
          result = presetData;
        } else {
          return res.status(404).json(
            createAPIError(ErrorType.NO_DATA_AVAILABLE, '未找到该股票数据')
          );
        }
      }
    }

    return res.status(200).json(createAPISuccess(result));

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 失败:`, error);
    return res.status(500).json(
      createAPIError(ErrorType.UNKNOWN_ERROR, error.message || '获取数据失败')
    );
  }
}

// 预设A股数据（作为回退）
function getPresetAStockData(symbol: string) {
  const aStocks: Record<string, any> = {
    '600519.SS': {
      symbol: '600519.SS',
      name: '贵州茅台',
      market: 'CN',
      currentPrice: 1480,
      currentFCF: 640,
      cashAndEquivalents: 580,
      totalDebt: 0,
      sharesOutstanding: 12.6,
      currency: 'CNY',
    },
    '000858.SZ': {
      symbol: '000858.SZ',
      name: '五粮液',
      market: 'CN',
      currentPrice: 145,
      currentFCF: 260,
      cashAndEquivalents: 920,
      totalDebt: 0,
      sharesOutstanding: 38.8,
      currency: 'CNY',
    },
    '300750.SZ': {
      symbol: '300750.SZ',
      name: '宁德时代',
      market: 'CN',
      currentPrice: 210,
      currentFCF: 580,
      cashAndEquivalents: 260,
      totalDebt: 180,
      sharesOutstanding: 44,
      currency: 'CNY',
    },
    '601318.SS': {
      symbol: '601318.SS',
      name: '中国平安',
      market: 'CN',
      currentPrice: 45,
      currentFCF: 1200,
      cashAndEquivalents: 5800,
      totalDebt: 9800,
      sharesOutstanding: 182,
      currency: 'CNY',
    },
    '600036.SS': {
      symbol: '600036.SS',
      name: '招商银行',
      market: 'CN',
      currentPrice: 35,
      currentFCF: 1400,
      cashAndEquivalents: 1200,
      totalDebt: 10800,
      sharesOutstanding: 252,
      currency: 'CNY',
    },
    '002594.SZ': {
      symbol: '002594.SZ',
      name: '比亚迪',
      market: 'CN',
      currentPrice: 280,
      currentFCF: 1200,
      cashAndEquivalents: 720,
      totalDebt: 1800,
      sharesOutstanding: 29,
      currency: 'CNY',
    },
  };
  
  return aStocks[symbol] || null;
}

// 预设美股/港股数据（作为回退）
function getPresetStockData(symbol: string) {
  const stocks: Record<string, any> = {
    'AAPL': {
      symbol: 'AAPL',
      name: '苹果公司 (Apple)',
      market: 'US',
      currentPrice: 195 * 7.2,
      currentFCF: 7760,
      cashAndEquivalents: 540,
      totalDebt: 820,
      sharesOutstanding: 152,
      currency: 'CNY',
    },
    'MSFT': {
      symbol: 'MSFT',
      name: '微软 (Microsoft)',
      market: 'US',
      currentPrice: 420 * 7.2,
      currentFCF: 5040,
      cashAndEquivalents: 580,
      totalDebt: 420,
      sharesOutstanding: 74,
      currency: 'CNY',
    },
    '0700.HK': {
      symbol: '0700.HK',
      name: '腾讯控股',
      market: 'HK',
      currentPrice: 385 * 0.92,
      currentFCF: 1380,
      cashAndEquivalents: 2880,
      totalDebt: 2160,
      sharesOutstanding: 93,
      currency: 'CNY',
    },
    '9988.HK': {
      symbol: '9988.HK',
      name: '阿里巴巴',
      market: 'HK',
      currentPrice: 82 * 0.92,
      currentFCF: 1380,
      cashAndEquivalents: 3240,
      totalDebt: 2160,
      sharesOutstanding: 190,
      currency: 'CNY',
    },
    'TSLA': {
      symbol: 'TSLA',
      name: '特斯拉 (Tesla)',
      market: 'US',
      currentPrice: 175 * 7.2,
      currentFCF: 720,
      cashAndEquivalents: 215,
      totalDebt: 72,
      sharesOutstanding: 32,
      currency: 'CNY',
    },
    'NVDA': {
      symbol: 'NVDA',
      name: '英伟达 (NVIDIA)',
      market: 'US',
      currentPrice: 120 * 7.2,
      currentFCF: 3780,
      cashAndEquivalents: 180,
      totalDebt: 72,
      sharesOutstanding: 246,
      currency: 'CNY',
    },
    'GOOGL': {
      symbol: 'GOOGL',
      name: '谷歌 (Alphabet)',
      market: 'US',
      currentPrice: 165 * 7.2,
      currentFCF: 4750,
      cashAndEquivalents: 780,
      totalDebt: 250,
      sharesOutstanding: 125,
      currency: 'CNY',
    },
    'AMZN': {
      symbol: 'AMZN',
      name: '亚马逊 (Amazon)',
      market: 'US',
      currentPrice: 185 * 7.2,
      currentFCF: 2880,
      cashAndEquivalents: 580,
      totalDebt: 1080,
      sharesOutstanding: 104,
      currency: 'CNY',
    },
    'META': {
      symbol: 'META',
      name: 'Meta Platforms',
      market: 'US',
      currentPrice: 500 * 7.2,
      currentFCF: 2880,
      cashAndEquivalents: 432,
      totalDebt: 144,
      sharesOutstanding: 26,
      currency: 'CNY',
    },
    '3690.HK': {
      symbol: '3690.HK',
      name: '美团',
      market: 'HK',
      currentPrice: 135 * 0.92,
      currentFCF: 280,
      cashAndEquivalents: 920,
      totalDebt: 460,
      sharesOutstanding: 62,
      currency: 'CNY',
    },
    '1810.HK': {
      symbol: '1810.HK',
      name: '小米集团',
      market: 'HK',
      currentPrice: 18 * 0.92,
      currentFCF: 460,
      cashAndEquivalents: 1100,
      totalDebt: 370,
      sharesOutstanding: 250,
      currency: 'CNY',
    },
    '2318.HK': {
      symbol: '2318.HK',
      name: '中国平安',
      market: 'HK',
      currentPrice: 38 * 0.92,
      currentFCF: 920,
      cashAndEquivalents: 4600,
      totalDebt: 8280,
      sharesOutstanding: 182,
      currency: 'CNY',
    },
  };
  
  return stocks[symbol] || null;
}
