import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

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
  // 移除后缀
  return symbol.replace(/\.HK$|\.SS$|\.SZ$/g, '');
}

// 从 Stock Analysis 抓取财务数据
async function fetchFromStockAnalysis(symbol: string) {
  const saSymbol = convertToSAFormat(symbol).toLowerCase();
  const url = `https://stockanalysis.com/stocks/${saSymbol}/financials/`;
  
  console.log(`[API] Fetching from Stock Analysis: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('STOCK_NOT_FOUND');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 提取公司名称
    const companyName = $('h1').first().text().trim() || symbol;
    
    // 提取数据函数 - 尝试多种选择器
    const extractValue = (labelText: string): number => {
      // 方法1: 查找包含特定文本的单元格
      let value = 0;
      
      $('table tr, [data-testid="financial-table"] tr, .financial-table tr').each((_, row) => {
        const label = $(row).find('td:first-child, th:first-child').text().trim();
        if (label.toLowerCase().includes(labelText.toLowerCase())) {
          // 获取第二列（最新一年的数据）
          const valueCell = $(row).find('td:nth-child(2), td:eq(1)').text().trim();
          if (valueCell) {
            const parsed = parseFinancialValue(valueCell);
            if (parsed > 0) value = parsed;
          }
        }
      });
      
      return value;
    };
    
    // 提取自由现金流 (Free Cash Flow)
    let freeCashFlow = extractValue('Free Cash Flow') || extractValue('FCF');
    
    // 提取现金 (Cash & Cash Equivalents)
    let cash = extractValue('Cash & Cash Equivalents') || extractValue('Cash and Equivalents');
    
    // 提取总负债 (Total Debt)
    let debt = extractValue('Total Debt');
    
    // 提取总股本 (Shares Outstanding)
    let sharesOutstanding = 0;
    $('table tr, [data-testid="financial-table"] tr').each((_, row) => {
      const label = $(row).find('td:first-child, th:first-child').text().trim();
      if (label.toLowerCase().includes('shares outstanding') || label.toLowerCase().includes('shares out')) {
        const valueCell = $(row).find('td:nth-child(2), td:eq(1)').text().trim();
        if (valueCell) {
          sharesOutstanding = parseShareCount(valueCell);
        }
      }
    });
    
    // 如果表格中没有找到，尝试从页面其他位置获取
    if (sharesOutstanding === 0) {
      const sharesText = $('body').text().match(/Shares Outstanding[:\s]+([\d,.]+[BMK]?)/i);
      if (sharesText) {
        sharesOutstanding = parseShareCount(sharesText[1]);
      }
    }
    
    // 获取当前股价 (从页面中提取)
    let currentPrice = 0;
    const priceMatch = html.match(/"price":\s*([\d.]+)/) || 
                       html.match(/data-price="([\d.]+)"/) ||
                       $('span[data-testid="price"]').text().match(/([\d.]+)/);
    if (priceMatch) {
      currentPrice = parseFloat(priceMatch[1]);
    }
    
    // 检查是否获取到有效数据
    if (freeCashFlow === 0 && cash === 0 && debt === 0) {
      console.log('[API] No financial data found in page, trying alternative method...');
      
      // 尝试从脚本标签中提取 JSON 数据
      const scriptTags = $('script').map((_, el) => $(el).html()).get();
      for (const script of scriptTags) {
        if (script && script.includes('financials')) {
          try {
            const jsonMatch = script.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/) ||
                             script.match(/"financials":\s*({.+?})/);
            if (jsonMatch) {
              console.log('[API] Found JSON data in script tag');
              // 解析 JSON 数据...
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    return {
      symbol,
      name: companyName.replace('Financials', '').trim(),
      market: getMarketType(symbol),
      currentPrice,
      currentFCF: freeCashFlow,
      cashAndEquivalents: cash,
      totalDebt: debt,
      sharesOutstanding,
      currency: 'USD', // 单位：百万美元
      unit: 'millions',
      source: 'stockanalysis',
    };
    
  } catch (error: any) {
    console.error(`[API] Stock Analysis fetch failed: ${error.message}`);
    throw error;
  }
}

// 解析财务数值（处理 B/M/K 后缀）
// Stock Analysis 数据单位：Financials in millions USD
// 返回值单位：百万美元（保持原始单位，不做货币转换）
function parseFinancialValue(value: string): number {
  if (!value) return 0;
  
  // 移除逗号和空格
  const cleanValue = value.replace(/,/g, '').replace(/\s/g, '');
  
  // 检查负数
  const isNegative = cleanValue.startsWith('(') || cleanValue.startsWith('-');
  
  // 提取数字部分
  const match = cleanValue.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  // Stock Analysis 数据已经是 millions USD 单位
  // 所以原始数值（如 123,324）表示 123,324 百万美元
  let millionsUSD = num;
  
  // 处理单位后缀（如果是 B/M/K 形式）
  switch (suffix) {
    case 'B': // Billion = 1000 Million
      millionsUSD = num * 1000;
      break;
    case 'M': // Million = 1 Million
      millionsUSD = num;
      break;
    case 'K': // Thousand = 0.001 Million
      millionsUSD = num * 0.001;
      break;
  }
  
  // 返回百万美元，不做货币转换
  // 如：123,324 百万美元 -> 123324
  return isNegative ? -millionsUSD : millionsUSD;
}

// 解析股本数量（不进行汇率转换）
// 返回值单位：百万股
function parseShareCount(value: string): number {
  if (!value) return 0;
  
  const cleanValue = value.replace(/,/g, '').replace(/\s/g, '');
  
  const match = cleanValue.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  // 转换为百万股
  switch (suffix) {
    case 'B': // Billion shares = 1000 Million shares
      return num * 1000;
    case 'M': // Million shares
      return num;
    case 'K': // Thousand shares = 0.001 Million
      return num * 0.001;
    default:
      // 没有后缀，假设已经是百万单位
      return num;
  }
}

// 预设数据作为回退（单位：百万美元）
function getPresetStockData(symbol: string) {
  const stocks: Record<string, any> = {
    'AAPL': {
      symbol: 'AAPL',
      name: '苹果公司 (Apple)',
      market: 'US',
      currentPrice: 264, // 美元股价
      currentFCF: 123324, // 百万美元
      cashAndEquivalents: 45317, // 百万美元
      totalDebt: 90509, // 百万美元
      sharesOutstanding: 14680, // 百万股 (14.68B)
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

  try {
    let result = null;
    
    // 首先尝试从 Stock Analysis 获取
    try {
      console.log(`[API] Trying Stock Analysis for ${trimmedSymbol}`);
      result = await fetchFromStockAnalysis(trimmedSymbol);
      
      // 检查数据有效性
      if (result.currentFCF > 0 || result.cashAndEquivalents > 0) {
        console.log(`[API] Successfully fetched from Stock Analysis`);
        return res.status(200).json(createAPISuccess(result));
      }
    } catch (saError: any) {
      console.log(`[API] Stock Analysis failed: ${saError.message}`);
    }
    
    // 如果 Stock Analysis 失败，使用预设数据
    console.log(`[API] Falling back to preset data for ${trimmedSymbol}`);
    result = getPresetStockData(trimmedSymbol);
    
    if (result) {
      return res.status(200).json(createAPISuccess(result));
    }
    
    return res.status(404).json(
      createAPIError(ErrorType.NO_DATA_AVAILABLE, `未找到股票 ${trimmedSymbol} 的数据`)
    );

  } catch (error: any) {
    console.error(`[API] 获取股票 ${trimmedSymbol} 失败:`, error);
    return res.status(500).json(
      createAPIError(ErrorType.UNKNOWN_ERROR, error.message || '获取数据失败')
    );
  }
}
