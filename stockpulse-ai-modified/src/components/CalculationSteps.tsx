import { type DCFCalculationStep } from '@/types/dcf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calculator, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
  const [expandedSteps, setExpandedSteps] = useState<number[]>([1, 2, 3]);

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
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            DCF估值详细计算过程
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-white hover:bg-white/20"
            >
              展开全部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-white hover:bg-white/20"
            >
              收起全部
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {steps.map((step, index) => {
            const isExpanded = expandedSteps.includes(step.step);
            const isLast = index === steps.length - 1;
            
            return (
              <div 
                key={step.step} 
                className={`transition-all duration-200 ${isExpanded ? 'bg-slate-50/50' : 'bg-white'}`}
              >
                {/* 步骤标题栏 */}
                <button
                  onClick={() => toggleStep(step.step)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {stepIcons[step.step] || step.step}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{step.title}</h3>
                      {!isLast && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          步骤 {step.step}
                        </Badge>
                      )}
                      {isLast && (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                          最终结果
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 展开内容 */}
                {isExpanded && (
                  <div className="px-6 pb-6 pl-20 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                      {/* 公式 */}
                      <div className="mb-4">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          计算公式
                        </span>
                        <div className="mt-1 p-3 bg-slate-100 rounded-md font-mono text-sm text-slate-700">
                          {step.formula}
                        </div>
                      </div>

                      {/* 计算过程 */}
                      <div className="mb-4">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          计算过程
                        </span>
                        <div className="mt-1 p-3 bg-blue-50 rounded-md text-sm text-slate-700">
                          {step.calculation}
                        </div>
                      </div>

                      {/* 结果 */}
                      <div className="mb-4">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          计算结果
                        </span>
                        <div className="mt-1 p-3 bg-emerald-50 rounded-md">
                          <span className="text-lg font-bold text-emerald-700">
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
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            详细说明
                          </span>
                          <ul className="mt-2 space-y-1">
                            {step.details.map((detail, idx) => (
                              <li 
                                key={idx} 
                                className="text-sm text-slate-600 flex items-start gap-2"
                              >
                                <span className="text-blue-500 mt-1">•</span>
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
      </CardContent>
    </Card>
  );
}
