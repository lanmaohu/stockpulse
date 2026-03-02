// ── DCF 敏感性分析参数 ──────────────────────────────────────────
export const SENSITIVITY_DISCOUNT_RATES = [8, 9, 10, 11, 12]; // 折现率变化范围（%）
export const SENSITIVITY_GROWTH_RATES = [2, 2.5, 3, 3.5, 4];  // 永续增长率变化范围（%）

// ── 估值判断阈值 ─────────────────────────────────────────────────
// 上涨空间 > +15% → 低估；< -15% → 高估；否则合理
export const VALUATION_THRESHOLD_PERCENT = 15;

// ── DCF 增长率默认参数 ───────────────────────────────────────────
// 第6-10年增长率 = 前5年增长率 × 此倍数（减速20%）
export const YEARS_6_TO_10_GROWTH_MULTIPLIER = 0.8;

// 永续增长率默认值（接近 GDP 增长率水平）
export const DEFAULT_TERMINAL_GROWTH_RATE = 3;
