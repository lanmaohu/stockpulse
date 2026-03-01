import { type DCFResult, type DCFInputData } from '@/types/dcf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign, Building2, Scale, PiggyBank } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DCFResultsProps {
  result: DCFResult;
  inputData: DCFInputData;
}

export function DCFResults({ result, inputData }: DCFResultsProps) {
  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case 'undervalued':
        return {
          icon: <TrendingUp className="h-6 w-6" />,
          label: '低估',
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          bgColor: 'bg-emerald-50',
          description: '内在价值高于市价，存在上涨空间'
        };
      case 'overvalued':
        return {
          icon: <TrendingDown className="h-6 w-6" />,
          label: '高估',
          color: 'bg-red-100 text-red-700 border-red-200',
          bgColor: 'bg-red-50',
          description: '内在价值低于市价，存在下跌风险'
        };
      default:
        return {
          icon: <Minus className="h-6 w-6" />,
          label: '合理估值',
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          bgColor: 'bg-amber-50',
          description: '内在价值与市价接近，估值合理'
        };
    }
  };

  const verdict = getVerdictConfig(result.valuationVerdict);

  return (
    <div className="space-y-6">
      {/* 估值结论卡片 */}
      <Card className="shadow-lg border-slate-200 overflow-hidden">
        <CardHeader className={`${verdict.bgColor} border-b ${verdict.color.split(' ')[2]}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Scale className="h-5 w-5" />
              DCF估值结论
            </CardTitle>
            <Badge className={`${verdict.color} px-4 py-1 text-sm font-semibold`}>
              <span className="flex items-center gap-1">
                {verdict.icon}
                {verdict.label}
              </span>
            </Badge>
          </div>
          <CardDescription className="text-slate-600">
            {verdict.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 每股内在价值 */}
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-sm text-slate-500 mb-1">每股内在价值</div>
              <div className="text-3xl font-bold text-blue-700">
                ¥{result.intrinsicValuePerShare.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">DCF模型计算结果</div>
            </div>

            {/* 当前市价 */}
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm text-slate-500 mb-1">当前市价</div>
              <div className="text-3xl font-bold text-slate-700">
                ¥{inputData.currentPrice.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">市场交易价格</div>
            </div>

            {/* 上涨/下跌空间 */}
            <div className={`text-center p-4 rounded-xl border ${
              result.upsidePotential > 0 
                ? 'bg-emerald-50 border-emerald-100' 
                : 'bg-red-50 border-red-100'
            }`}>
              <div className="text-sm text-slate-500 mb-1">
                {result.upsidePotential > 0 ? '上涨空间' : '下跌风险'}
              </div>
              <div className={`text-3xl font-bold ${
                result.upsidePotential > 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {result.upsidePotential > 0 ? '+' : ''}
                {result.upsidePotential.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                (内在价值 - 市价) / 市价
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 价值构成 */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            企业价值构成
          </CardTitle>
          <CardDescription className="text-purple-100">
            DCF估值各组成部分详细分解
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ValueCard
              title="预测期现金流现值"
              value={result.projections.reduce((sum, p) => sum + p.presentValue, 0)}
              unit="亿元"
              description={`${inputData.projectionYears}年预测期FCF现值总和`}
              color="blue"
            />
            <ValueCard
              title="终值现值"
              value={result.terminalValuePV}
              unit="亿元"
              description="永续期价值折现到当前"
              color="purple"
            />
            <ValueCard
              title="企业价值 (EV)"
              value={result.enterpriseValue}
              unit="亿元"
              description="预测期现值 + 终值现值"
              color="indigo"
              highlight
            />
            <ValueCard
              title="股权价值"
              value={result.equityValue}
              unit="亿元"
              description="EV + 现金 - 负债"
              color="emerald"
              highlight
            />
          </div>

          {/* 净债务调整 */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">净债务调整:</span>
              <span className="font-medium">
                现金 <span className="text-emerald-600">+{inputData.cashAndEquivalents.toFixed(2)}</span>
                {' '}亿 - 负债 <span className="text-red-600">-{inputData.totalDebt.toFixed(2)}</span>
                {' '}亿 = 
                <span className={inputData.cashAndEquivalents >= inputData.totalDebt ? 'text-emerald-600' : 'text-red-600'}>
                  {' '}{inputData.cashAndEquivalents >= inputData.totalDebt ? '+' : ''}
                  {(inputData.cashAndEquivalents - inputData.totalDebt).toFixed(2)}亿
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预测期现金流明细 */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            预测期自由现金流明细
          </CardTitle>
          <CardDescription className="text-cyan-100">
            未来{inputData.projectionYears}年自由现金流预测及折现计算
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">年份</TableHead>
                  <TableHead className="font-semibold text-right">增长率</TableHead>
                  <TableHead className="font-semibold text-right">自由现金流 (FCF)</TableHead>
                  <TableHead className="font-semibold text-right">折现因子</TableHead>
                  <TableHead className="font-semibold text-right">现值 (PV)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.projections.map((proj, index) => (
                  <TableRow key={proj.year} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <TableCell className="font-medium">{proj.yearLabel}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {proj.growthRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {proj.fcf.toFixed(2)} 亿
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {proj.discountFactor.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-emerald-700">
                      {proj.presentValue.toFixed(2)} 亿
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-emerald-50 font-semibold border-t-2 border-emerald-100">
                  <TableCell colSpan={4} className="text-right text-emerald-800">
                    预测期现金流现值总和:
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg text-emerald-700">
                    {result.projections.reduce((sum, p) => sum + p.presentValue, 0).toFixed(2)} 亿
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 终值计算详情 */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            终值计算详情
          </CardTitle>
          <CardDescription className="text-amber-100">
            使用Gordon增长模型计算永续期价值
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-800 font-medium mb-2">Gordon增长模型公式</div>
                <div className="font-mono text-lg text-amber-900">
                  TV = FCFₙ × (1 + g) / (r - g)
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">最后一年FCF (FCFₙ):</span>
                  <span className="font-mono font-medium">
                    {result.projections[result.projections.length - 1]?.fcf.toFixed(2)} 亿
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">永续增长率 (g):</span>
                  <span className="font-mono font-medium">{inputData.terminalGrowthRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">折现率 (r):</span>
                  <span className="font-mono font-medium">{inputData.discountRate}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <ValueCard
                title="终值 (TV)"
                value={result.terminalValue}
                unit="亿元"
                description="预测期结束时的永续价值"
                color="amber"
                highlight
              />
              <ValueCard
                title="终值现值 (PV of TV)"
                value={result.terminalValuePV}
                unit="亿元"
                description="终值折现到当前"
                color="orange"
                highlight
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 敏感性分析 */}
      <SensitivityAnalysis result={result} />
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
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} ${highlight ? 'ring-2 ring-offset-2' : ''}`}>
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
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          敏感性分析
        </CardTitle>
        <CardDescription className="text-slate-300">
          不同折现率和永续增长率假设下的每股价值变化（单位：元）
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">
                  永续增长率 \ 折现率
                </TableHead>
                {discountRates.map(rate => (
                  <TableHead key={rate} className="font-semibold text-right">
                    {rate}%
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {growthRates.map((gr, rowIndex) => (
                <TableRow key={gr} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <TableCell className="font-medium">{gr}%</TableCell>
                  {values[rowIndex].map((value, colIndex) => {
                    const isBaseCase = discountRates[colIndex] === 10 && gr === 3;
                    return (
                      <TableCell key={colIndex} className="text-right">
                        <span className={`font-mono ${
                          isBaseCase 
                            ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold' 
                            : 'text-slate-700'
                        }`}>
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
        <div className="p-4 bg-slate-50 text-sm text-slate-600">
          <span className="font-medium">说明:</span> 蓝色高亮显示的是基准情景（折现率10%，永续增长率3%）下的估值结果。
          横向观察折现率变化的影响，纵向观察永续增长率变化的影响。
        </div>
      </CardContent>
    </Card>
  );
}
