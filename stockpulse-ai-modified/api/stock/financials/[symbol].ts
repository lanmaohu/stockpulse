import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

// 缓存（避免重复请求）
const dataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

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

// 将 A 股代码转换为 East Money 格式
function convertToEastMoneyCode(symbol: string): string {
  // 上海股市 .SS 转为 1.xxxxx 格式
  // 深圳股市 .SZ 转为 0.xxxxx 格式
  const code = symbol.replace(/\.SS$|\.SZ$/g, '');
  if (symbol.endsWith('.SS')) {
    return `1.${code}`;
  } else if (symbol.endsWith('.SZ')) {
    return `0.${code}`;
  }
  return code;
}

// 使用 East Money API 获取 A 股数据
async function fetchFromEastMoney(symbol: string) {
  const marketType = getMarketType(symbol);
  
  if (marketType !== 'CN') {
    throw new Error('East Money only used for CN stocks');
  }
  
  // 检查缓存
  if (dataCache[symbol] && (Date.now() - dataCache[symbol].timestamp) < CACHE_TTL) {
    console.log(`[EastMoney] Using cached data for ${symbol}`);
    return dataCache[symbol].data;
  }
  
  const emCode = convertToEastMoneyCode(symbol);
  const secid = symbol.endsWith('.SS') ? `1.${symbol.replace('.SS', '')}` : `0.${symbol.replace('.SZ', '')}`;
  console.log(`[EastMoney] Fetching ${symbol} (code: ${emCode}, secid: ${secid})`);
  
  try {
    // 获取基本报价信息
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f55,f57,f58,f60,f62,f84,f85,f162`;
    
    const quoteRes = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://quote.eastmoney.com/',
      },
    });
    
    if (!quoteRes.ok) {
      throw new Error(`Quote API failed: ${quoteRes.status}`);
    }
    
    const quoteData = await quoteRes.json();
    
    if (!quoteData.data) {
      throw new Error('No quote data returned');
    }
    
    const data = quoteData.data;
    const companyName = data.f58 || symbol;
    const currentPrice = data.f43 ? data.f43 / 100 : 0; // 价格需要除以100
    const totalShares = data.f84 || 0; // 总股本(股)
    const sharesOutstanding = totalShares / 1000000; // 转为百万股
    
    // 获取财务数据（资产负债表）
    let cashAndEquivalents = 0;
    let totalDebt = 0;
    
    try {
      const balanceUrl = `https://f10.eastmoney.com/FinanceAnalysis/FinanceAnalysisAjax?code=${emCode.replace('.', '')}`;
      const balanceRes = await fetch(balanceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://f10.eastmoney.com/',
        },
      });
      
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        if (balanceData?.zcfz?.length > 0) {
          const latest = balanceData.zcfz[0];
          // 货币资金 (单位：万元，转为百万)
          cashAndEquivalents = (latest.MONETARYFUND || 0) / 100;
          // 总负债 (单位：万元，转为百万)
          totalDebt = (latest.TOTALLIABILITIES || 0) / 100;
        }
      }
    } catch (e) {
      console.log('[EastMoney] Balance sheet fetch failed:', (e as Error).message);
    }
    
    // 获取现金流量表数据
    let currentFCF = 0;
    let historicalFCF: number[] = [];
    try {
      const cashflowUrl = `https://f10.eastmoney.com/CashFlow/CashFlowAjax?code=${emCode.replace('.', '')}`;
      const cashflowRes = await fetch(cashflowUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://f10.eastmoney.com/',
        },
      });

      if (cashflowRes.ok) {
        const cashflowData = await cashflowRes.json();
        if (cashflowData?.xjll?.length > 0) {
          const latest = cashflowData.xjll[0];
          // 经营活动现金流净额 (单位：万元，转为百万)
          const operatingCF = (latest.NETCASHOPERATE || 0) / 100;
          // 购建固定资产等支付的现金 (单位：万元，转为百万)
          const capex = Math.abs(latest.CAPEX || 0) / 100;
          currentFCF = operatingCF - capex;
          // 提取近5年历史 FCF
          historicalFCF = cashflowData.xjll.slice(0, 5).map((item: any) => {
            const opCF = (item.NETCASHOPERATE || 0) / 100;
            const cx = Math.abs(item.CAPEX || 0) / 100;
            return opCF - cx;
          });
        }
      }
    } catch (e) {
      console.log('[EastMoney] Cash flow fetch failed:', (e as Error).message);
    }
    
    // 获取利润表计算收入增长率
    let revenueGrowthRates: number[] = [];
    try {
      const incomeUrl = `https://f10.eastmoney.com/ProfitAndLoss/ProfitAndLossAjax?code=${emCode.replace('.', '')}`;
      const incomeRes = await fetch(incomeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://f10.eastmoney.com/',
        },
      });
      
      if (incomeRes.ok) {
        const incomeData = await incomeRes.json();
        if (incomeData?.lrfp?.length > 1) {
          const revenues = incomeData.lrfp
            .map((item: any) => item.TOTALOPERATEREVE || 0)
            .filter((r: number) => r > 0);
          
          // 计算增长率
          for (let i = 0; i < Math.min(4, revenues.length - 1); i++) {
            if (revenues[i + 1] > 0) {
              const growth = ((revenues[i] - revenues[i + 1]) / revenues[i + 1]) * 100;
              revenueGrowthRates.push(Math.round(growth * 10) / 10);
            }
          }
        }
      }
    } catch (e) {
      console.log('[EastMoney] Income fetch failed:', (e as Error).message);
    }
    
    // 如果没有获取到增长率，使用默认值
    if (revenueGrowthRates.length === 0) {
      revenueGrowthRates = [15, 12, 18, 10, 8];
    }
    
    const result = {
      symbol,
      name: companyName,
      market: 'CN' as const,
      currentPrice,
      currentFCF,
      historicalFCF,
      revenueGrowthRates,
      cashAndEquivalents,
      totalDebt,
      sharesOutstanding,
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'eastmoney',
    };
    
    // 缓存结果
    dataCache[symbol] = { data: result, timestamp: Date.now() };
    
    console.log(`[EastMoney] Success for ${symbol}:`, {
      name: companyName,
      price: currentPrice,
      fcf: currentFCF,
      cash: cashAndEquivalents,
      debt: totalDebt,
      shares: sharesOutstanding,
    });
    
    return result;
    
  } catch (error: any) {
    console.error(`[EastMoney] Error for ${symbol}:`, error.message);
    throw error;
  }
}

// 使用 Yahoo Finance 获取 A 股数据（备用方案）
async function fetchFromYahooFinance(symbol: string) {
  const marketType = getMarketType(symbol);
  
  if (marketType !== 'CN') {
    throw new Error('Yahoo Finance only used for CN stocks');
  }
  
  const yahooSymbol = symbol;
  console.log(`[Yahoo] Fetching ${symbol} (Yahoo: ${yahooSymbol})`);
  
  try {
    const quote = await yahooFinance.quote(yahooSymbol);
    
    if (!quote) {
      throw new Error('QUOTE_NOT_FOUND');
    }
    
    const currentPrice = quote.regularMarketPrice || 0;
    const companyName = quote.shortName || quote.longName || symbol;
    const sharesOutstanding = (quote.sharesOutstanding || 0) / 1000000;
    
    const result = {
      symbol,
      name: companyName,
      market: 'CN' as const,
      currentPrice,
      currentFCF: 0,
      revenueGrowthRates: [15, 12, 18, 10, 8],
      cashAndEquivalents: 0,
      totalDebt: 0,
      sharesOutstanding,
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'yahoo',
    };
    
    console.log(`[Yahoo] Basic data for ${symbol}: price=${currentPrice}`);
    return result;
    
  } catch (error: any) {
    console.error(`[Yahoo] Error for ${symbol}:`, error.message);
    throw error;
  }
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

// 从 HTML 提取 FCF 行的多列数值（最多5年，最新优先）
function extractHistoricalRowValues(html: string, labelPatterns: string[]): number[] {
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    for (const pattern of labelPatterns) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        if (text.includes('Per Share') || text.includes('Margin') || text.includes('Ratio')) continue;
        if (pattern === 'Free Cash Flow' && text.includes('Growth')) continue;
        // 匹配带逗号的数字（含括号负数，如 (1,234)）
        const matches = text.match(/\(?\d{1,3}(?:,\d{3})+\)?/g) || [];
        return matches.slice(0, 5).map(m => parseValue(m));
      }
    }
  }
  return [];
}

// 从 Stock Analysis 抓取财务数据
async function fetchFromStockAnalysis(symbol: string) {
  const saSymbol = convertToSAFormat(symbol).toLowerCase();
  const marketType = getMarketType(symbol);
  
  console.log(`[API] Fetching data for ${symbol}, market: ${marketType}`);
  
  // 根据市场类型构建 URL
  const isHK = marketType === 'HK';
  const baseUrl = isHK 
    ? `https://stockanalysis.com/quote/hkg/${saSymbol}` 
    : `https://stockanalysis.com/stocks/${saSymbol}`;
  
  try {
    // 1. 获取首页股价
    const overviewUrl = isHK 
      ? `https://stockanalysis.com/quote/hkg/${saSymbol}/` 
      : `https://stockanalysis.com/stocks/${saSymbol}/`;
    const overviewRes = await fetch(overviewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let currentPrice = 0;
    let companyName = symbol;
    
    if (overviewRes.ok) {
      const overviewHtml = await overviewRes.text();
      
      // 提取股价 - 使用大号字体类名定位
      // 港股和美股都使用 text-4xl 或 text-3xl 显示价格
      const priceMatch = overviewHtml.match(/text-[34]xl[^>]*>([\d.]+)/);
      if (priceMatch) {
        currentPrice = parseFloat(priceMatch[1]);
      } else {
        // 备用方案：查找 H1 标签后的第一个价格格式数字
        const h1Match = overviewHtml.match(/<h1[^>]*>[\s\S]*?<\/h1>[\s\S]{0,1000}/i);
        if (h1Match) {
          const priceInH1 = h1Match[0].match(/>(\d{3,4}\.\d{2})</);
          if (priceInH1) {
            currentPrice = parseFloat(priceInH1[1]);
          }
        }
      }
      
      // 提取公司名称
      const nameMatch = overviewHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (nameMatch) {
        companyName = nameMatch[1].replace('Financials', '').trim();
      }
    }
    
    // 2. 获取 Cash Flow 页面的 Free Cash Flow
    const cashFlowUrl = `${baseUrl}/financials/cash-flow-statement/`;
    const cashFlowRes = await fetch(cashFlowUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let fcfValue = '';
    let historicalFCF: number[] = [];

    if (cashFlowRes.ok) {
      const cashFlowHtml = await cashFlowRes.text();
      fcfValue = extractRowValue(cashFlowHtml, ['Free Cash Flow']);
      historicalFCF = extractHistoricalRowValues(cashFlowHtml, ['Free Cash Flow']);
    }
    
    // 3. 获取 Income Statement 页面的 Revenue Growth
    const incomeStatementUrl = `${baseUrl}/financials/income-statement/`;
    const incomeStatementRes = await fetch(incomeStatementUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let revenueGrowthRates: number[] = [];
    
    if (incomeStatementRes.ok) {
      const incomeStatementHtml = await incomeStatementRes.text();
      revenueGrowthRates = extractGrowthRates(incomeStatementHtml, 'Revenue Growth');
    }
    
    // 4. 获取 Balance Sheet 页面的数据
    const balanceUrl = `${baseUrl}/financials/balance-sheet/`;
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
      revenueGrowthRates,
      cash: cashValue, 
      debt: debtValue, 
      shares: sharesValue 
    });
    
    // 根据市场类型设置默认 WACC
    const marketType = getMarketType(symbol);
    const defaultWACC = marketType === 'US' ? 10 : marketType === 'HK' ? 12 : 8;
    
    const result = {
      symbol,
      name: companyName,
      market: marketType,
      currentPrice,
      currentFCF: parseValue(fcfValue),
      historicalFCF,
      revenueGrowthRates, // 使用 Revenue Growth 替代 FCF Growth
      cashAndEquivalents: parseValue(cashValue),
      totalDebt: parseValue(debtValue),
      sharesOutstanding: parseShares(sharesValue),
      wacc: defaultWACC, // 默认 WACC (%)
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
      revenueGrowthRates: [7.8, -2.8, 8.1, 33.3, 5.5], // 最近5年 Revenue Growth 收入增长率
      cashAndEquivalents: 66907, // Cash & Short-Term Investments, 百万美元
      totalDebt: 90509,          // 百万美元
      sharesOutstanding: 14703,  // Total Common Shares Outstanding, 百万股
      wacc: 10,                  // 默认 WACC 10%
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
    // A股预设数据 (当Yahoo Finance失败时使用)
    '600519.SS': {
      symbol: '600519.SS',
      name: '贵州茅台',
      market: 'CN',
      currentPrice: 1520,
      currentFCF: 64000,          // 约640亿人民币
      revenueGrowthRates: [15.7, 16.5, 11.7, 13.3, 10.2],
      cashAndEquivalents: 156000, // 约1560亿人民币
      totalDebt: 0,
      sharesOutstanding: 1256,    // 约12.56亿股
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '000001.SZ': {
      symbol: '000001.SZ',
      name: '平安银行',
      market: 'CN',
      currentPrice: 10.5,
      currentFCF: 30000,          // 约300亿人民币
      revenueGrowthRates: [8.5, 6.2, 10.3, 12.1, 9.8],
      cashAndEquivalents: 125000, // 约1250亿人民币
      totalDebt: 3200000,         // 约32000亿人民币(银行业务特性)
      sharesOutstanding: 19406,   // 约194亿股
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '000858.SZ': {
      symbol: '000858.SZ',
      name: '五粮液',
      market: 'CN',
      currentPrice: 145,
      currentFCF: 78000,          // 约780亿人民币
      revenueGrowthRates: [12.6, 11.7, 15.5, 14.4, 10.8],
      cashAndEquivalents: 82000,  // 约820亿人民币
      totalDebt: 0,
      sharesOutstanding: 3882,    // 约38.82亿股
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '600036.SS': {
      symbol: '600036.SS',
      name: '招商银行',
      market: 'CN',
      currentPrice: 35.2,
      currentFCF: 45000,
      revenueGrowthRates: [7.8, 9.2, 14.0, 11.5, 8.3],
      cashAndEquivalents: 82000,
      totalDebt: 1200000,
      sharesOutstanding: 25220,
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '600900.SS': {
      symbol: '600900.SS',
      name: '长江电力',
      market: 'CN',
      currentPrice: 28.5,
      currentFCF: 52000,
      revenueGrowthRates: [10.2, 8.5, 12.1, 9.8, 7.5],
      cashAndEquivalents: 240000,
      totalDebt: 78000,
      sharesOutstanding: 24468,
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '601318.SS': {
      symbol: '601318.SS',
      name: '中国平安',
      market: 'CN',
      currentPrice: 48.5,
      currentFCF: 5800,
      revenueGrowthRates: [5.2, 3.8, 8.1, 6.5, 4.2],
      cashAndEquivalents: 22000,
      totalDebt: 2800,
      sharesOutstanding: 18280,
      wacc: 8,
      currency: 'CNY',
      unit: 'millions',
      source: 'preset',
    },
    '601888.SS': {
      symbol: '601888.SS',
      name: '中国中免',
      market: 'CN',
      currentPrice: 68.0,
      currentFCF: 12500,
      revenueGrowthRates: [15.2, -15.3, 28.5, 32.1, 18.6],
      cashAndEquivalents: 78000,
      totalDebt: 72000,
      sharesOutstanding: 2069,
      wacc: 8,
      currency: 'CNY',
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
  const marketType = getMarketType(trimmedSymbol);

  try {
    // A股使用 East Money API
    if (marketType === 'CN') {
      try {
        console.log(`[API] A股 detected, using East Money for ${trimmedSymbol}`);
        const result = await fetchFromEastMoney(trimmedSymbol);
        return res.status(200).json(createAPISuccess(result));
      } catch (error: any) {
        console.log(`[API] East Money failed: ${error.message}`);
        // East Money 失败时尝试 Yahoo Finance
        try {
          console.log(`[API] Trying Yahoo Finance as fallback for ${trimmedSymbol}`);
          const result = await fetchFromYahooFinance(trimmedSymbol);
          return res.status(200).json(createAPISuccess(result));
        } catch (yahooError: any) {
          console.log(`[API] Yahoo Finance also failed: ${yahooError.message}`);
        }
      }
    }
    
    // US/HK 股票使用 Stock Analysis
    try {
      console.log(`[API] Fetching from Stock Analysis for ${trimmedSymbol}`);
      const result = await fetchFromStockAnalysis(trimmedSymbol);
      
      console.log(`[API] Success for ${trimmedSymbol}:`, {
        fcf: result.currentFCF,
        cash: result.cashAndEquivalents,
        debt: result.totalDebt,
        shares: result.sharesOutstanding
      });
      
      return res.status(200).json(createAPISuccess(result));
    } catch (error: any) {
      console.log(`[API] Stock Analysis fetch failed: ${error.message}`);
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
