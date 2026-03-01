import { useState } from 'react';
import { type DCFInputData, type DCFResult, DEFAULT_INPUT_DATA } from '@/types/dcf';
import { calculateDCF } from '@/lib/dcfCalculator';
import { DCFInputForm } from '@/components/DCFInputForm';
import { DCFResults } from '@/components/DCFResults';
import { CalculationSteps } from '@/components/CalculationSteps';
import { TechnicalPage } from '@/pages/TechnicalPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { Calculator, BarChart3, ListOrdered, Activity, PieChart, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import './App.css';

type PageType = 'dcf' | 'technical' | 'dashboard';

function App() {
  const [activePage, setActivePage] = useState<PageType>('dcf');

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* 左侧边栏导航 */}
      <div className="fixed left-0 top-0 bottom-0 w-16 border-r border-zinc-800 flex flex-col items-center py-8 gap-8 bg-zinc-950 z-50">
        {/* Logo */}
        <div
          className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
          onClick={() => setActivePage('dcf')}
        >
          <Activity className="text-black w-6 h-6" />
        </div>

        {/* 导航项 */}
        <div className="flex flex-col gap-6">
          <NavButton
            icon={PieChart}
            isActive={activePage === 'dcf'}
            onClick={() => setActivePage('dcf')}
            label="DCF估值"
          />
          {/* 技术面分析页面（暂时隐藏）
          <NavButton
            icon={LineChart}
            isActive={activePage === 'technical'}
            onClick={() => setActivePage('technical')}
            label="技术面分析"
          />
          */}
          {/* 仪表盘页面（暂时隐藏）
          <NavButton
            icon={BarChart3}
            isActive={activePage === 'dashboard'}
            onClick={() => setActivePage('dashboard')}
            label="仪表盘"
          />
          */}
        </div>
      </div>

      <main className="pl-16">
        {/* 顶部风险提示 */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5">
          <p className="text-[10px] text-amber-500/80 text-center">
            ⚠️ 免责声明：本站仅提供数据展示与技术交流，不构成任何投资建议。股市有风险，入市需谨慎。
          </p>
        </div>

        {/* 页面内容 */}
        {activePage === 'dcf' && <DCFPage />}
        {/* 技术面分析页面（暂时隐藏）
        {activePage === 'technical' && <TechnicalPage />}
        */}
        {/* 仪表盘页面（暂时隐藏）
        {activePage === 'dashboard' && <DashboardPage />}
        */}

        {/* Toast通知 */}
        <Toaster position="top-center" richColors />
      </main>
    </div>
  );
}

// DCF估值页面
function DCFPage() {
  const [result, setResult] = useState<DCFResult | null>(null);
  const [inputData, setInputData] = useState<DCFInputData>(DEFAULT_INPUT_DATA);

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
    <>
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
      <div className="p-8 space-y-8">
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
                    <p><span className="text-zinc-400">步骤1 - 基准数据：</span>当前FCF约1500百万港元，现金3130百万，负债2350百万，股本93百万股</p>
                    <p><span className="text-zinc-400">步骤2 - 预测未来：</span>假设前5年增长率12%，6-10年增长率8%，永续增长率3%</p>
                    <p><span className="text-zinc-400">步骤3 - 计算终值：</span>第10年FCF约380000百万，终值 = 380000 × (1+3%) / (10%-3%) ≈ 5580000百万港元</p>
                    <p><span className="text-zinc-400">步骤4 - 折现计算：</span>预测期现值约800000百万 + 终值现值约2100000百万 = 企业价值约2900000百万</p>
                    <p><span className="text-zinc-400">步骤5 - 得出结果：</span>股权价值 = 2900百万 + 78百万(净现金) = 2978百万 ÷ 93百万股 ≈ <span className="text-emerald-400 font-medium">395港元/股</span></p>
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
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-950 border border-zinc-900 p-1 rounded-2xl">
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

              </TabsList>

              <TabsContent value="summary" className="mt-0 w-full">
                <DCFResults result={result} inputData={inputData} />
              </TabsContent>

              <TabsContent value="steps" className="mt-0 w-full">
                <CalculationSteps steps={result.calculationSteps} />
              </TabsContent>


            </Tabs>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-zinc-900 px-8 py-12 text-center mt-12">
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-[0.3em]">
            STOCKPULSE AI | DCF股票估值计算器
          </p>
          <p className="text-zinc-800 text-[10px] mt-4 max-w-2xl mx-auto">
            本站仅提供数据展示与技术交流，不构成任何投资建议。股市有风险，入市需谨慎。
          </p>
        </footer>
      </div>
    </>
  );
}

// 仪表盘页面（占位）
function DashboardPage() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">仪表盘</h1>
        </div>
      </header>
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
          <p>仪表盘功能开发中...</p>
        </div>
      </div>
    </>
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

export default App;
