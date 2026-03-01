import { type DCFResult, type DCFInputData } from '@/types/dcf';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign, Building2, Scale, PiggyBank } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DCFResultsProps {
  result: DCFResult;
  inputData: DCFInputData;
}

export function DCFResults({ result, inputData }: DCFResultsProps) {
  // 根据货币类型获取符号
  const getCurrencySymbol = (currency?: string) => {
    switch (currency) {
      case 'CNY': return '¥';
      case 'HKD': return 'HK$';
      case 'USD':
      default: return '$';
    }
  };
  
  const currencySymbol = getCurrencySymbol(inputData.currency);
  
  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case 'undervalued':
        return {
          icon: <TrendingUp className="h-6 w-6" />,
          label: '低估',
          color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
          description: '内在价值高于市价，存在上涨空间'
        };
      case 'overvalued':
        return {
          icon: <TrendingDown className="h-6 w-6" />,
          label: '高估',
          color: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
          description: '内在价值低于市价，存在下跌风险'
        };
      default:
        return {
          icon: <Minus className="h-6 w-6" />,
          label: '合理估值',
          color: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
          description: '内在价值与市价接近，估值合理'
        };
    }
  };

  const verdict = getVerdictConfig(result.valuationVerdict);

  return (
    <div className="space-y-6 w-full">
      {/* 估值结论卡片 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Scale className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">DCF估值结论</h3>
                <p className="text-sm text-zinc-500">{verdict.description}</p>
              </div>
            </div>
            <Badge className={`${verdict.color} px-4 py-1 text-sm font-semibold border`}>
              <span className="flex items-center gap-1">
                {verdict.icon}
                {verdict.label}
              </span>
            </Badge>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 每股内在价值 */}
            <div className="text-center p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
              <div className="text-sm text-zinc-500 mb-2">每股内在价值</div>
              <div className="text-3xl font-bold text-emerald-400">
                ¥{result.intrinsicValuePerShare.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-600 mt-2">DCF模型计算结果</div>
            </div>

            {/* 当前市价 */}
            <div className="text-center p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
              <div className="text-sm text-zinc-500 mb-2">当前市价</div>
              <div className="text-3xl font-bold text-white">
                ¥{inputData.currentPrice.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-600 mt-2">市场交易价格</div>
            </div>

            {/* 上涨/下跌空间 */}
            <div className={cn(
              "text-center p-6 rounded-2xl border",
              result.upsidePotential > 0 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-rose-500/5 border-rose-500/20'
            )}>
              <div className="text-sm text-zinc-500 mb-2">
                {result.upsidePotential > 0 ? '上涨空间' : '下跌风险'}
              </div>
              <div className={cn(
                "text-3xl font-bold",
                result.upsidePotential > 0 ? 'text-emerald-500' : 'text-rose-500'
              )}>
                {result.upsidePotential > 0 ? '+' : ''}
                {result.upsidePotential.toFixed(2)}%
              </div>
              <div className="text-xs text-zinc-600 mt-2">
                (内在价值 - 市价) / 市价
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 价值构成 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">企业价值构成</h3>
              <p className="text-sm text-zinc-500">DCF估值各组成部分详细分解</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ValueCard
              title="预测期现金流现值"
              value={result.projections.reduce((sum, p) => sum + p.presentValue, 0)}
              unit="百万元"
              description={`${inputData.projectionYears}年预测期FCF现值总和`}
              color="blue"
            />
            <ValueCard
              title="终值现值"
              value={result.terminalValuePV}
              unit="百万元"
              description="永续期价值折现到当前"
              color="purple"
            />
            <ValueCard
              title="企业价值 (EV)"
              value={result.enterpriseValue}
              unit="百万元"
              description="预测期现值 + 终值现值"
              color="emerald"
              highlight
            />
            <ValueCard
              title="股权价值"
              value={result.equityValue}
              unit="百万元"
              description="EV + 现金 - 负债"
              color="indigo"
              highlight
            />
          </div>

          {/* 净债务调整 */}
          <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">净债务调整:</span>
              <span className="font-medium">
                现金 <span className="text-emerald-500">+{inputData.cashAndEquivalents.toFixed(2)}</span>
                {' '}百万 - 负债 <span className="text-rose-500">-{inputData.totalDebt.toFixed(2)}</span>
                {' '}百万 = 
                <span className={inputData.cashAndEquivalents >= inputData.totalDebt ? 'text-emerald-500' : 'text-rose-500'}>
                  {' '}{inputData.cashAndEquivalents >= inputData.totalDebt ? '+' : ''}
                  {(inputData.cashAndEquivalents - inputData.totalDebt).toFixed(2)}百万{currencySymbol}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 预测期现金流明细 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">预测期自由现金流明细</h3>
              <p className="text-sm text-zinc-500">未来{inputData.projectionYears}年自由现金流预测及折现计算</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-900 border-zinc-800">
                <TableHead className="font-semibold text-zinc-400">年份</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">增长率</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">自由现金流 (FCF)</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">折现因子</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">现值 (PV)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.projections.map((proj, index) => (
                <TableRow key={proj.year} className={index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/30'}>
                  <TableCell className="font-medium text-white">{proj.yearLabel}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {proj.growthRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-white">
                    {proj.fcf.toFixed(2)} 百万{currencySymbol}
                  </TableCell>
                  <TableCell className="text-right font-mono text-zinc-500">
                    {proj.discountFactor.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-emerald-400">
                    {proj.presentValue.toFixed(2)} 百万{currencySymbol}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-emerald-500/5 font-semibold border-t border-emerald-500/20">
                <TableCell colSpan={4} className="text-right text-emerald-400">
                  预测期现金流现值总和:
                </TableCell>
                <TableCell className="text-right font-mono text-lg text-emerald-400">
                  {result.projections.reduce((sum, p) => sum + p.presentValue, 0).toFixed(2)} 百万{currencySymbol}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 终值计算详情 */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">终值计算详情</h3>
              <p className="text-sm text-zinc-500">使用Gordon增长模型计算永续期价值</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="text-sm text-emerald-400 font-medium mb-2">Gordon增长模型公式</div>
                <div className="font-mono text-lg text-white">
                  TV = FCFₙ × (1 + g) / (r - g)
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">最后一年FCF (FCFₙ):</span>
                  <span className="font-mono font-medium text-white">
                    {result.projections[result.projections.length - 1]?.fcf.toFixed(2)} 百万{currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">永续增长率 (g):</span>
                  <span className="font-mono font-medium text-white">{inputData.terminalGrowthRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">折现率 (r):</span>
                  <span className="font-mono font-medium text-white">{inputData.discountRate}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <ValueCard
                title="终值 (TV)"
                value={result.terminalValue}
                unit="百万元"
                description="预测期结束时的永续价值"
                color="amber"
                highlight
              />
              <ValueCard
                title="终值现值 (PV of TV)"
                value={result.terminalValuePV}
                unit="百万元"
                description="终值折现到当前"
                color="orange"
                highlight
              />
            </div>
          </div>
        </div>
      </div>

      {/* 敏感性分析 */}
      <SensitivityAnalysis result={result} />

      {/* 重要提示 */}
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-rose-500 mb-3">重要提示</h3>
        <ul className="space-y-2 text-sm text-rose-500/80">
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            <span>DCF估值结果高度依赖于增长率、折现率等假设参数，不同假设可能导致估值结果差异巨大</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            <span>永续增长率应显著低于折现率（通常2-3%），且不应长期高于GDP增长率</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            <span>预测期增长率应逐步下降，反映公司从高速增长到成熟期的自然过渡</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            <span>建议结合多种估值方法（PE、PB、EV/EBITDA等）进行综合判断</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

interface ValueCardProps {
  title: string;
  value: number;
  unit: string;
  description: string;
  color: 'blue' | 'purple' | 'indigo' | 'emerald' | 'amber' | 'orange';
  highlight?: boolean;
}

function ValueCard({ title, value, unit, description, color, highlight }: ValueCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/5 border-purple-500/20 text-purple-400',
    indigo: 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
    orange: 'bg-orange-500/5 border-orange-500/20 text-orange-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} ${highlight ? 'ring-1 ring-offset-2 ring-offset-zinc-950' : ''}`}>
      <div className="text-sm opacity-80 mb-1">{title}</div>
      <div className="text-2xl font-bold">
        {value.toFixed(2)}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </div>
      <div className="text-xs opacity-70 mt-1">{description}</div>
    </div>
  );
}

function SensitivityAnalysis({ result }: { result: DCFResult }) {
  const { discountRates, growthRates, values } = result.sensitivityAnalysis;

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">敏感性分析</h3>
            <p className="text-sm text-zinc-500">不同折现率和永续增长率假设下的每股价值变化（单位：元）</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900 border-zinc-800">
              <TableHead className="font-semibold text-zinc-400">
                永续增长率 \ 折现率
              </TableHead>
              {discountRates.map(rate => (
                <TableHead key={rate} className="font-semibold text-zinc-400 text-right">
                  {rate}%
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {growthRates.map((gr, rowIndex) => (
              <TableRow key={gr} className={rowIndex % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/30'}>
                <TableCell className="font-medium text-white">{gr}%</TableCell>
                {values[rowIndex].map((value, colIndex) => {
                  const isBaseCase = discountRates[colIndex] === 10 && gr === 3;
                  return (
                    <TableCell key={colIndex} className="text-right">
                      <span className={cn(
                        "font-mono",
                        isBaseCase 
                          ? 'bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold' 
                          : 'text-zinc-300'
                      )}>
                        {value.toFixed(2)}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 bg-zinc-900/50 text-sm text-zinc-500">
        <span className="font-medium text-zinc-400">说明:</span> 绿色高亮显示的是基准情景（折现率10%，永续增长率3%）下的估值结果。
        横向观察折现率变化的影响，纵向观察永续增长率变化的影响。
      </div>
    </div>
  );
}
