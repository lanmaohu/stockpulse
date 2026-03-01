import type { DCFInputData } from '@/types/dcf';

// 预设股票财务数据（原始单位：百万美元/百万港元/百万人民币）

export interface StockPresetData {
  code: string;
  name: string;
  market: string;
  currentFCF: number;           // 自由现金流（百万元，原始货币）
  cashAndEquivalents: number;   // 现金及现金等价物（百万元，原始货币）
  totalDebt: number;            // 总负债（百万元，原始货币）
  sharesOutstanding: number;    // 总股本（百万股）
  currentPrice: number;         // 当前股价（原始货币）
  currency: string;             // 货币代码：USD/HKD/CNY
}

// 美股数据 (单位：百万美元)
const US_STOCKS: StockPresetData[] = [
  {
    code: 'AAPL',
    name: '苹果公司 (Apple)',
    market: 'US',
    currentFCF: 123324,         // 1233百万美元
    cashAndEquivalents: 45317,  // 453百万美元
    totalDebt: 90509,           // 905百万美元
    sharesOutstanding: 14680,   // 146.8百万股
    currentPrice: 264,
    currency: 'USD',
  },
  {
    code: 'MSFT',
    name: '微软 (Microsoft)',
    market: 'US',
    currentFCF: 67400,          // 674百万美元
    cashAndEquivalents: 78000,  // 780百万美元
    totalDebt: 42000,           // 420百万美元
    sharesOutstanding: 7420,    // 74.2百万股
    currentPrice: 420,
    currency: 'USD',
  },
  {
    code: 'GOOGL',
    name: '谷歌 (Alphabet)',
    market: 'US',
    currentFCF: 72700,          // 727百万美元
    cashAndEquivalents: 101000, // 1010百万美元
    totalDebt: 13200,           // 132百万美元
    sharesOutstanding: 12500,   // 125百万股
    currentPrice: 165,
    currency: 'USD',
  },
  {
    code: 'TSLA',
    name: '特斯拉 (Tesla)',
    market: 'US',
    currentFCF: 4400,           // 44百万美元
    cashAndEquivalents: 29100,  // 291百万美元
    totalDebt: 7200,            // 72百万美元
    sharesOutstanding: 3200,    // 32百万股
    currentPrice: 175,
    currency: 'USD',
  },
  {
    code: 'NVDA',
    name: '英伟达 (NVIDIA)',
    market: 'US',
    currentFCF: 37800,          // 378百万美元
    cashAndEquivalents: 25900,  // 259百万美元
    totalDebt: 8500,            // 85百万美元
    sharesOutstanding: 24600,   // 246百万股
    currentPrice: 120,
    currency: 'USD',
  },
  {
    code: 'AMZN',
    name: '亚马逊 (Amazon)',
    market: 'US',
    currentFCF: 36800,          // 368百万美元
    cashAndEquivalents: 86000,  // 860百万美元
    totalDebt: 54000,           // 540百万美元
    sharesOutstanding: 10400,   // 104百万股
    currentPrice: 185,
    currency: 'USD',
  },
  {
    code: 'META',
    name: 'Meta Platforms',
    market: 'US',
    currentFCF: 48800,          // 488百万美元
    cashAndEquivalents: 77800,  // 778百万美元
    totalDebt: 18600,           // 186百万美元
    sharesOutstanding: 2570,    // 25.7百万股
    currentPrice: 500,
    currency: 'USD',
  },
];

// 港股数据 (单位：百万港元)
const HK_STOCKS: StockPresetData[] = [
  {
    code: '0700.HK',
    name: '腾讯控股',
    market: 'HK',
    currentFCF: 150000,         // 1500百万港元
    cashAndEquivalents: 288000, // 2880百万港元
    totalDebt: 216000,          // 2160百万港元
    sharesOutstanding: 9300,    // 93百万股
    currentPrice: 385,
    currency: 'HKD',
  },
  {
    code: '3690.HK',
    name: '美团',
    market: 'HK',
    currentFCF: 42000,          // 420百万港元
    cashAndEquivalents: 120000, // 1200百万港元
    totalDebt: 18000,           // 180百万港元
    sharesOutstanding: 6200,    // 62百万股
    currentPrice: 115,
    currency: 'HKD',
  },
  {
    code: '2318.HK',
    name: '中国平安',
    market: 'HK',
    currentFCF: 85000,          // 850百万港元
    cashAndEquivalents: 95000,  // 950百万港元
    totalDebt: 980000,          // 9800百万港元
    sharesOutstanding: 18200,   // 182百万股
    currentPrice: 42,
    currency: 'HKD',
  },
  {
    code: '9988.HK',
    name: '阿里巴巴',
    market: 'HK',
    currentFCF: 158000,         // 1580百万港元
    cashAndEquivalents: 318000, // 3180百万港元
    totalDebt: 185000,          // 1850百万港元
    sharesOutstanding: 19000,   // 190百万股
    currentPrice: 82,
    currency: 'HKD',
  },
  {
    code: '1211.HK',
    name: '比亚迪股份',
    market: 'HK',
    currentFCF: 12500,          // 125百万港元
    cashAndEquivalents: 78000,  // 780百万港元
    totalDebt: 72000,           // 720百万港元
    sharesOutstanding: 2900,    // 29百万股
    currentPrice: 275,
    currency: 'HKD',
  },
];

// A股数据 (单位：百万人民币)
const CN_STOCKS: StockPresetData[] = [
  {
    code: '600519.SS',
    name: '贵州茅台',
    market: 'CN',
    currentFCF: 64000,          // 640百万人民币
    cashAndEquivalents: 156000, // 1560百万人民币
    totalDebt: 0,               // 无有息负债
    sharesOutstanding: 1256,    // 12.56百万股
    currentPrice: 1580,
    currency: 'CNY',
  },
  {
    code: '000858.SZ',
    name: '五粮液',
    market: 'CN',
    currentFCF: 30000,          // 300百万人民币
    cashAndEquivalents: 125000, // 1250百万人民币
    totalDebt: 0,
    sharesOutstanding: 3880,    // 38.8百万股
    currentPrice: 145,
    currency: 'CNY',
  },
  {
    code: '601318.SS',
    name: '中国平安(A股)',
    market: 'CN',
    currentFCF: 78000,          // 780百万人民币
    cashAndEquivalents: 82000,  // 820百万人民币
    totalDebt: 850000,          // 8500百万人民币
    sharesOutstanding: 18200,   // 182百万股
    currentPrice: 48,
    currency: 'CNY',
  },
  {
    code: '000333.SZ',
    name: '美的集团',
    market: 'CN',
    currentFCF: 45000,          // 450百万人民币
    cashAndEquivalents: 82000,  // 820百万人民币
    totalDebt: 35000,           // 350百万人民币
    sharesOutstanding: 7000,    // 70百万股
    currentPrice: 62,
    currency: 'CNY',
  },
  {
    code: '000725.SZ',
    name: '京东方A',
    market: 'CN',
    currentFCF: 15000,          // 150百万人民币
    cashAndEquivalents: 68000,  // 680百万人民币
    totalDebt: 95000,           // 950百万人民币
    sharesOutstanding: 37600,   // 376百万股
    currentPrice: 4.2,
    currency: 'CNY',
  },
  {
    code: '002594.SZ',
    name: '比亚迪(A股)',
    market: 'CN',
    currentFCF: 12500,          // 125百万人民币
    cashAndEquivalents: 78000,  // 780百万人民币
    totalDebt: 72000,           // 720百万人民币
    sharesOutstanding: 2900,    // 29百万股
    currentPrice: 275,
    currency: 'CNY',
  },
  {
    code: '300750.SZ',
    name: '宁德时代',
    market: 'CN',
    currentFCF: 52000,          // 520百万人民币
    cashAndEquivalents: 240000, // 2400百万人民币
    totalDebt: 78000,           // 780百万人民币
    sharesOutstanding: 4400,    // 44百万股
    currentPrice: 215,
    currency: 'CNY',
  },
  {
    code: '601888.SS',
    name: '中国中免',
    market: 'CN',
    currentFCF: 5800,           // 58百万人民币
    cashAndEquivalents: 22000,  // 220百万人民币
    totalDebt: 2800,            // 28百万人民币
    sharesOutstanding: 2070,    // 20.7百万股
    currentPrice: 67,
    currency: 'CNY',
  },
];

// 所有股票数据
export const ALL_STOCKS: StockPresetData[] = [
  ...US_STOCKS,
  ...HK_STOCKS,
  ...CN_STOCKS,
];

// 按市场分类的股票数据
export const STOCKS_BY_MARKET = {
  US: US_STOCKS,
  HK: HK_STOCKS,
  CN: CN_STOCKS,
};

// 根据股票代码查找预设数据
export function findStockByCode(code: string): StockPresetData | undefined {
  return ALL_STOCKS.find(stock => stock.code.toUpperCase() === code.toUpperCase());
}

// 将预设数据转换为DCF输入格式
export function convertToDCFInput(stock: StockPresetData): DCFInputData {
  return {
    currentFCF: stock.currentFCF,
    growthRateYears1to5: stock.market === 'US' ? 12 : 10,
    growthRateYears6to10: stock.market === 'US' ? 8 : 6,
    terminalGrowthRate: 3,
    discountRate: stock.market === 'CN' ? 8 : stock.market === 'HK' ? 12 : 10,
    cashAndEquivalents: stock.cashAndEquivalents,
    totalDebt: stock.totalDebt,
    sharesOutstanding: stock.sharesOutstanding,
    currentPrice: stock.currentPrice,
    projectionYears: 10,
    currency: stock.currency,
  };
}
