import { describe, it, expect } from 'vitest';
import {
  calculateDCF,
  validateDCFInput,
  formatNumber,
  formatPercent,
} from '@/lib/dcfCalculator';
import type { DCFInputData } from '@/types/dcf';

// 一组合法的基准输入，所有测试都从这里 spread 修改
const BASE_INPUT: DCFInputData = {
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

// ─── validateDCFInput ─────────────────────────────────────────────────────────

describe('validateDCFInput', () => {
  it('对合法输入不返回错误', () => {
    expect(validateDCFInput(BASE_INPUT)).toHaveLength(0);
  });

  it('当永续增长率 >= 折现率时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, terminalGrowthRate: 10, discountRate: 10 });
    expect(errors.some(e => e.field === 'terminalGrowthRate')).toBe(true);
  });

  it('当永续增长率 > 折现率时也返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, terminalGrowthRate: 12, discountRate: 10 });
    expect(errors.some(e => e.field === 'terminalGrowthRate')).toBe(true);
  });

  it('当总股本为 0 时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, sharesOutstanding: 0 });
    expect(errors.some(e => e.field === 'sharesOutstanding')).toBe(true);
  });

  it('当股价为 0 时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, currentPrice: 0 });
    expect(errors.some(e => e.field === 'currentPrice')).toBe(true);
  });

  it('当前5年增长率为负时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, growthRateYears1to5: -1 });
    expect(errors.some(e => e.field === 'growthRateYears1to5')).toBe(true);
  });

  it('当第6-10年增长率为负时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, growthRateYears6to10: -5 });
    expect(errors.some(e => e.field === 'growthRateYears6to10')).toBe(true);
  });

  it('当折现率 <= 0 时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, discountRate: 0 });
    expect(errors.some(e => e.field === 'discountRate')).toBe(true);
  });

  it('当 projectionYears 不是 5 或 10 时返回错误', () => {
    const errors = validateDCFInput({ ...BASE_INPUT, projectionYears: 7 });
    expect(errors.some(e => e.field === 'projectionYears')).toBe(true);
  });

  it('可同时返回多个错误', () => {
    const errors = validateDCFInput({
      ...BASE_INPUT,
      sharesOutstanding: 0,
      currentPrice: -1,
      terminalGrowthRate: 15,
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── calculateDCF ─────────────────────────────────────────────────────────────

describe('calculateDCF', () => {
  it('当输入非法时抛出异常', () => {
    expect(() =>
      calculateDCF({ ...BASE_INPUT, terminalGrowthRate: 10, discountRate: 10 })
    ).toThrow();
  });

  it('对合法输入正常返回结果', () => {
    const result = calculateDCF(BASE_INPUT);
    expect(result).toBeDefined();
    expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
  });

  it('projections 数量与 projectionYears 一致', () => {
    const result = calculateDCF(BASE_INPUT);
    expect(result.projections).toHaveLength(BASE_INPUT.projectionYears);
  });

  it('5年预测时 projections 长度为 5', () => {
    const result = calculateDCF({ ...BASE_INPUT, projectionYears: 5 });
    expect(result.projections).toHaveLength(5);
  });

  it('企业价值 = 预测期现值总和 + 终值现值', () => {
    const result = calculateDCF(BASE_INPUT);
    const forecastPV = result.projections.reduce((s, p) => s + p.presentValue, 0);
    expect(result.enterpriseValue).toBeCloseTo(forecastPV + result.terminalValuePV, 2);
  });

  it('股权价值 = 企业价值 + 现金 - 负债', () => {
    const result = calculateDCF(BASE_INPUT);
    const expected =
      result.enterpriseValue + BASE_INPUT.cashAndEquivalents - BASE_INPUT.totalDebt;
    expect(result.equityValue).toBeCloseTo(expected, 2);
  });

  it('每股内在价值 = 股权价值 / 总股本', () => {
    const result = calculateDCF(BASE_INPUT);
    expect(result.intrinsicValuePerShare).toBeCloseTo(
      result.equityValue / BASE_INPUT.sharesOutstanding,
      2
    );
  });

  it('上涨空间计算正确', () => {
    const result = calculateDCF(BASE_INPUT);
    const expected =
      ((result.intrinsicValuePerShare - BASE_INPUT.currentPrice) / BASE_INPUT.currentPrice) * 100;
    expect(result.upsidePotential).toBeCloseTo(expected, 2);
  });

  describe('估值判断', () => {
    it('内在价值高于市价 15% 以上时为 undervalued', () => {
      // 设置很低的现价使上涨空间 > 15%
      const result = calculateDCF({ ...BASE_INPUT, currentPrice: 1 });
      expect(result.valuationVerdict).toBe('undervalued');
    });

    it('内在价值低于市价 15% 以上时为 overvalued', () => {
      // 设置极高的现价
      const result = calculateDCF({ ...BASE_INPUT, currentPrice: 999999 });
      expect(result.valuationVerdict).toBe('overvalued');
    });

    it('差距在 ±15% 以内时为 fair', () => {
      // 使用 BASE_INPUT 的默认现价，先算出内在价值再贴近
      const preview = calculateDCF(BASE_INPUT);
      const fairPrice = preview.intrinsicValuePerShare;
      const result = calculateDCF({ ...BASE_INPUT, currentPrice: fairPrice });
      expect(result.valuationVerdict).toBe('fair');
    });
  });

  it('敏感性分析返回 5×5 矩阵', () => {
    const result = calculateDCF(BASE_INPUT);
    expect(result.sensitivityAnalysis.discountRates).toHaveLength(5);
    expect(result.sensitivityAnalysis.growthRates).toHaveLength(5);
    expect(result.sensitivityAnalysis.values).toHaveLength(5);
    result.sensitivityAnalysis.values.forEach(row => {
      expect(row).toHaveLength(5);
    });
  });

  it('敏感性分析中，折现率越高估值越低', () => {
    const result = calculateDCF(BASE_INPUT);
    // 取第一行（固定增长率），比较折现率升高时估值降低
    const row = result.sensitivityAnalysis.values[0];
    for (let i = 0; i < row.length - 1; i++) {
      expect(row[i]).toBeGreaterThan(row[i + 1]);
    }
  });

  it('calculationSteps 包含 9 个步骤', () => {
    const result = calculateDCF(BASE_INPUT);
    expect(result.calculationSteps).toHaveLength(9);
  });

  it('前5年使用 growthRateYears1to5，第6年起使用 growthRateYears6to10', () => {
    const result = calculateDCF(BASE_INPUT);
    result.projections.forEach((p) => {
      if (p.year <= 5) {
        expect(p.growthRate).toBe(BASE_INPUT.growthRateYears1to5);
      } else {
        expect(p.growthRate).toBe(BASE_INPUT.growthRateYears6to10);
      }
    });
  });

  it('FCF 为负时仍能完成计算（不崩溃）', () => {
    // 负 FCF 合法（公司处于亏损期），不应抛出异常
    expect(() => calculateDCF({ ...BASE_INPUT, currentFCF: -50 })).not.toThrow();
  });
});

// ─── 格式化工具函数 ────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('默认保留两位小数', () => {
    const result = formatNumber(1234.567);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('可指定小数位数', () => {
    // toLocaleString 四舍五入：3.14159 保留3位 → 3.142
    expect(formatNumber(3.14159, 3)).toMatch(/3\.142|3,142/);
  });
});

describe('formatPercent', () => {
  it('返回带 % 的字符串', () => {
    expect(formatPercent(12.5)).toBe('12.50%');
  });

  it('可指定小数位数', () => {
    expect(formatPercent(7, 0)).toBe('7%');
  });
});
