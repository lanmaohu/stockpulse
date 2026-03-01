import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// 转换股票代码为 Stock Analysis 格式
function convertToSAFormat(symbol: string): string {
  return symbol.replace(/\.HK$|\.SS$|\.SZ$/g, '');
}

// 解析财务数值（百万美元）
function parseValue(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const isNegative = clean.startsWith('(') || clean.startsWith('-');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': num *= 1000; break;
    case 'M': break;
    case 'K': num *= 0.001; break;
  }
  
  return isNegative ? -num : num;
}

// 解析股本（百万股）
function parseShares(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': return num * 1000;
    case 'M': return num;
    case 'K': return num * 0.001;
    default: return num;
  }
}

// 从 HTML 中提取表格数据
function extractTableData(html: string): Record<string, string> {
  const data: Record<string, string> = {};
  
  // 匹配表格行
  const rowRegex = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let match;
  
  while ((match = rowRegex.exec(html)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    data[label] = value;
  }
  
  return data;
}

// 从 Stock Analysis 抓取财务数据
async function fetchFromStockAnalysis(symbol: string) {
  const saSymbol = convertToSAFormat(symbol).toLowerCase();
  
  console.log(`[API] Fetching data for ${symbol}`);
  
  try {
    // 获取利润表数据
    const incomeUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/`;
    const incomeRes = await fetch(incomeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!incomeRes.ok) {
      throw new Error(`HTTP ${incomeRes.status}`);
    }
    
    const incomeHtml = await incomeRes.text();
    
    // 获取资产负债表数据
    const balanceUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/balance-sheet/`;
    const balanceRes = await fetch(balanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const balanceHtml = balanceRes.ok ? await balanceRes.text() : '';
    
    // 提取数据
    const incomeData = extractTableData(incomeHtml);
    const balanceData = extractTableData(balanceHtml);
    
    // 提取公司名称
    const nameMatch = incomeHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const companyName = nameMatch ? nameMatch[1].replace('Financials', '').trim() : symbol;
    
    // 提取股价
    const priceMatch = incomeHtml.match(/"price":\s*([\d.]+)/) || 
                       incomeHtml.match(/data-price="([\d.]+)"/);
    const currentPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
    
    // 提取 FCF
    const fcf = incomeData['Free Cash Flow'] || '';
    
    // 提取现金（从资产负债表）
    const cash = balanceData['Cash & Equivalents'] || balanceData['Cash and Equivalents'] || '';
    
    // 提取负债
    const debt = balanceData['Total Debt'] || '';
    
    // 提取股本
    const sharesMatch = incomeHtml.match(/Shares Outstanding[\s\S]*?(\d+\.?\d*\s*[BMK])/i) ||
                        balanceHtml.match(/Shares Outstanding[\s\S]*?(\d+\.?\d*\s*[BMK])/i);
    const shares = sharesMatch ? sharesMatch[1] : '';
    
    return {
      symbol,
      name: companyName,
      market: getMarketType(symbol),
      currentPrice,
      currentFCF: parseValue(fcf),
      cashAndEquivalents: parseValue(cash),
      totalDebt: parseValue(debt),
      sharesOutstanding: parseShares(shares),
      currency: 'USD',
      unit: 'millions',
      source: 'stockanalysis',
    };
    
  } catch (error: any) {
    console.error(`[API] Fetch failed: ${error.message}`);
    throw error;
  }
}

// 预设数据
function getPresetStockData(symbol: string) {
  const stocks: Record<string, any> = {
    'AAPL': {
      symbol: 'AAPL',
      name: '苹果公司 (Apple)',
      market: 'US',
      currentPrice: 264,
      currentFCF: 123324,
      cashAndEquivalents: 45317,
      totalDebt: 90509,
      sharesOutstanding: 14680,
      currency: 'USD',
      unit: 'millions',
      source: 'preset',
    },
    'MSFT': {
      symbol: 'MSFT',
      name: '微软 (Microsoft)',
      market: 'US',
      currentPrice: 420,
      currentFCF: 67400,
      cashAndEquivalents: 78000,
      totalDebt: 42000,
      sharesOutstanding: 7420,
      currency: 'USD',
      unit: 'millions',
      source: 'preset',
    },
    '0700.HK': {
      symbol: '0700.HK',
      name: '腾讯控股',
      market: 'HK',
      currentPrice: 385,
      currentFCF: 150000,
      cashAndEquivalents: 288000,
      totalDebt: 216000,
      sharesOutstanding: 9300,
      currency: 'HKD',
      unit: 'millions',
      source: 'preset',
    },
    'TSLA': {
      symbol: 'TSLA',
      name: '特斯拉 (Tesla)',
      market: 'US',
      currentPrice: 175,
      currentFCF: 4400,
      cashAndEquivalents: 29100,
      totalDebt: 7200,
      sharesOutstanding: 3200,
      currency: 'USD',
      unit: 'millions',
      source: 'preset',
    },
    'NVDA': {
      symbol: 'NVDA',
      name: '英伟达 (NVIDIA)',
      market: 'US',
      currentPrice: 120,
      currentFCF: 37800,
      cashAndEquivalents: 25900,
      totalDebt: 8500,
      sharesOutstanding: 24600,
      currency: 'USD',
      unit: 'millions',
      source: 'preset',
    },
    'GOOGL': {
      symbol: 'GOOGL',
      name: '谷歌 (Alphabet)',
      market: 'US',
      currentPrice: 165,
      currentFCF: 72700,
      cashAndEquivalents: 101000,
      totalDebt: 13200,
      sharesOutstanding: 12500,
      currency: 'USD',
      unit: 'millions',
      source: 'preset',
    },
  };
  
  return stocks[symbol] || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    // 尝试获取实时数据
    try {
      console.log(`[API] Fetching real-time data for ${trimmedSymbol}`);
      const result = await fetchFromStockAnalysis(trimmedSymbol);
      
      if (result.currentFCF > 0) {
        console.log(`[API] Success: FCF=${result.currentFCF}`);
        return res.status(200).json(createAPISuccess(result));
      }
    } catch (error: any) {
      console.log(`[API] Real-time fetch failed: ${error.message}`);
    }
    
    // 回退到预设数据
    console.log(`[API] Using preset data for ${trimmedSymbol}`);
    const preset = getPresetStockData(trimmedSymbol);
    
    if (preset) {
      return res.status(200).json(createAPISuccess(preset));
    }
    
    return res.status(404).json(
      createAPIError(ErrorType.NO_DATA_AVAILABLE, `未找到股票 ${trimmedSymbol} 的数据`)
    );

  } catch (error: any) {
    console.error(`[API] Error:`, error);
    return res.status(500).json(
      createAPIError(ErrorType.UNKNOWN_ERROR, error.message || '获取数据失败')
    );
  }
}
