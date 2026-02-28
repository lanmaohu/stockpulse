import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { StatCard } from './StatCard';
import { ChartContainer } from './ChartContainer';
import { cn } from '../utils/cn';
import type { StockData, HistoryPoint } from '../types/stock';

interface DashboardProps {
  stockData: StockData;
  history: HistoryPoint[];
}

export function Dashboard({ stockData, history }: DashboardProps) {
  const { quote, summary } = stockData;

  // 计算年度财务数据
  const annualEarnings = useMemo(() => {
    if (!summary?.earnings?.financialsChart?.annual) return [];
    return summary.earnings.financialsChart.annual.map((item: any) => ({
      year: item.date,
      revenue: item.revenue / 1e6,
      earnings: item.earnings / 1e6,
    }));
  }, [summary]);

  const annualCashFlow = useMemo(() => {
    if (!summary?.cashflowStatementHistory?.cashflowStatements) return [];
    return summary.cashflowStatementHistory.cashflowStatements
      .map((item: any) => ({
        year: format(new Date(item.endDate), 'yyyy'),
        fcf: item.freeCashFlow / 1e6,
      }))
      .reverse();
  }, [summary]);

  return (
    <div className="space-y-8">
      {/* 第1行：统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard
          title="当前股价"
          value={`$${quote.regularMarketPrice?.toFixed(2)}`}
          trend={quote.regularMarketChangePercent}
        />
        <StatCard
          title="总市值"
          value={`${(quote.marketCap / 1e12).toFixed(2)}T`}
          subValue="万亿"
        />
        <StatCard
          title="市盈率 (TTM)"
          value={quote.trailingPE?.toFixed(2) || '无'}
        />
        <StatCard
          title="远期市盈率"
          value={quote.forwardPE?.toFixed(2) || '无'}
        />
        <StatCard
          title="52周范围"
          value={`$${quote.fiftyTwoWeekLow?.toFixed(0)} - $${quote.fiftyTwoWeekHigh?.toFixed(0)}`}
        />
      </div>

      {/* 第2行：K线图 */}
      <ChartContainer title="股价K线" subtitle="展示股票价格走势变化及均线系统（日线）" height={450}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={history} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" opacity={0.5} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#52525b' }}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#52525b' }}
              domain={['auto', 'auto']}
              orientation="right"
            />
            <Tooltip content={<KLineTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }}
            />
            {/* 影线 */}
            <Bar dataKey="range" barSize={1} name="波动范围">
              {history.map((entry, index) => (
                <Cell
                  key={`wick-${index}`}
                  fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
            {/* 实体 */}
            <Bar dataKey="body" name="股价">
              {history.map((entry, index) => (
                <Cell
                  key={`body-${index}`}
                  fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="ma5" stroke="#6366f1" strokeWidth={1.5} dot={false} name="MA5" />
            <Line type="monotone" dataKey="ma10" stroke="#10b981" strokeWidth={1} dot={false} name="MA10" opacity={0.6} />
            <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="MA20" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* 第3行：成交量 */}
      <ChartContainer title="成交量" subtitle="展示每日成交量变化（单位：股）" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
            <XAxis dataKey="date" hide />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#52525b' }}
              tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`}
            />
            <Tooltip
              cursor={{ fill: '#18181b' }}
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
            />
            <Bar dataKey="volume">
              {history.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                  opacity={0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* 第4行：KDJ */}
      <ChartContainer title="KDJ 指标" subtitle="超买超卖技术指标 (9, 3, 3)" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
            <XAxis dataKey="date" hide />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#52525b' }}
              domain={[0, 100]}
            />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="k" stroke="#6366f1" strokeWidth={1.5} dot={false} name="K" />
            <Line type="monotone" dataKey="d" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="D" />
            <Line type="monotone" dataKey="j" stroke="#ec4899" strokeWidth={1.5} dot={false} name="J" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* 财务趋势网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 第5行：营收与净利润 */}
        <ChartContainer title="年度营收与净利润趋势" subtitle="展示公司营收和净利润的年度变化情况（单位：百万美元）" height={350}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={annualEarnings} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#52525b' }}
                tickFormatter={(val) => `${(val / 1e3).toFixed(1)}k`}
              />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
              <Area type="monotone" dataKey="revenue" fill="#6366f1" stroke="#6366f1" fillOpacity={0.1} name="营业收入" />
              <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="净利润" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* 第6行：自由现金流 */}
        <ChartContainer title="自由现金流年度趋势" subtitle="展示公司自由现金流的年度变化情况（单位：百万美元）" height={350}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={annualCashFlow} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorFcf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#52525b' }}
                tickFormatter={(val) => `${(val / 1e3).toFixed(1)}k`}
              />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="fcf" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorFcf)" name="自由现金流" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}

// K线图专用提示框
function KLineTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-2xl text-xs space-y-2 min-w-[160px]">
        <p className="font-bold border-b border-zinc-800 pb-2 mb-2 text-white flex justify-between items-center">
          <span>{data.date}</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px]',
              data.close >= data.open
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-rose-500/20 text-rose-500'
            )}
          >
            {data.close >= data.open ? '看涨' : '看跌'}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span className="text-zinc-500">开盘</span>{' '}
          <span className="text-white font-mono text-right">${data.open.toFixed(2)}</span>
          <span className="text-zinc-500">最高</span>{' '}
          <span className="text-white font-mono text-right">${data.high.toFixed(2)}</span>
          <span className="text-zinc-500">最低</span>{' '}
          <span className="text-white font-mono text-right">${data.low.toFixed(2)}</span>
          <span className="text-zinc-500">收盘</span>{' '}
          <span className="text-white font-mono font-bold text-right">${data.close.toFixed(2)}</span>
          {data.ma5 && (
            <>
              <span className="text-indigo-400">MA5</span>{' '}
              <span className="text-indigo-400 font-mono text-right">${data.ma5.toFixed(2)}</span>
            </>
          )}
          {data.ma20 && (
            <>
              <span className="text-amber-400">MA20</span>{' '}
              <span className="text-amber-400 font-mono text-right">${data.ma20.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
}
