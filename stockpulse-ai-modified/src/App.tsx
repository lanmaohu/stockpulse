import { useState } from 'react';
import { type DCFInputData, type DCFResult, DEFAULT_INPUT_DATA } from '@/types/dcf';
import { calculateDCF } from '@/lib/dcfCalculator';
import { DCFInputForm } from '@/components/DCFInputForm';
import { DCFResults } from '@/components/DCFResults';
import { CalculationSteps } from '@/components/CalculationSteps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Calculator, BarChart3, ListOrdered, Activity, PieChart, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import './App.css';

function App() {
  const [result, setResult] = useState<DCFResult | null>(null);
  const [inputData, setInputData] = useState<DCFInputData>(DEFAULT_INPUT_DATA);
  const [activeTab, setActiveTab] = useState<'dcf' | 'dashboard'>('dcf');

  const handleCalculate = (data: DCFInputData) => {
    setInputData(data);
    const dcfResult = calculateDCF(data);
    setResult(dcfResult);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReset = () => {
    setResult(null);
    setInputData(DEFAULT_INPUT_DATA);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* 左侧边栏导航 */}
      <div className="fixed left-0 top-0 bottom-0 w-16 border-r border-zinc-800 flex flex-col items-center py-8 gap-8 bg-zinc-950 z-50">
        {/* Logo */}
        <div
          className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
          onClick={() => setActiveTab('dcf')}
        >
          <Activity className="text-black w-6 h-6" />
        </div>

        {/* 导航项 */}
        <div className="flex flex-col gap-6">
          <NavButton
            icon={PieChart}
            isActive={activeTab === 'dcf'}
            onClick={() => setActiveTab('dcf')}
            label="DCF估值"
          />
          <NavButton
            icon={BarChart3}
            isActive={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            label="仪表盘"
          />
        </div>
      </div>

      <main className="pl-16">
        {/* 顶部风险提示 */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5">
          <p className="text-[10px] text-amber-500/80 text-center">
            ⚠️ 免责声明：本站仅提供数据展示与技术交流，不构成任何投资建议。股市有风险，入市需谨慎。
          </p>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-tighter uppercase tracking-[0.2em] text-xs">
              STOCKPULSE AI
            </h1>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-sm font-semibold text-white">价值投资DCF估值模型</span>
          </div>
        </header>

        {/* 主内容区域 */}
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          {/* 介绍说明 */}
          {!result && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Calculator className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">关于DCF估值模型</h2>
                  <p className="text-zinc-500 leading-relaxed">
                    DCF（现金流折现）估值是一种绝对估值方法，通过预测公司未来的自由现金流并将其折现到当前价值，
                    来计算公司的内在价值。
                  </p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="w-8 h-8 bg-emerald-500 text-black rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <span className="text-sm text-zinc-400">预测未来自由现金流</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="w-8 h-8 bg-emerald-500 text-black rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <span className="text-sm text-zinc-400">计算终值（永续价值）</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="w-8 h-8 bg-emerald-500 text-black rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <span className="text-sm text-zinc-400">折现计算企业价值</span>
                    </div>
                  </div>
                  
                  {/* 腾讯示例 */}
                  <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <p className="text-xs font-medium text-emerald-500 mb-2">💡 示例：腾讯控股(0700.HK) DCF估值演示</p>
                    <div className="text-xs text-zinc-500 space-y-1">
                      <p><span className="text-zinc-400">步骤1 - 基准数据：</span>当前FCF约1500亿港元，现金3130亿，负债2350亿，股本93亿股</p>
                      <p><span className="text-zinc-400">步骤2 - 预测未来：</span>假设前5年增长率12%，6-10年增长率8%，永续增长率3%</p>
                      <p><span className="text-zinc-400">步骤3 - 计算终值：</span>第10年FCF约3800亿，终值 = 3800 × (1+3%) / (10%-3%) ≈ 5.6万亿港元</p>
                      <p><span className="text-zinc-400">步骤4 - 折现计算：</span>预测期现值约8000亿 + 终值现值约2.1万亿 = 企业价值约2.9万亿</p>
                      <p><span className="text-zinc-400">步骤5 - 得出结果：</span>股权价值 = 2.9万亿 + 0.78万亿(净现金) = 3.68万亿 ÷ 93亿股 ≈ <span className="text-emerald-400 font-medium">395港元/股</span></p>
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
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-950 border border-zinc-900 p-1 rounded-2xl">
                  <TabsTrigger 
                    value="summary" 
                    className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black rounded-xl"
                  >
                    <BarChart3 className="h-4 w-4" />
                    估值结果
                  </TabsTrigger>
                  <TabsTrigger 
                    value="steps" 
                    className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black rounded-xl"
                  >
                    <ListOrdered className="h-4 w-4" />
                    计算步骤
                  </TabsTrigger>
                  <TabsTrigger 
                    value="details" 
                    className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black rounded-xl"
                  >
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
        </div>

        {/* Toast通知 */}
        <Toaster position="top-center" richColors />

        {/* Footer */}
        <footer className="border-t border-zinc-900 px-8 py-12 text-center mt-12">
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-[0.3em]">
            STOCKPULSE AI | DCF股票估值计算器
          </p>
          <p className="text-zinc-800 text-[10px] mt-4 max-w-2xl mx-auto">
            本站仅提供数据展示与技术交流，不构成任何投资建议。股市有风险，入市需谨慎。
          </p>
        </footer>
      </main>
    </div>
  );
}

// 导航按钮组件
interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  label: string;
}

function NavButton({ icon: Icon, isActive, onClick, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-6 h-6 transition-colors',
        isActive ? 'text-white' : 'text-zinc-600 hover:text-white'
      )}
      title={label}
    >
      <Icon className="w-full h-full" />
    </button>
  );
}

// 详细数据组件
function DetailedData({ result, inputData }: { result: DCFResult; inputData: DCFInputData }) {
  return (
    <div className="space-y-6">
      {/* 关键参数汇总 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          关键参数汇总
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">当前FCF</div>
            <div className="font-mono font-medium text-white">{inputData.currentFCF.toFixed(2)} 亿</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">前5年增长率</div>
            <div className="font-mono font-medium text-white">{inputData.growthRateYears1to5}%</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">6-10年增长率</div>
            <div className="font-mono font-medium text-white">{inputData.growthRateYears6to10}%</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">永续增长率</div>
            <div className="font-mono font-medium text-white">{inputData.terminalGrowthRate}%</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">折现率 (WACC)</div>
            <div className="font-mono font-medium text-white">{inputData.discountRate}%</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">预测期年数</div>
            <div className="font-mono font-medium text-white">{inputData.projectionYears} 年</div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">净债务</div>
            <div className={cn(
              "font-mono font-medium",
              inputData.totalDebt > inputData.cashAndEquivalents ? 'text-rose-500' : 'text-emerald-500'
            )}>
              {(inputData.totalDebt - inputData.cashAndEquivalents).toFixed(2)} 亿
            </div>
          </div>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-xs text-zinc-500">总股本</div>
            <div className="font-mono font-medium text-white">{inputData.sharesOutstanding.toFixed(2)} 亿股</div>
          </div>
        </div>
      </div>

      {/* 计算过程公式展示 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          DCF估值核心公式
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-sm font-medium text-emerald-400 mb-2">1. 企业价值公式</div>
            <div className="font-mono text-lg text-white">
              EV = Σ [FCFₜ / (1 + r)ᵗ] + TV / (1 + r)ⁿ
            </div>
            <div className="text-sm text-zinc-500 mt-2">
              其中：FCFₜ = 第t年自由现金流，r = 折现率，TV = 终值，n = 预测期年数
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-sm font-medium text-emerald-400 mb-2">2. 终值公式 (Gordon增长模型)</div>
            <div className="font-mono text-lg text-white">
              TV = FCFₙ × (1 + g) / (r - g)
            </div>
            <div className="text-sm text-zinc-500 mt-2">
              其中：FCFₙ = 最后一年自由现金流，g = 永续增长率
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-sm font-medium text-emerald-400 mb-2">3. 股权价值公式</div>
            <div className="font-mono text-lg text-white">
              股权价值 = EV + 现金 - 负债
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="text-sm font-medium text-emerald-400 mb-2">4. 每股价值公式</div>
            <div className="font-mono text-lg text-white">
              每股价值 = 股权价值 / 总股本
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
