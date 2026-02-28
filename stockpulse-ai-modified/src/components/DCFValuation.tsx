import { useState, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Info, Search, Activity, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import type { StockData, DCFInputs, DCFResult } from '../types/stock';

interface DCFValuationProps {
  stockData: StockData;
}

export function DCFValuation({ stockData }: DCFValuationProps) {
  const { quote, summary } = stockData;
  const financialData = summary?.financialData;
  const stats = summary?.defaultKeyStatistics;

  // DCF 输入参数
  const [inputs, setInputs] = useState<DCFInputs>({
    growthRate1to5: 0.15,
    growthRate6to10: 0.1,
    terminalGrowth: 0.02,
    discountRate: 0.1,
    fcfMargin: 0.2,
    baseRevenue: 0,
    baseFCF: 0,
  });

  // 自动填充默认值
  useEffect(() => {
    if (financialData?.freeCashflow && financialData?.totalRevenue) {
      const currentMargin = financialData.freeCashflow / financialData.totalRevenue;
      const revenueGrowth = financialData.revenueGrowth || 0.15;

      setInputs((prev) => ({
        ...prev,
        fcfMargin: Math.max(0.05, Math.min(0.4, currentMargin)),
        growthRate1to5: Math.max(0, Math.min(0.5, revenueGrowth)),
        growthRate6to10: Math.max(0, Math.min(0.25, revenueGrowth * 0.5)),
        baseRevenue: financialData.totalRevenue / 1000000,
        baseFCF: financialData.freeCashflow / 1000000,
      }));
    }
  }, [financialData]);

  // 计算 DCF 估值结果
  const dcfResult: DCFResult | null = useMemo(() => {
    if (!inputs.baseRevenue || !stats?.sharesOutstanding) return null;

    const revenueTTM = inputs.baseRevenue;
    const { growthRate1to5, growthRate6to10, terminalGrowth, discountRate, fcfMargin } = inputs;
    const cash = (financialData?.totalCash || 0) / 1000000;
    const debt = (financialData?.totalDebt || 0) / 1000000;
    const shares = stats.sharesOutstanding;

    let currentRevenue = revenueTTM;
    let totalPV = 0;
    const projections = [];

    // 预测未来10年的现金流
    for (let year = 1; year <= 10; year++) {
      const growth = year <= 5 ? growthRate1to5 : growthRate6to10;
      currentRevenue *= 1 + growth;
      const fcf = currentRevenue * fcfMargin;
      const pv = fcf / Math.pow(1 + discountRate, year);
      totalPV += pv;
      projections.push({ year, revenue: currentRevenue, fcf, pv });
    }

    // 计算终值
    const lastFCF = projections[9].fcf;
    const terminalValue = (lastFCF * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
    const terminalPV = terminalValue / Math.pow(1 + discountRate, 10);

    // 计算股权价值
    const enterpriseValue = totalPV + terminalPV;
    const equityValue = enterpriseValue + cash - debt;
    const fairValue = (equityValue * 1000000) / shares;
    const marginOfSafety = ((fairValue - (quote.regularMarketPrice || 0)) / fairValue) * 100;

    return {
      fairValue,
      enterpriseValue,
      terminalPV,
      totalPV,
      projections,
      marginOfSafety,
      equityValue,
      cash,
      debt,
    };
  }, [inputs, financialData, stats, quote.regularMarketPrice]);

  // 处理百分比输入变化
  const handleInputChange = (name: keyof DCFInputs, value: string) => {
    const numValue = parseFloat(value) / 100;
    if (!isNaN(numValue)) {
      setInputs((prev) => ({ ...prev, [name]: numValue }));
    }
  };

  // 处理基础数值输入变化
  const handleBaseValueChange = (name: 'baseRevenue' | 'baseFCF', value: string) => {
    const rawValue = value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      setInputs((prev) => {
        const newInputs = { ...prev, [name]: numValue };
        // 如果改变了基础值，更新利润率
        if (newInputs.baseRevenue > 0) {
          newInputs.fcfMargin = newInputs.baseFCF / newInputs.baseRevenue;
        }
        return newInputs;
      });
    } else if (value === '') {
      setInputs((prev) => ({ ...prev, [name]: 0 }));
    }
  };

  // 同步最新数据（从 API 获取的数据）
  const syncLatestData = (revenue?: number, fcf?: number) => {
    if (revenue !== undefined && fcf !== undefined) {
      // 使用从 API 获取的数据
      setInputs((prev) => ({
        ...prev,
        baseRevenue: revenue,
        baseFCF: fcf,
        fcfMargin: revenue > 0 ? fcf / revenue : prev.fcfMargin,
      }));
    } else if (financialData?.freeCashflow && financialData?.totalRevenue) {
      // 使用已有的财务数据
      setInputs((prev) => ({
        ...prev,
        baseRevenue: financialData.totalRevenue / 1000000,
        baseFCF: financialData.freeCashflow / 1000000,
        fcfMargin: financialData.freeCashflow / financialData.totalRevenue,
      }));
    }
  };

  if (!dcfResult) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        数据不足，无法进行 DCF 估值
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* 说明部分 */}
      <ExplanationSection />

      {/* 第1步：基准财务数据 */}
      <Step1Section
        inputs={inputs}
        financialData={financialData}
        quote={quote}
        onInputChange={handleBaseValueChange}
        onSync={syncLatestData}
      />

      {/* 第2步：预测未来现金流 */}
      <Step2Section
        inputs={inputs}
        financialData={financialData}
        dcfResult={dcfResult}
        onInputChange={handleInputChange}
      />

      {/* 第3步：终值参数 */}
      <Step3Section inputs={inputs} dcfResult={dcfResult} onInputChange={handleInputChange} />

      {/* 第4步：折现率 */}
      <Step4Section inputs={inputs} dcfResult={dcfResult} onInputChange={handleInputChange} />

      {/* 第5步：最终结果 */}
      <Step5Section dcfResult={dcfResult} stats={stats} quote={quote} />
    </div>
  );
}

// ============ 子组件 ============

function ExplanationSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Info className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">DCF 估值逻辑与步骤</h3>
        </div>
        <div className="markdown-body prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
          <Markdown>
            {`现金流折现（DCF）估值法的核心逻辑是：**一家公司的价值等于其未来能够产生的全部现金流折现到今天的总和。**

估值过程分为五个关键步骤：

**1. 基准数据**：确认标的最新一年的营收和自由现金流。

**2. 预测未来**：预测未来 10 年公司能赚多少钱。

**3. 计算终值**：预测 10 年后公司还能值多少钱。

**4. 折现计算**：把未来的钱按比例缩减到今天的价值。

**5. 得出结果**：计算每股价值并对比当前市价。`}
          </Markdown>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">💡 实例演示：Apple (AAPL)</h4>
        <div className="markdown-body prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
          <Markdown>
            {`假设 Apple 去年产生了 $100,000M 的自由现金流。

**1. 基准数据**：确认去年营收 $383,000M，FCF $100,000M。

**2. 预测未来**：预计未来 10 年每年增长 10%，第 10 年产生约 $259,000M。

**3. 计算终值**：假设 10 年后进入永续增长，终值约 $3,000,000M。

**4. 折现计算**：用 10% 的折现率将上述金额折算回今天。

**5. 得出结果**：相加除以股数，得出合理股价。`}
          </Markdown>
        </div>
      </div>
    </div>
  );
}

interface Step1SectionProps {
  inputs: DCFInputs;
  financialData: any;
  quote: any;
  onInputChange: (name: 'baseRevenue' | 'baseFCF', value: string) => void;
  onSync: (revenue: number, fcf: number) => void;
}

function Step1Section({ inputs, financialData, quote, onInputChange, onSync }: Step1SectionProps) {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<{
    revenue: number;
    fcf: number;
    revenueYear: string;
    fcfYear: string;
    fcfMargin: number;
  } | null>(null);

  // 从 API 获取财务数据
  const fetchFinancials = async () => {
    if (!quote?.symbol) return;
    
    setLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch(`/api/stock/financials/${quote.symbol}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '获取数据失败');
      }
      
      const data = result.data;
      
      // 转换为百万单位
      const revenueInMillion = data.latestRevenue.value / 1e6;
      const fcfInMillion = data.latestFCF.value / 1e6;
      
      // 保存获取的数据
      setFetchedData({
        revenue: revenueInMillion,
        fcf: fcfInMillion,
        revenueYear: data.latestRevenue.year,
        fcfYear: data.latestFCF.year,
        fcfMargin: data.fcfMargin,
      });
      
      // 自动填入输入框
      onSync(revenueInMillion, fcfInMillion);
      
    } catch (err: any) {
      console.error('获取财务数据失败:', err);
      setFetchError(err.message || '获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-500/20 text-zinc-400 rounded-full flex items-center justify-center font-bold text-sm border border-zinc-500/30">
            1
          </div>
          <h3 className="text-lg font-bold text-white">查询基准年财务数据 (Base Financials)</h3>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Search className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-white">自动查询最新财务数据</h4>
                <button
                  onClick={fetchFinancials}
                  disabled={loading || !quote?.symbol}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border",
                    loading 
                      ? "bg-zinc-700 text-zinc-400 border-zinc-600 cursor-not-allowed" 
                      : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      查询中...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3 h-3" />
                      查询最新数据
                    </>
                  )}
                </button>
              </div>
              
              {fetchError && (
                <p className="text-[10px] text-rose-400">{fetchError}</p>
              )}
              
              {fetchedData && (
                <div className="text-[10px] text-emerald-400 space-y-0.5">
                  <p>✓ 已获取 {fetchedData.revenueYear} 年度数据</p>
                  <p>营收: ${fetchedData.revenue.toFixed(2)}M | FCF: ${fetchedData.fcf.toFixed(2)}M</p>
                </div>
              )}
              
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                点击"查询最新数据"从 Yahoo Finance 获取 {quote?.symbol} 的最新年度财务报表数据。
                数据将自动填入下方输入框。您也可以直接手动修改数值。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>基准年营收 (Revenue, 百万)</span>
              {fetchedData?.revenueYear && (
                <span className="text-emerald-400 text-[10px]">{fetchedData.revenueYear}</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="text"
                value={inputs.baseRevenue === 0 ? '' : inputs.baseRevenue.toFixed(2)}
                onChange={(e) => onInputChange('baseRevenue', e.target.value)}
                placeholder="输入营收 (百万)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>基准年自由现金流 (FCF, 百万)</span>
              {fetchedData?.fcfYear && (
                <span className="text-emerald-400 text-[10px]">{fetchedData.fcfYear}</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="text"
                value={inputs.baseFCF === 0 ? '' : inputs.baseFCF.toFixed(2)}
                onChange={(e) => onInputChange('baseFCF', e.target.value)}
                placeholder="输入现金流 (百万)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">当前 FCF 利润率</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {inputs.baseRevenue > 0 ? ((inputs.baseFCF / inputs.baseRevenue) * 100).toFixed(2) : 0}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (inputs.baseFCF / inputs.baseRevenue) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            注：FCF 利润率 = 自由现金流 / 营业收入。该比例反映了公司将营收转化为真金白银的能力。
          </p>
        </div>
      </div>
    </div>
  );
}

interface Step2SectionProps {
  inputs: DCFInputs;
  financialData: any;
  dcfResult: DCFResult;
  onInputChange: (name: keyof DCFInputs, value: string) => void;
}

function Step2Section({ inputs, financialData, dcfResult, onInputChange }: Step2SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-500/30">
            2
          </div>
          <h3 className="text-lg font-bold text-white">查询基准年营收增长率数据并预测未来 10 年自有现金流</h3>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <ExternalLink className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">数据参考与建议</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-400 font-medium">默认值设定逻辑：</span>
                <br />• 1-5 年增长率：维持标的当前年度营收增长水平 ({(financialData?.revenueGrowth * 100 || 15).toFixed(1)}%)。
                <br />• 6-10 年增长率：在 1-5 年基础上自动减少 50%（模拟企业进入成熟期后的增速放缓）。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>1-5 年营收增长率</span>
              <span className="text-indigo-400 font-mono">{(inputs.growthRate1to5 * 100).toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={inputs.growthRate1to5 * 100}
              onChange={(e) => onInputChange('growthRate1to5', e.target.value)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>6-10 年营收增长率</span>
              <span className="text-indigo-400 font-mono">{(inputs.growthRate6to10 * 100).toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={inputs.growthRate6to10 * 100}
              onChange={(e) => onInputChange('growthRate6to10', e.target.value)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">计算逻辑与结果</h4>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">计算公式</p>
            <code className="text-xs text-indigo-300">FCF_n = Revenue_0 * (1+g)^n * FCF_Margin</code>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase">第 10 年预测过程</p>
            <p className="text-xs text-zinc-400 font-mono">
              ${inputs.baseRevenue.toFixed(1)}M × (1 + {(inputs.growthRate6to10 * 100).toFixed(1)}%)¹⁰ ×{' '}
              {(inputs.fcfMargin * 100).toFixed(1)}% = <span className="text-white">${dcfResult.projections[9].fcf.toFixed(2)}M</span>
            </p>
          </div>
          <div className="h-24 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dcfResult.projections}>
                <Bar dataKey="fcf" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step3SectionProps {
  inputs: DCFInputs;
  dcfResult: DCFResult;
  onInputChange: (name: keyof DCFInputs, value: string) => void;
}

function Step3Section({ inputs, dcfResult, onInputChange }: Step3SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm border border-emerald-500/30">
            3
          </div>
          <h3 className="text-lg font-bold text-white">设定终值参数 (Terminal Value)</h3>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>永久增长率 (通常 2-3%)</span>
              <span className="text-emerald-400 font-mono">{(inputs.terminalGrowth * 100).toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={inputs.terminalGrowth * 100}
              onChange={(e) => onInputChange('terminalGrowth', e.target.value)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <p className="text-[10px] text-zinc-500 italic">注：永久增长率不应超过长期 GDP 增长率。</p>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">计算逻辑与结果</h4>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">计算公式 (戈登增长模型)</p>
            <code className="text-xs text-emerald-300">TV = [FCF_10 * (1+g_p)] / (WACC - g_p)</code>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase">计算结果</p>
            <p className="text-xs text-zinc-400 font-mono">
              终值 (TV) ={' '}
              <span className="text-white">${(dcfResult.terminalPV * Math.pow(1 + inputs.discountRate, 10)).toFixed(2)}M</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step4SectionProps {
  inputs: DCFInputs;
  dcfResult: DCFResult;
  onInputChange: (name: keyof DCFInputs, value: string) => void;
}

function Step4Section({ inputs, dcfResult, onInputChange }: Step4SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-bold text-sm border border-amber-500/30">
            4
          </div>
          <h3 className="text-lg font-bold text-white">设定折现率 (Discount Rate)</h3>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 flex justify-between">
              <span>折现率 (WACC/期望回报率)</span>
              <span className="text-amber-400 font-mono">{(inputs.discountRate * 100).toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={inputs.discountRate * 100}
              onChange={(e) => onInputChange('discountRate', e.target.value)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">计算逻辑与结果</h4>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">计算公式</p>
            <code className="text-xs text-amber-300">PV = CashFlow_n / (1 + WACC)^n</code>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">10年现金流现值</p>
              <p className="text-sm font-bold text-white font-mono">${dcfResult.totalPV.toFixed(2)}M</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">终值现值</p>
              <p className="text-sm font-bold text-white font-mono">${dcfResult.terminalPV.toFixed(2)}M</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step5SectionProps {
  dcfResult: DCFResult;
  stats: any;
  quote: any;
}

function Step5Section({ dcfResult, stats, quote }: Step5SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center font-bold text-sm border border-rose-500/30">
            5
          </div>
          <h3 className="text-lg font-bold text-white">财务调整与股权价值</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <span className="text-xs text-zinc-500">企业价值 (EV)</span>
            <span className="text-sm font-bold text-white font-mono">${dcfResult.enterpriseValue.toFixed(2)}M</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <span className="text-xs text-zinc-500">(+) 现金及投资</span>
            <span className="text-sm font-bold text-emerald-500 font-mono">+${dcfResult.cash.toFixed(2)}M</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <span className="text-xs text-zinc-500">(-) 总负债</span>
            <span className="text-sm font-bold text-rose-500 font-mono">-${dcfResult.debt.toFixed(2)}M</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <span className="text-xs text-indigo-300 font-bold">股权价值</span>
            <span className="text-sm font-bold text-indigo-400 font-mono">${dcfResult.equityValue.toFixed(2)}M</span>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">最终估值结果</h4>
        <div className="space-y-4 w-full">
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 text-left">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">计算公式</p>
            <code className="text-xs text-rose-300">Fair Value = Equity Value / Shares</code>
          </div>
          <div className="space-y-2 text-left">
            <p className="text-[10px] text-zinc-500 uppercase">最终每股价值</p>
            <p className="text-xs text-zinc-400 font-mono">
              ${dcfResult.equityValue.toFixed(2)}M / {(stats?.sharesOutstanding / 1e6).toFixed(2)}M 股 ={' '}
              <span className="text-white font-bold">${dcfResult.fairValue.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div
          className={cn(
            'mt-8 px-8 py-4 rounded-3xl flex flex-col items-center w-full',
            dcfResult.marginOfSafety > 0
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-rose-500/10 border border-rose-500/20'
          )}
        >
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">安全边际 (Margin of Safety)</p>
          <p
            className={cn(
              'text-3xl font-bold font-mono',
              dcfResult.marginOfSafety > 0 ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {dcfResult.marginOfSafety.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
