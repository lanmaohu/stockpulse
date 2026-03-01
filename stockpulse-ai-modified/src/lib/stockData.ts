// 预设股票财务数据（基于真实财报数据，单位：亿元人民币）

export interface StockPresetData {
  code: string;
  name: string;
  market: string;
  currentFCF: number;           // 自由现金流（亿元）
  cashAndEquivalents: number;   // 现金及现金等价物（亿元）
  totalDebt: number;            // 总负债（亿元）
  sharesOutstanding: number;    // 总股本（亿股）
  currentPrice: number;         // 当前股价（元）
  currency: string;
}

// 美股数据 (单位：亿美元，已转换为亿元 1美元≈7.2元)
const US_STOCKS: StockPresetData[] = [
  {
    code: 'AAPL',
    name: '苹果公司 (Apple)',
    market: 'US',
    currentFCF: 7760,           // ~1080亿美元
    cashAndEquivalents: 540,    // ~750亿美元现金及等价物
    totalDebt: 820,             // ~1140亿美元债务
    sharesOutstanding: 152,     // 152亿股
    currentPrice: 195,
    currency: 'USD',
  },
  {
    code: 'MSFT',
    name: '微软 (Microsoft)',
    market: 'US',
    currentFCF: 5040,           // ~700亿美元
    cashAndEquivalents: 580,    // ~800亿美元
    totalDebt: 420,             // ~580亿美元
    sharesOutstanding: 74,      // 74亿股
    currentPrice: 420,
    currency: 'USD',
  },
  {
    code: 'GOOGL',
    name: '谷歌 (Alphabet)',
    market: 'US',
    currentFCF: 4750,           // ~660亿美元
    cashAndEquivalents: 780,    // ~1080亿美元
    totalDebt: 250,             // ~350亿美元
    sharesOutstanding: 125,     // 125亿股
    currentPrice: 165,
    currency: 'USD',
  },
  {
    code: 'TSLA',
    name: '特斯拉 (Tesla)',
    market: 'US',
    currentFCF: 720,            // ~100亿美元
    cashAndEquivalents: 215,    // ~300亿美元
    totalDebt: 72,              // ~100亿美元
    sharesOutstanding: 32,      // 32亿股
    currentPrice: 175,
    currency: 'USD',
  },
  {
    code: 'NVDA',
    name: '英伟达 (NVIDIA)',
    market: 'US',
    currentFCF: 3780,           // ~525亿美元
    cashAndEquivalents: 180,    // ~250亿美元
    totalDebt: 72,              // ~100亿美元
    sharesOutstanding: 246,     // 246亿股
    currentPrice: 120,
    currency: 'USD',
  },
  {
    code: 'AMZN',
    name: '亚马逊 (Amazon)',
    market: 'US',
    currentFCF: 2880,           // ~400亿美元
    cashAndEquivalents: 580,    // ~800亿美元
    totalDebt: 1080,            // ~1500亿美元
    sharesOutstanding: 104,     // 104亿股
    currentPrice: 185,
    currency: 'USD',
  },
  {
    code: 'META',
    name: 'Meta Platforms',
    market: 'US',
    currentFCF: 2880,           // ~400亿美元
    cashAndEquivalents: 432,    // ~600亿美元
    totalDebt: 144,             // ~200亿美元
    sharesOutstanding: 26,      // 26亿股
    currentPrice: 500,
    currency: 'USD',
  },
];

// 港股数据 (单位：亿港元，已转换为亿元 1港元≈0.92元)
const HK_STOCKS: StockPresetData[] = [
  {
    code: '0700.HK',
    name: '腾讯控股',
    market: 'HK',
    currentFCF: 1380,           // ~1500亿港元
    cashAndEquivalents: 2880,   // ~3130亿港元
    totalDebt: 2160,            // ~2350亿港元
    sharesOutstanding: 93,      // 93亿股
    currentPrice: 385,
    currency: 'HKD',
  },
  {
    code: '9988.HK',
    name: '阿里巴巴',
    market: 'HK',
    currentFCF: 1380,           // ~1500亿港元
    cashAndEquivalents: 3240,   // ~3520亿港元
    totalDebt: 2160,            // ~2350亿港元
    sharesOutstanding: 190,     // 190亿股
    currentPrice: 82,
    currency: 'HKD',
  },
  {
    code: '3690.HK',
    name: '美团',
    market: 'HK',
    currentFCF: 280,            // ~304亿港元
    cashAndEquivalents: 920,    // ~1000亿港元
    totalDebt: 460,             // ~500亿港元
    sharesOutstanding: 62,      // 62亿股
    currentPrice: 135,
    currency: 'HKD',
  },
  {
    code: '1810.HK',
    name: '小米集团',
    market: 'HK',
    currentFCF: 460,            // ~500亿港元
    cashAndEquivalents: 1100,   // ~1195亿港元
    totalDebt: 370,             // ~402亿港元
    sharesOutstanding: 250,     // 250亿股
    currentPrice: 18,
    currency: 'HKD',
  },
  {
    code: '2318.HK',
    name: '中国平安',
    market: 'HK',
    currentFCF: 920,            // ~1000亿港元
    cashAndEquivalents: 4600,   // ~5000亿港元
    totalDebt: 8280,            // ~9000亿港元
    sharesOutstanding: 182,     // 182亿股
    currentPrice: 38,
    currency: 'HKD',
  },
];

// A股数据 (单位：亿元人民币)
const CN_STOCKS: StockPresetData[] = [
  {
    code: '600519.SS',
    name: '贵州茅台',
    market: 'CN',
    currentFCF: 640,            // 640亿元
    cashAndEquivalents: 580,    // 580亿元
    totalDebt: 0,               // 几乎无负债
    sharesOutstanding: 12.6,    // 12.6亿股
    currentPrice: 1480,
    currency: 'CNY',
  },
  {
    code: '000858.SZ',
    name: '五粮液',
    market: 'CN',
    currentFCF: 260,            // 260亿元
    cashAndEquivalents: 920,    // 920亿元
    totalDebt: 0,               // 几乎无负债
    sharesOutstanding: 38.8,    // 38.8亿股
    currentPrice: 145,
    currency: 'CNY',
  },
  {
    code: '300750.SZ',
    name: '宁德时代',
    market: 'CN',
    currentFCF: 580,            // 580亿元
    cashAndEquivalents: 260,    // 260亿元
    totalDebt: 180,             // 180亿元
    sharesOutstanding: 44,      // 44亿股
    currentPrice: 210,
    currency: 'CNY',
  },
  {
    code: '601318.SS',
    name: '中国平安',
    market: 'CN',
    currentFCF: 1200,           // 1200亿元
    cashAndEquivalents: 5800,   // 5800亿元
    totalDebt: 9800,            // 9800亿元
    sharesOutstanding: 182,     // 182亿股
    currentPrice: 45,
    currency: 'CNY',
  },
  {
    code: '600036.SS',
    name: '招商银行',
    market: 'CN',
    currentFCF: 1400,           // 1400亿元
    cashAndEquivalents: 1200,   // 1200亿元
    totalDebt: 10800,           // 10800亿元
    sharesOutstanding: 252,     // 252亿股
    currentPrice: 35,
    currency: 'CNY',
  },
  {
    code: '002594.SZ',
    name: '比亚迪',
    market: 'CN',
    currentFCF: 1200,           // 1200亿元
    cashAndEquivalents: 720,    // 720亿元
    totalDebt: 1800,            // 1800亿元
    sharesOutstanding: 29,      // 29亿股
    currentPrice: 280,
    currency: 'CNY',
  },
  {
    code: '601888.SS',
    name: '中国中免',
    market: 'CN',
    currentFCF: 65,             // 65亿元
    cashAndEquivalents: 180,    // 180亿元
    totalDebt: 25,              // 25亿元
    sharesOutstanding: 20.7,    // 20.7亿股
    currentPrice: 65,
    currency: 'CNY',
  },
  {
    code: '300059.SZ',
    name: '东方财富',
    market: 'CN',
    currentFCF: 80,             // 80亿元
    cashAndEquivalents: 620,    // 620亿元
    totalDebt: 180,             // 180亿元
    sharesOutstanding: 158,     // 158亿股
    currentPrice: 18,
    currency: 'CNY',
  },
];

// 所有股票数据
export const ALL_STOCKS: StockPresetData[] = [...US_STOCKS, ...HK_STOCKS, ...CN_STOCKS];

// 按市场分组
export const STOCKS_BY_MARKET = {
  US: US_STOCKS,
  HK: HK_STOCKS,
  CN: CN_STOCKS,
};

// 根据代码查找股票数据
export function findStockByCode(code: string): StockPresetData | undefined {
  return ALL_STOCKS.find(stock => stock.code.toUpperCase() === code.toUpperCase());
}

// 转换为DCF输入格式
export function convertToDCFInput(stock: StockPresetData) {
  return {
    currentFCF: stock.currentFCF,
    cashAndEquivalents: stock.cashAndEquivalents,
    totalDebt: stock.totalDebt,
    sharesOutstanding: stock.sharesOutstanding,
    currentPrice: stock.currentPrice,
  };
}
