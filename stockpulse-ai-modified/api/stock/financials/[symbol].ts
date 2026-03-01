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

// 解析财务数值（单位：百万美元）
function parseValue(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const isNegative = clean.startsWith('(') || clean.startsWith('-');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  // Stock Analysis 数据默认是百万单位
  switch (suffix) {
    case 'B': num *= 1000; break;  // Billion -> Million
    case 'M': break;               // Million (默认)
    case 'K': num *= 0.001; break; // Thousand -> Million
  }
  
  return isNegative ? -num : num;
}

// 解析股本（单位：百万股）
function parseShares(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': return num * 1000;  // Billion shares -> Million
    case 'M': return num;          // Million shares (默认)
    case 'K': return num * 0.001;  // Thousand shares -> Million
    default: return num;
  }
}

// 从 HTML 提取表格数据
function extractRowValue(html: string, labelPatterns: string[]): string {
  // 移除 script 和 style 标签
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // 提取所有行
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 检查是否匹配标签
    for (const pattern of labelPatterns) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        // 排除包含特定关键词的行
        if (text.includes('Per Share') || text.includes('Margin') || text.includes('Ratio')) {
          continue;
        }
        // 对于 Free Cash Flow，排除 Growth 行
        if (pattern === 'Free Cash Flow' && text.includes('Growth')) {
          continue;
        }
        
        // 提取第一个数字（最新年度）
        const match = text.match(/(\d{1,3},\d{3})/);
        if (match) return match[1];
      }
    }
  }
  
  return '';
}

// 从 HTML 提取增长率数据（返回最近5年）
function extractGrowthRates(html: string, label: string): number[] {
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (text.includes(label)) {
      // 提取所有百分比数值
      const matches = text.match(/-?\d+\.?\d*/g);
      if (matches && matches.length > 0) {
        // 转换为数字并返回前5个（最近5年）
        const rates = matches.slice(0, 5).map(m => parseFloat(m));
        return rates.filter(r => !isNaN(r));
      }
    }
  }
  
  return [];
}

// 从 Stock Analysis 抓取财务数据
async function fetchFromStockAnalysis(symbol: string) {
  const saSymbol = convertToSAFormat(symbol).toLowerCase();
  
  console.log(`[API] Fetching data for ${symbol}`);
  
  try {
    // 1. 获取首页股价
    const overviewUrl = `https://stockanalysis.com/stocks/${saSymbol}/`;
    const overviewRes = await fetch(overviewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let currentPrice = 0;
    let companyName = symbol;
    
    if (overviewRes.ok) {
      const overviewHtml = await overviewRes.text();
      
      // 提取股价 - 在 NASDAQ 后面查找
      const priceMatch = overviewHtml.match(/NASDAQ[^\d]{0,200}(\d{3,4}\.\d{2})/) ||
                         overviewHtml.match(/>(\d{3,4}\.\d{2})<\/div>/);
      if (priceMatch) {
        currentPrice = parseFloat(priceMatch[1]);
      }
      
      // 提取公司名称
      const nameMatch = overviewHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (nameMatch) {
        companyName = nameMatch[1].replace('Financials', '').trim();
      }
    }
    
    // 2. 获取 Cash Flow 页面的 Free Cash Flow 和 Growth
    const cashFlowUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/cash-flow-statement/`;
    const cashFlowRes = await fetch(cashFlowUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let fcfValue = '';
    let fcfGrowthRates: number[] = [];
    
    if (cashFlowRes.ok) {
      const cashFlowHtml = await cashFlowRes.text();
      fcfValue = extractRowValue(cashFlowHtml, ['Free Cash Flow']);
      fcfGrowthRates = extractGrowthRates(cashFlowHtml, 'Free Cash Flow Growth');
    }
    
    // 3. 获取 Balance Sheet 页面的数据
    const balanceUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/balance-sheet/`;
    const balanceRes = await fetch(balanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let cashValue = '';
    let debtValue = '';
    let sharesValue = '';
    
    if (balanceRes.ok) {
      const balanceHtml = await balanceRes.text();
      
      // Cash & Short-Term Investments
      cashValue = extractRowValue(balanceHtml, [
        'Cash & Short-Term Investments',
        'Cash &amp; Short-Term Investments'
      ]);
      
      // Total Debt
      debtValue = extractRowValue(balanceHtml, ['Total Debt']);
      
      // Total Common Shares Outstanding
      sharesValue = extractRowValue(balanceHtml, ['Total Common Shares Outstanding']);
    }
    
    console.log(`[API] Extracted for ${symbol}:`, { 
      fcf: fcfValue, 
      fcfGrowthRates,
      cash: cashValue, 
      debt: debtValue, 
      shares: sharesValue 
    });
    
    const result = {
      symbol,
      name: companyName,
      market: getMarketType(symbol),
      currentPrice,
      currentFCF: parseValue(fcfValue),
      fcfGrowthRates,
      cashAndEquivalents: parseValue(cashValue),
      totalDebt: parseValue(debtValue),
      sharesOutstanding: parseShares(sharesValue),
      currency: 'USD',
      unit: 'millions',
      source: 'stockanalysis',
    };
    
    // 检查是否获取到有效数据
    if (result.currentFCF === 0 && result.cashAndEquivalents === 0 && result.totalDebt === 0) {
      throw new Error('NO_DATA_FOUND');
    }
    
    return result;
    
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
      currentFCF: 123324,        // 百万美元
      fcfGrowthRates: [25.46, -9.23, 9.26, -10.64, 19.89], // 最近5年 FCF 增长率
      cashAndEquivalents: 66907, // Cash & Short-Term Investments, 百万美元
      totalDebt: 90509,          // 百万美元
      sharesOutstanding: 14703,  // Total Common Shares Outstanding, 百万股
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
      
      console.log(`[API] Success for ${trimmedSymbol}:`, {
        fcf: result.currentFCF,
        cash: result.cashAndEquivalents,
        debt: result.totalDebt,
        shares: result.sharesOutstanding
      });
      
      return res.status(200).json(createAPISuccess(result));
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
