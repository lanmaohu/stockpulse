import { type DCFCalculationStep } from '@/types/dcf';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calculator, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalculationStepsProps {
  steps: DCFCalculationStep[];
}

const stepIcons: Record<number, React.ReactNode> = {
  1: <DollarSign className="h-5 w-5" />,
  2: <TrendingUp className="h-5 w-5" />,
  3: <Calculator className="h-5 w-5" />,
  4: <PieChart className="h-5 w-5" />,
  5: <DollarSign className="h-5 w-5" />,
  6: <DollarSign className="h-5 w-5" />,
  7: <TrendingUp className="h-5 w-5" />,
  8: <PieChart className="h-5 w-5" />,
  9: <Calculator className="h-5 w-5" />,
};

export function CalculationSteps({ steps }: CalculationStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>(steps.map(s => s.step));

  const toggleStep = (step: number) => {
    setExpandedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  };

  const expandAll = () => setExpandedSteps(steps.map(s => s.step));
  const collapseAll = () => setExpandedSteps([]);

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Calculator className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-white">DCF估值详细计算过程</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              展开全部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              收起全部
            </Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-900">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.includes(step.step);
          const isLast = index === steps.length - 1;
          
          return (
            <div 
              key={step.step} 
              className={cn(
                "transition-all duration-200",
                isExpanded ? 'bg-zinc-900/30' : 'bg-zinc-950'
              )}
            >
              {/* 步骤标题栏 */}
              <button
                onClick={() => toggleStep(step.step)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-sm shadow-lg shadow-emerald-500/20">
                  {stepIcons[step.step] || step.step}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{step.title}</h3>
                    {!isLast && (
                      <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        步骤 {step.step}
                      </Badge>
                    )}
                    {isLast && (
                      <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        最终结果
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">{step.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-zinc-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-zinc-600" />
                  )}
                </div>
              </button>

              {/* 展开内容 */}
              {isExpanded && (
                <div className="px-6 pb-6 pl-20 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    {/* 公式 */}
                    <div className="mb-4">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        计算公式
                      </span>
                      <div className="mt-1 p-3 bg-zinc-950 rounded-lg font-mono text-sm text-emerald-400 border border-zinc-800">
                        {step.formula}
                      </div>
                    </div>

                    {/* 计算过程 */}
                    <div className="mb-4">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        计算过程
                      </span>
                      <div className="mt-1 p-3 bg-zinc-950 rounded-lg text-sm text-zinc-300 border border-zinc-800">
                        {step.calculation}
                      </div>
                    </div>

                    {/* 结果 */}
                    <div className="mb-4">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        计算结果
                      </span>
                      <div className="mt-1 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                        <span className="text-lg font-bold text-emerald-400">
                          {typeof step.result === 'number' 
                            ? step.result.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
                            : step.result
                          }
                        </span>
                      </div>
                    </div>

                    {/* 详细说明 */}
                    {step.details && step.details.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                          详细说明
                        </span>
                        <ul className="mt-2 space-y-1">
                          {step.details.map((detail, idx) => (
                            <li 
                              key={idx} 
                              className="text-sm text-zinc-400 flex items-start gap-2"
                            >
                              <span className="text-emerald-500 mt-1">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
