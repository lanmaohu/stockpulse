// ==================== 股票数据类型定义 ====================

// 股票报价数据
export interface StockQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
}

// 财务数据
export interface FinancialData {
  totalRevenue?: number;
  freeCashflow?: number;
  revenueGrowth?: number;
  totalCash?: number;
  totalDebt?: number;
}

// 关键统计数据
export interface KeyStatistics {
  sharesOutstanding?: number;
}

// 年度财务数据
export interface AnnualEarning {
  date: string;
  revenue: number;
  earnings: number;
}

export interface AnnualCashFlow {
  year: string;
  fcf: number;
}

// 股票摘要信息
export interface StockSummary {
  financialData?: FinancialData;
  defaultKeyStatistics?: KeyStatistics;
  earnings?: {
    financialsChart?: {
      annual?: AnnualEarning[];
    };
  };
  cashflowStatementHistory?: {
    cashflowStatements: Array<{
      endDate: string;
      freeCashFlow: number;
    }>;
  };
}

// 完整股票数据
export interface StockData {
  quote: StockQuote;
  summary: StockSummary;
}

// 历史数据点
export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  k: number;
  d: number;
  j: number;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  range: [number, number];
  body: [number, number];
}

// DCF 估值输入参数
export interface DCFInputs {
  growthRate1to5: number;
  growthRate6to10: number;
  terminalGrowth: number;
  discountRate: number;
  fcfMargin: number;
  baseRevenue: number;
  baseFCF: number;
}

// DCF 估值结果
export interface DCFResult {
  fairValue: number;
  enterpriseValue: number;
  terminalPV: number;
  totalPV: number;
  projections: Array<{
    year: number;
    revenue: number;
    fcf: number;
    pv: number;
  }>;
  marginOfSafety: number;
  equityValue: number;
  cash: number;
  debt: number;
}
