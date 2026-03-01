import { useState } from 'react';
import { type DCFInputData, type DCFResult, DEFAULT_INPUT_DATA } from '@/types/dcf';
import { calculateDCF } from '@/lib/dcfCalculator';
import { DCFInputForm } from '@/components/DCFInputForm';
import { DCFResults } from '@/components/DCFResults';
import { CalculationSteps } from '@/components/CalculationSteps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Calculator, BarChart3, ListOrdered, BookOpen } from 'lucide-react';
import './App.css';

function App() {
  const [result, setResult] = useState<DCFResult | null>(null);
  const [inputData, setInputData] = useState<DCFInputData>(DEFAULT_INPUT_DATA);

  const handleCalculate = (data: DCFInputData) => {
    setInputData(data);
    const dcfResult = calculateDCF(data);
    setResult(dcfResult);
    // 滚动到结果区域
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReset = () => {
    setResult(null);
    setInputData(DEFAULT_INPUT_DATA);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white py-8 shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Calculator className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DCF股票估值计算器</h1>
              <p className="text-blue-200 mt-1">现金流折现模型 - 详细计算每一步过程</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 介绍说明 */}
        {!result && (
          <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">关于DCF估值模型</h2>
                <p className="text-slate-600 leading-relaxed">
                  DCF（现金流折现）估值是一种绝对估值方法，通过预测公司未来的自由现金流并将其折现到当前价值，
                  来计算公司的内在价值。本工具将详细展示DCF估值的每一个计算步骤，包括：
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <span className="text-sm text-slate-700">预测未来自由现金流</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <span className="text-sm text-slate-700">计算终值（永续价值）</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <span className="text-sm text-slate-700">折现计算企业价值</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 输入表单 */}
        <div className="mb-8">
          <DCFInputForm onCalculate={handleCalculate} onReset={handleReset} />
        </div>

        {/* 结果展示 */}
        {result && (
          <div id="results-section" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm border border-slate-200 p-1">
                <TabsTrigger value="summary" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4" />
                  估值结果
                </TabsTrigger>
                <TabsTrigger value="steps" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <ListOrdered className="h-4 w-4" />
                  计算步骤
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Calculator className="h-4 w-4" />
                  详细数据
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-0">
                <DCFResults result={result} inputData={inputData} />
              </TabsContent>

              <TabsContent value="steps" className="mt-0">
                <CalculationSteps steps={result.calculationSteps} />
              </TabsContent>

              <TabsContent value="details" className="mt-0">
                <DetailedData result={result} inputData={inputData} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Toast通知 */}
      <Toaster position="top-center" richColors />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            DCF股票估值计算器 | 本工具仅供学习和参考，不构成投资建议
          </p>
          <p className="text-xs mt-2 text-slate-500">
            估值结果受多种假设影响，实际投资请结合多方面因素综合分析
          </p>
        </div>
      </footer>
    </div>
  );
}

// 详细数据组件
function DetailedData({ inputData }: { result: DCFResult; inputData: DCFInputData }) {
  return (
    <div className="space-y-6">
      {/* 关键参数汇总 */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">关键参数汇总</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">当前FCF</div>
            <div className="font-mono font-medium">{inputData.currentFCF.toFixed(2)} 亿</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">前5年增长率</div>
            <div className="font-mono font-medium">{inputData.growthRateYears1to5}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">6-10年增长率</div>
            <div className="font-mono font-medium">{inputData.growthRateYears6to10}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">永续增长率</div>
            <div className="font-mono font-medium">{inputData.terminalGrowthRate}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">折现率 (WACC)</div>
            <div className="font-mono font-medium">{inputData.discountRate}%</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">预测期年数</div>
            <div className="font-mono font-medium">{inputData.projectionYears} 年</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">净债务</div>
            <div className={`font-mono font-medium ${inputData.totalDebt > inputData.cashAndEquivalents ? 'text-red-600' : 'text-emerald-600'}`}>
              {(inputData.totalDebt - inputData.cashAndEquivalents).toFixed(2)} 亿
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">总股本</div>
            <div className="font-mono font-medium">{inputData.sharesOutstanding.toFixed(2)} 亿股</div>
          </div>
        </div>
      </div>

      {/* 计算过程公式展示 */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">DCF估值核心公式</h3>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-sm font-medium text-blue-800 mb-2">1. 企业价值公式</div>
            <div className="font-mono text-lg text-blue-900">
              EV = Σ [FCFₜ / (1 + r)ᵗ] + TV / (1 + r)ⁿ
            </div>
            <div className="text-sm text-blue-700 mt-2">
              其中：FCFₜ = 第t年自由现金流，r = 折现率，TV = 终值，n = 预测期年数
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-sm font-medium text-purple-800 mb-2">2. 终值公式 (Gordon增长模型)</div>
            <div className="font-mono text-lg text-purple-900">
              TV = FCFₙ × (1 + g) / (r - g)
            </div>
            <div className="text-sm text-purple-700 mt-2">
              其中：FCFₙ = 最后一年自由现金流，g = 永续增长率
            </div>
          </div>
          
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-sm font-medium text-emerald-800 mb-2">3. 股权价值公式</div>
            <div className="font-mono text-lg text-emerald-900">
              股权价值 = EV + 现金 - 负债
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="text-sm font-medium text-amber-800 mb-2">4. 每股价值公式</div>
            <div className="font-mono text-lg text-amber-900">
              每股价值 = 股权价值 / 总股本
            </div>
          </div>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h3 className="text-lg font-semibold text-amber-800 mb-3">重要提示</h3>
        <ul className="space-y-2 text-sm text-amber-700">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>DCF估值结果高度依赖于增长率、折现率等假设参数，不同假设可能导致估值结果差异巨大</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>永续增长率应显著低于折现率（通常2-3%），且不应长期高于GDP增长率</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>预测期增长率应逐步下降，反映公司从高速增长到成熟期的自然过渡</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>建议结合多种估值方法（PE、PB、EV/EBITDA等）进行综合判断</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
