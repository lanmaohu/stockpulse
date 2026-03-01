// DCF估值计算相关类型定义

export interface DCFInputData {
  // 基础财务数据
  currentFCF: number;           // 当前年度自由现金流（亿元）
  cashAndEquivalents: number;   // 现金及现金等价物（亿元）
  totalDebt: number;            // 总负债（亿元）
  sharesOutstanding: number;    // 总股本（亿股）
  currentPrice: number;         // 当前股价（元）
  
  // 增长率和折现率假设
  growthRateYears1to5: number;  // 前5年增长率 (%)
  growthRateYears6to10: number; // 6-10年增长率 (%)
  terminalGrowthRate: number;   // 永续增长率 (%)
  discountRate: number;         // 折现率/WACC (%)
  
  // 计算设置
  projectionYears: number;      // 预测年数（5或10年）
}

export interface YearlyProjection {
  year: number;
  yearLabel: string;
  fcf: number;                  // 自由现金流
  growthRate: number;           // 该年增长率
  discountFactor: number;       // 折现因子
  presentValue: number;         // 现值
}

export interface DCFCalculationStep {
  step: number;
  title: string;
  description: string;
  formula: string;
  calculation: string;
  result: number | string;
  details?: string[];
}

export interface DCFResult {
  // 预测期现金流
  projections: YearlyProjection[];
  
  // 终值计算
  terminalValue: number;        // 终值
  terminalValuePV: number;      // 终值现值
  
  // 企业价值和股权价值
  enterpriseValue: number;      // 企业价值
  equityValue: number;          // 股权价值
  
  // 每股价值
  intrinsicValuePerShare: number;  // 每股内在价值
  
  // 估值判断
  upsidePotential: number;      // 上涨空间 (%)
  valuationVerdict: 'undervalued' | 'fair' | 'overvalued';
  
  // 详细计算步骤
  calculationSteps: DCFCalculationStep[];
  
  // 敏感性分析数据
  sensitivityAnalysis: {
    discountRates: number[];
    growthRates: number[];
    values: number[][];  // 二维数组，每个单元格对应不同折现率和增长率组合下的每股价值
  };
}

export const DEFAULT_INPUT_DATA: DCFInputData = {
  currentFCF: 100,
  cashAndEquivalents: 50,
  totalDebt: 80,
  sharesOutstanding: 10,
  currentPrice: 50,
  growthRateYears1to5: 15,
  growthRateYears6to10: 8,
  terminalGrowthRate: 3,
  discountRate: 10,
  projectionYears: 10,
};
