import { type DCFInputData, type DCFResult, type YearlyProjection, type DCFCalculationStep } from '@/types/dcf';

export interface ValidationError {
  field: keyof DCFInputData | 'general';
  message: string;
}

/**
 * 校验 DCF 输入参数，返回所有错误信息
 */
export function validateDCFInput(data: DCFInputData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.sharesOutstanding <= 0) {
    errors.push({ field: 'sharesOutstanding', message: '总股本必须大于 0' });
  }
  if (data.currentPrice <= 0) {
    errors.push({ field: 'currentPrice', message: '当前股价必须大于 0' });
  }
  if (data.growthRateYears1to5 < 0) {
    errors.push({ field: 'growthRateYears1to5', message: '前5年增长率不能为负数' });
  }
  if (data.growthRateYears6to10 < 0) {
    errors.push({ field: 'growthRateYears6to10', message: '第6-10年增长率不能为负数' });
  }
  if (data.terminalGrowthRate < 0) {
    errors.push({ field: 'terminalGrowthRate', message: '永续增长率不能为负数' });
  }
  if (data.discountRate <= 0) {
    errors.push({ field: 'discountRate', message: '折现率（WACC）必须大于 0' });
  }
  // 核心约束：永续增长率必须严格小于折现率，否则 Gordon 增长模型分母为负或零
  if (data.terminalGrowthRate >= data.discountRate) {
    errors.push({
      field: 'terminalGrowthRate',
      message: `永续增长率（${data.terminalGrowthRate}%）必须小于折现率（${data.discountRate}%），否则终值公式无效`,
    });
  }
  if (data.projectionYears !== 5 && data.projectionYears !== 10) {
    errors.push({ field: 'projectionYears', message: '预测年数只能是 5 或 10' });
  }

  return errors;
}

/**
 * DCF估值计算器
 * 详细计算每一步并返回完整的计算过程
 */
export function calculateDCF(data: DCFInputData): DCFResult {
  const validationErrors = validateDCFInput(data);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map(e => e.message).join('；'));
  }
  const steps: DCFCalculationStep[] = [];
  
  // ===== 步骤1: 输入数据确认 =====
  steps.push({
    step: 1,
    title: '输入基础财务数据',
    description: '确认用于DCF估值的基础财务数据和假设参数',
    formula: '基础数据输入',
    calculation: `当前FCF: ${data.currentFCF}百万元, 现金: ${data.cashAndEquivalents}百万元, 负债: ${data.totalDebt}百万元`,
    result: '数据确认完成',
    details: [
      `当前年度自由现金流 (FCF): ${data.currentFCF.toFixed(2)} 百万元`,
      `现金及现金等价物: ${data.cashAndEquivalents.toFixed(2)} 百万元`,
      `总负债: ${data.totalDebt.toFixed(2)} 百万元`,
      `总股本: ${data.sharesOutstanding.toFixed(2)} 百万股`,
      `当前股价: ${data.currentPrice.toFixed(2)} 元`,
      `预测期年数: ${data.projectionYears} 年`,
    ]
  });

  // ===== 步骤2: 设定增长率假设 =====
  steps.push({
    step: 2,
    title: '设定增长率假设',
    description: '根据不同阶段设定自由现金流的增长率',
    formula: 'g₁ (前5年) > g₂ (6-10年) > g₃ (永续期)',
    calculation: `${data.growthRateYears1to5}% → ${data.growthRateYears6to10}% → ${data.terminalGrowthRate}%`,
    result: '数据确认完成',
    details: [
      `前5年增长率 (g₁): ${data.growthRateYears1to5}% - 高速增长期`,
      `第6-10年增长率 (g₂): ${data.growthRateYears6to10}% - 过渡期增长`,
      `永续增长率 (g₃): ${data.terminalGrowthRate}% - 长期稳定增长率`,
      `折现率 (WACC): ${data.discountRate}%`,
      `注意: 永续增长率应小于折现率 (${data.terminalGrowthRate}% < ${data.discountRate}%)`,
    ]
  });

  // ===== 步骤3: 预测未来自由现金流 =====
  const projections: YearlyProjection[] = [];
  let currentFCF = data.currentFCF;
  
  for (let year = 1; year <= data.projectionYears; year++) {
    const growthRate = year <= 5 
      ? data.growthRateYears1to5 
      : data.growthRateYears6to10;
    
    // 计算该年的FCF
    currentFCF = currentFCF * (1 + growthRate / 100);
    const discountFactor = Math.pow(1 + data.discountRate / 100, year);
    const presentValue = currentFCF / discountFactor;
    
    projections.push({
      year,
      yearLabel: `第${year}年`,
      fcf: currentFCF,
      growthRate,
      discountFactor,
      presentValue,
    });
  }

  const totalPV = projections.reduce((sum, p) => sum + p.presentValue, 0);
  
  steps.push({
    step: 3,
    title: '预测未来自由现金流 (FCF)',
    description: '基于增长率假设，预测未来每年的自由现金流并折现',
    formula: 'FCFₜ = FCFₜ₋₁ × (1 + g)',
    calculation: `预测期: ${data.projectionYears}年, 总现值: ${totalPV.toFixed(2)}百万元`,
    result: totalPV,
    details: projections.map(p => 
      `${p.yearLabel}: FCF=${p.fcf.toFixed(2)}百万元, 增长率=${p.growthRate}%, 折现因子=${p.discountFactor.toFixed(4)}, 现值=${p.presentValue.toFixed(2)}百万元`
    )
  });

  // ===== 步骤4: 计算终值 (Terminal Value) =====
  const lastFCF = projections[projections.length - 1].fcf;
  const terminalValue = (lastFCF * (1 + data.terminalGrowthRate / 100)) 
    / ((data.discountRate - data.terminalGrowthRate) / 100);
  const terminalDiscountFactor = Math.pow(1 + data.discountRate / 100, data.projectionYears);
  const terminalValuePV = terminalValue / terminalDiscountFactor;

  steps.push({
    step: 4,
    title: '计算终值 (Terminal Value)',
    description: '使用Gordon增长模型计算预测期后的永续价值',
    formula: 'TV = FCFₙ × (1 + g₃) / (r - g₃)',
    calculation: `TV = ${lastFCF.toFixed(2)} × (1 + ${data.terminalGrowthRate}%) / (${data.discountRate}% - ${data.terminalGrowthRate}%)`,
    result: terminalValue,
    details: [
      `最后一年FCF (FCFₙ): ${lastFCF.toFixed(2)} 百万元`,
      `永续增长率 (g₃): ${data.terminalGrowthRate}%`,
      `折现率 (r): ${data.discountRate}%`,
      `终值计算公式: ${lastFCF.toFixed(2)} × ${(1 + data.terminalGrowthRate / 100).toFixed(4)} / ${((data.discountRate - data.terminalGrowthRate) / 100).toFixed(4)}`,
      `终值 (TV): ${terminalValue.toFixed(2)} 百万元`,
      `终值折现因子: ${terminalDiscountFactor.toFixed(4)}`,
      `终值现值: ${terminalValuePV.toFixed(2)} 百万元`,
    ]
  });

  // ===== 步骤5: 计算企业价值 (Enterprise Value) =====
  const enterpriseValue = totalPV + terminalValuePV;
  
  steps.push({
    step: 5,
    title: '计算企业价值 (Enterprise Value)',
    description: '将预测期现金流现值与终值现值相加',
    formula: 'EV = Σ(PV of FCF) + PV of Terminal Value',
    calculation: `${totalPV.toFixed(2)} + ${terminalValuePV.toFixed(2)}`,
    result: enterpriseValue,
    details: [
      `预测期现金流现值总和: ${totalPV.toFixed(2)} 百万元`,
      `终值现值: ${terminalValuePV.toFixed(2)} 百万元`,
      `企业价值 (EV): ${enterpriseValue.toFixed(2)} 百万元`,
    ]
  });

  // ===== 步骤6: 计算股权价值 =====
  const equityValue = enterpriseValue + data.cashAndEquivalents - data.totalDebt;
  
  steps.push({
    step: 6,
    title: '计算股权价值 (Equity Value)',
    description: '从企业价值中调整净债务（现金-负债）',
    formula: '股权价值 = EV + 现金 - 负债',
    calculation: `${enterpriseValue.toFixed(2)} + ${data.cashAndEquivalents.toFixed(2)} - ${data.totalDebt.toFixed(2)}`,
    result: equityValue,
    details: [
      `企业价值 (EV): ${enterpriseValue.toFixed(2)} 百万元`,
      `加: 现金及现金等价物: ${data.cashAndEquivalents.toFixed(2)} 百万元`,
      `减: 总负债: ${data.totalDebt.toFixed(2)} 百万元`,
      `净债务: ${(data.totalDebt - data.cashAndEquivalents).toFixed(2)} 百万元`,
      `股权价值: ${equityValue.toFixed(2)} 百万元`,
    ]
  });

  // ===== 步骤7: 计算每股内在价值 =====
  const intrinsicValuePerShare = equityValue / data.sharesOutstanding;
  
  steps.push({
    step: 7,
    title: '计算每股内在价值',
    description: '将股权价值除以总股本得到每股价值',
    formula: '每股价值 = 股权价值 / 总股本',
    calculation: `${equityValue.toFixed(2)} / ${data.sharesOutstanding.toFixed(2)}`,
    result: intrinsicValuePerShare,
    details: [
      `股权价值: ${equityValue.toFixed(2)} 百万元`,
      `总股本: ${data.sharesOutstanding.toFixed(2)} 百万股`,
      `每股内在价值: ${intrinsicValuePerShare.toFixed(2)} 元`,
    ]
  });

  // ===== 步骤8: 估值判断 =====
  const upsidePotential = ((intrinsicValuePerShare - data.currentPrice) / data.currentPrice) * 100;
  let valuationVerdict: 'undervalued' | 'fair' | 'overvalued';
  
  if (upsidePotential > 15) {
    valuationVerdict = 'undervalued';
  } else if (upsidePotential < -15) {
    valuationVerdict = 'overvalued';
  } else {
    valuationVerdict = 'fair';
  }
  
  steps.push({
    step: 8,
    title: '估值判断',
    description: '比较内在价值与当前市价，判断投资价值',
    formula: '上涨空间 = (内在价值 - 市价) / 市价 × 100%',
    calculation: `(${intrinsicValuePerShare.toFixed(2)} - ${data.currentPrice.toFixed(2)}) / ${data.currentPrice.toFixed(2)} × 100%`,
    result: `${upsidePotential.toFixed(2)}%`,
    details: [
      `每股内在价值: ${intrinsicValuePerShare.toFixed(2)} 元`,
      `当前市价: ${data.currentPrice.toFixed(2)} 元`,
      `上涨/下跌空间: ${upsidePotential.toFixed(2)}%`,
      `估值结论: ${valuationVerdict === 'undervalued' ? '低估' : valuationVerdict === 'overvalued' ? '高估' : '合理估值'}`,
      upsidePotential > 0 
        ? `潜在收益: ${upsidePotential.toFixed(2)}%` 
        : `潜在风险: ${Math.abs(upsidePotential).toFixed(2)}%`,
    ]
  });

  // ===== 敏感性分析 =====
  const sensitivityAnalysis = generateSensitivityAnalysis(data);
  
  steps.push({
    step: 9,
    title: '敏感性分析',
    description: '分析不同折现率和增长率假设下的估值变化',
    formula: '多情景分析',
    calculation: '见敏感性分析表格',
    result: '分析完成',
    details: [
      '敏感性分析展示了不同折现率和永续增长率组合下的每股价值',
      '基准情景: 折现率=' + data.discountRate + '%, 永续增长率=' + data.terminalGrowthRate + '%',
      `基准每股价值: ${intrinsicValuePerShare.toFixed(2)} 元`,
    ]
  });

  return {
    projections,
    terminalValue,
    terminalValuePV,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    upsidePotential,
    valuationVerdict,
    calculationSteps: steps,
    sensitivityAnalysis,
  };
}

/**
 * 生成敏感性分析数据
 */
function generateSensitivityAnalysis(data: DCFInputData) {
  const discountRates = [8, 9, 10, 11, 12];  // 折现率变化范围
  const growthRates = [2, 2.5, 3, 3.5, 4];   // 永续增长率变化范围
  
  const values: number[][] = [];
  
  for (const gr of growthRates) {
    const row: number[] = [];
    for (const dr of discountRates) {
      // 临时修改参数计算估值
      const tempData = { ...data, discountRate: dr, terminalGrowthRate: gr };
      const result = quickCalculate(tempData);
      row.push(result);
    }
    values.push(row);
  }
  
  return { discountRates, growthRates, values };
}

/**
 * 快速计算（仅返回每股价值，用于敏感性分析）
 */
function quickCalculate(data: DCFInputData): number {
  let currentFCF = data.currentFCF;
  const projections: number[] = [];
  
  for (let year = 1; year <= data.projectionYears; year++) {
    const growthRate = year <= 5 ? data.growthRateYears1to5 : data.growthRateYears6to10;
    currentFCF = currentFCF * (1 + growthRate / 100);
    const discountFactor = Math.pow(1 + data.discountRate / 100, year);
    projections.push(currentFCF / discountFactor);
  }
  
  const totalPV = projections.reduce((sum, p) => sum + p, 0);
  const lastFCF = currentFCF;
  const terminalValue = (lastFCF * (1 + data.terminalGrowthRate / 100)) 
    / ((data.discountRate - data.terminalGrowthRate) / 100);
  const terminalDiscountFactor = Math.pow(1 + data.discountRate / 100, data.projectionYears);
  const terminalValuePV = terminalValue / terminalDiscountFactor;
  
  const enterpriseValue = totalPV + terminalValuePV;
  const equityValue = enterpriseValue + data.cashAndEquivalents - data.totalDebt;
  
  return equityValue / data.sharesOutstanding;
}

/**
 * 格式化数字显示
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化百分比
 */
export function formatPercent(num: number, decimals: number = 2): string {
  return num.toFixed(decimals) + '%';
}
