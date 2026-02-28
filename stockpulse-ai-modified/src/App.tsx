import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  PieChart, 
  Info, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Building2,
  Users,
  Calendar,
  DollarSign,
  Plus,
  Send,
  Edit2,
  ExternalLink
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Legend
} from 'recharts';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface StockData {
  quote: any;
  summary: any;
}

// --- Components ---

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dcf'>('dashboard');

  const fetchData = async (targetSymbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stock/${targetSymbol}`);
      if (!response.ok) throw new Error('未找到该股票');
      const data = await response.json();
      setStockData(data);

      const historyResponse = await fetch(`/api/stock/history/${targetSymbol}?interval=1d`);
      const historyData = await historyResponse.json();
      
      // Format history for Candlestick and KDJ
      const formattedHistory = historyData.quotes.map((q: any) => ({
        date: format(new Date(q.date), 'MM-dd'),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      })).filter((q: any) => q.close !== null);
      
      // Calculate KDJ (9, 3, 3) and Moving Averages
      let k = 50, d = 50;
      const enrichedHistory = formattedHistory.map((q: any, i: number) => {
        // KDJ
        let kVal = 50, dVal = 50, jVal = 50;
        if (i >= 9) {
          const last9 = formattedHistory.slice(i - 8, i + 1);
          const lowN = Math.min(...last9.map(l => l.low));
          const highN = Math.max(...last9.map(l => l.high));
          const rsv = highN === lowN ? 50 : ((q.close - lowN) / (highN - lowN)) * 100;
          k = (2/3) * k + (1/3) * rsv;
          d = (2/3) * d + (1/3) * k;
          kVal = k;
          dVal = d;
          jVal = 3 * k - 2 * d;
        }

        // Moving Averages
        const getMA = (period: number) => {
          if (i < period - 1) return null;
          const slice = formattedHistory.slice(i - period + 1, i + 1);
          const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
          return sum / period;
        };

        return { 
          ...q, 
          k: kVal, d: dVal, j: jVal,
          ma5: getMA(5),
          ma10: getMA(10),
          ma20: getMA(20),
          range: [q.low, q.high],
          body: [q.open, q.close]
        };
      });

      setHistory(enrichedHistory);
      setSymbol(targetSymbol);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('AAPL');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchData(searchInput.toUpperCase());
    }
  };

  const quote = stockData?.quote;
  const summary = stockData?.summary;

  // Annual Financials
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
    return summary.cashflowStatementHistory.cashflowStatements.map((item: any) => ({
      year: format(new Date(item.endDate), 'yyyy'),
      fcf: item.freeCashFlow / 1e6,
    })).reverse();
  }, [summary]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Sidebar / Navigation Rail */}
      <div className="fixed left-0 top-0 bottom-0 w-16 border-r border-zinc-800 flex flex-col items-center py-8 gap-8 bg-zinc-950 z-50">
        <div 
          className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity className="text-black w-6 h-6" />
        </div>
        <div className="flex flex-col gap-6">
          <BarChart3 
            className={cn(
              "w-6 h-6 cursor-pointer transition-colors",
              activeTab === 'dashboard' ? "text-white" : "text-zinc-600 hover:text-white"
            )} 
            onClick={() => setActiveTab('dashboard')}
          />
          <PieChart 
            className={cn(
              "w-6 h-6 cursor-pointer transition-colors",
              activeTab === 'dcf' ? "text-white" : "text-zinc-600 hover:text-white"
            )} 
            onClick={() => setActiveTab('dcf')}
          />
          <Users className="w-6 h-6 text-zinc-600 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      <main className="pl-16">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-tighter uppercase tracking-[0.2em] text-xs">STOCKPULSE AI</h1>
            <div className="h-4 w-px bg-zinc-800" />
            {quote && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-zinc-500">{quote.symbol}</span>
                <span className="text-sm font-semibold text-white">{quote.shortName}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索股票代码 (如 TSLA)"
              className="bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 w-64 transition-all"
            />
          </form>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">正在获取市场数据...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl flex items-center gap-4">
              <AlertCircle className="text-rose-500 w-6 h-6" />
              <div>
                <h3 className="text-rose-500 font-semibold">错误</h3>
                <p className="text-rose-500/70 text-sm">{error}</p>
              </div>
            </div>
          ) : stockData ? (
            activeTab === 'dashboard' ? (
              <div className="space-y-8">
                {/* Row 1: Stats */}
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

                {/* Row 2: K-line */}
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
                      <Tooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-2xl text-xs space-y-2 min-w-[160px]">
                                <p className="font-bold border-b border-zinc-800 pb-2 mb-2 text-white flex justify-between items-center">
                                  <span>{data.date}</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px]",
                                    data.close >= data.open ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                                  )}>
                                    {data.close >= data.open ? '看涨' : '看跌'}
                                  </span>
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                  <span className="text-zinc-500">开盘</span> <span className="text-white font-mono text-right">${data.open.toFixed(2)}</span>
                                  <span className="text-zinc-500">最高</span> <span className="text-white font-mono text-right">${data.high.toFixed(2)}</span>
                                  <span className="text-zinc-500">最低</span> <span className="text-white font-mono text-right">${data.low.toFixed(2)}</span>
                                  <span className="text-zinc-500">收盘</span> <span className="text-white font-mono font-bold text-right">${data.close.toFixed(2)}</span>
                                  {data.ma5 && <><span className="text-indigo-400">MA5</span> <span className="text-indigo-400 font-mono text-right">${data.ma5.toFixed(2)}</span></>}
                                  {data.ma20 && <><span className="text-amber-400">MA20</span> <span className="text-amber-400 font-mono text-right">${data.ma20.toFixed(2)}</span></>}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="left" 
                        iconType="circle" 
                        wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }}
                      />
                      {/* Wick */}
                      <Bar 
                        dataKey="range" 
                        barSize={1}
                        name="波动范围"
                      >
                        {history.map((entry, index) => (
                          <Cell 
                            key={`wick-${index}`} 
                            fill={entry.close >= entry.open ? '#10b981' : '#ef4444'} 
                          />
                        ))}
                      </Bar>
                      {/* Body */}
                      <Bar 
                        dataKey="body" 
                        name="股价"
                      >
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

                {/* Row 3: Volume */}
                <ChartContainer title="成交量" subtitle="展示每日成交量变化（单位：股）" height={200}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`} />
                      <Tooltip 
                        cursor={{ fill: '#18181b' }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                      />
                      <Bar dataKey="volume">
                        {history.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? '#10b981' : '#ef4444'} opacity={0.4} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Row 4: KDJ */}
                <ChartContainer title="KDJ 指标" subtitle="超买超卖技术指标 (9, 3, 3)" height={200}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="k" stroke="#6366f1" strokeWidth={1.5} dot={false} name="K" />
                      <Line type="monotone" dataKey="d" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="D" />
                      <Line type="monotone" dataKey="j" stroke="#ec4899" strokeWidth={1.5} dot={false} name="J" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>

              {/* Financial Trends Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Row 5: Revenue & Net Income */}
                <ChartContainer title="年度营收与净利润趋势" subtitle="展示公司营收和净利润的年度变化情况（单位：百万美元）" height={350}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={annualEarnings} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} tickFormatter={(val) => `${(val / 1e3).toFixed(1)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                      <Area type="monotone" dataKey="revenue" fill="#6366f1" stroke="#6366f1" fillOpacity={0.1} name="营业收入" />
                      <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="净利润" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Row 6: Free Cash Flow */}
                <ChartContainer title="自由现金流年度趋势" subtitle="展示公司自由现金流的年度变化情况（单位：百万美元）" height={350}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={annualCashFlow} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <defs>
                        <linearGradient id="colorFcf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} tickFormatter={(val) => `${(val / 1e3).toFixed(1)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="fcf" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorFcf)" name="自由现金流" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
            ) : (
              <div className="space-y-8">
                <DCFValuation stockData={stockData} />
              </div>
            )
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-4">
                <BarChart3 className="w-10 h-10 text-zinc-700" />
              </div>
              <h2 className="text-2xl font-bold text-white">欢迎使用 StockPulse AI</h2>
              <p className="text-zinc-500 max-w-md">输入股票代码开始深度分析基本面、技术面及 AI 驱动的投资见解。</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-900 px-8 py-12 text-center">
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-[0.3em]">由 Kimi AI & Yahoo Finance 提供支持</p>
          <p className="text-zinc-800 text-[10px] mt-4 max-w-2xl mx-auto">
            免责声明：StockPulse AI 提供的信息仅供参考，不构成任何投资建议。在做出投资决策前，请务必进行独立研究。
          </p>
        </footer>
      </main>
    </div>
  );
}

const StatCard = ({ title, value, subValue, trend, icon: Icon }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-all group">
    <div className="flex justify-between items-start mb-2">
      <p className="text-sm text-zinc-500 font-medium">{title}</p>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-0.5 rounded-full",
          trend >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
        )}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(trend).toFixed(2)}%
        </div>
      )}
    </div>
    <div className="flex items-baseline gap-2">
      <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
      {subValue && <span className="text-sm text-zinc-600 font-medium">{subValue}</span>}
    </div>
  </div>
);

const ChartContainer = ({ title, subtitle, children, height = 300 }: any) => (
  <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm">
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 bg-emerald-500 rounded-full" />
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
    <div style={{ height }} className="w-full">
      {children}
    </div>
  </div>
);

const DCFValuation = ({ stockData }: { stockData: any }) => {
  const quote = stockData?.quote;
  const financialData = stockData?.summary?.financialData;
  const stats = stockData?.summary?.defaultKeyStatistics;

  const [inputs, setInputs] = useState({
    growthRate1to5: 0.15,
    growthRate6to10: 0.10,
    terminalGrowth: 0.02,
    discountRate: 0.10,
    fcfMargin: 0.20,
    baseRevenue: 0,
    baseFCF: 0,
  });

  // Auto-fill some defaults if data exists
  useEffect(() => {
    if (financialData?.freeCashflow && financialData?.totalRevenue) {
      const currentMargin = financialData.freeCashflow / financialData.totalRevenue;
      const revenueGrowth = financialData.revenueGrowth || 0.15;
      
      setInputs(prev => ({ 
        ...prev, 
        fcfMargin: Math.max(0.05, Math.min(0.4, currentMargin)),
        growthRate1to5: Math.max(0, Math.min(0.5, revenueGrowth)),
        growthRate6to10: Math.max(0, Math.min(0.25, revenueGrowth * 0.5)),
        baseRevenue: financialData.totalRevenue / 1000000,
        baseFCF: financialData.freeCashflow / 1000000
      }));
    }
  }, [financialData]);

  const dcfResult = useMemo(() => {
    if (!inputs.baseRevenue || !stats?.sharesOutstanding) return null;

    const revenueTTM = inputs.baseRevenue; // Now in Millions
    const { growthRate1to5, growthRate6to10, terminalGrowth, discountRate, fcfMargin, baseFCF } = inputs;
    const cash = (financialData.totalCash || 0) / 1000000; // Convert to Millions
    const debt = (financialData.totalDebt || 0) / 1000000; // Convert to Millions
    const shares = stats.sharesOutstanding;

    let currentRevenue = revenueTTM;
    let totalPV = 0;
    const projections = [];

    for (let year = 1; year <= 10; year++) {
      const growth = year <= 5 ? growthRate1to5 : growthRate6to10;
      currentRevenue *= (1 + growth);
      const fcf = currentRevenue * fcfMargin;
      const pv = fcf / Math.pow(1 + discountRate, year);
      totalPV += pv;
      projections.push({ year, revenue: currentRevenue, fcf, pv });
    }

    const lastFCF = projections[9].fcf;
    const terminalValue = (lastFCF * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
    const terminalPV = terminalValue / Math.pow(1 + discountRate, 10);
    
    const enterpriseValue = totalPV + terminalPV;
    const equityValue = enterpriseValue + cash - debt;
    const fairValue = (equityValue * 1000000) / shares; // equityValue is in Millions, shares is raw
    const marginOfSafety = ((fairValue - quote.regularMarketPrice) / fairValue) * 100;

    return { 
      fairValue, 
      enterpriseValue, 
      terminalPV, 
      totalPV, 
      projections, 
      marginOfSafety,
      equityValue,
      cash,
      debt
    };
  }, [inputs, financialData, stats, quote]);

  if (!dcfResult) return null;

  const handleInputChange = (name: string, value: string) => {
    const numValue = parseFloat(value) / 100;
    if (!isNaN(numValue)) {
      setInputs(prev => ({ ...prev, [name]: numValue }));
    }
  };

  const handleBaseValueChange = (name: string, value: string) => {
    const rawValue = value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      setInputs(prev => {
        const newInputs = { ...prev, [name]: numValue };
        // If we change base values, update the margin to match
        if (newInputs.baseRevenue > 0) {
          newInputs.fcfMargin = newInputs.baseFCF / newInputs.baseRevenue;
        }
        return newInputs;
      });
    } else if (value === '') {
      setInputs(prev => ({ ...prev, [name]: 0 }));
    }
  };

  return (
    <div className="space-y-12">
      {/* Section 1: DCF Logic Explanation */}
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
0. **基准数据**：确认标的最新一年的营收和自由现金流。
1. **预测**：预测未来 10 年公司能赚多少钱。
2. **终值**：预测 10 年后公司还能值多少钱。
3. **折现**：把未来的钱按比例缩减到今天的价值。
4. **结果**：计算每股价值并对比当前市价。`}
            </Markdown>
          </div>
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">💡 实例演示：Apple (AAPL)</h4>
          <div className="markdown-body prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
            <Markdown>
{`假设 Apple 去年产生了 $100,000M 的自由现金流。
- **基准**：确认去年营收 $383,000M，FCF $100,000M。
- **预测**：预计未来 10 年每年增长 10%，第 10 年产生约 $259,000M。
- **终值**：假设 10 年后进入永续增长，终值约 $3,000,000M。
- **折现**：用 10% 的折现率将上述金额折算回今天。
- **结论**：相加除以股数，得出合理股价。`}
            </Markdown>
          </div>
        </div>
      </div>

      {/* Section 1: Step 1 Base Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-500/20 text-zinc-400 rounded-full flex items-center justify-center font-bold text-sm border border-zinc-500/30">1</div>
            <h3 className="text-lg font-bold text-white">查询基准年财务数据 (Base Financials)</h3>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Search className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white">自动查询与手动输入</h4>
                  <button 
                    onClick={() => {
                      if (financialData?.freeCashflow && financialData?.totalRevenue) {
                        setInputs(prev => ({
                          ...prev,
                          baseRevenue: financialData.totalRevenue / 1000000,
                          baseFCF: financialData.freeCashflow / 1000000,
                          fcfMargin: financialData.freeCashflow / financialData.totalRevenue
                        }));
                      }
                    }}
                    className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 border border-indigo-500/20"
                  >
                    <Activity className="w-3 h-3" />
                    从 Stock Analysis 同步最新数据
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  系统已尝试自动从 <a href={`https://stockanalysis.com/stocks/${quote?.symbol?.toLowerCase()}/financials/`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium">Stock Analysis <ExternalLink className="w-2.5 h-2.5" /></a> 获取最新 TTM 数据。您可以直接使用自动获取的值，或在下方手动修改。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">基准年营收 (Revenue, 百万)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                <input 
                  type="text"
                  value={inputs.baseRevenue === 0 ? '' : inputs.baseRevenue.toFixed(2)}
                  onChange={(e) => handleBaseValueChange('baseRevenue', e.target.value)}
                  placeholder="输入营收 (百万)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">基准年自由现金流 (FCF, 百万)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                <input 
                  type="text"
                  value={inputs.baseFCF === 0 ? '' : inputs.baseFCF.toFixed(2)}
                  onChange={(e) => handleBaseValueChange('baseFCF', e.target.value)}
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
            <p className="text-[10px] text-zinc-500 italic">注：FCF 利润率 = 自由现金流 / 营业收入。该比例反映了公司将营收转化为真金白银的能力。</p>
          </div>
        </div>
      </div>

      {/* Section 2: Step 2 Predict FCF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-500/30">2</div>
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
                  建议参考 <a href={`https://stockanalysis.com/stocks/${quote?.symbol?.toLowerCase()}/financials/`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium">Stock Analysis 财报页 <ExternalLink className="w-2.5 h-2.5" /></a> 获取历史营收增长数据。
                </p>
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-2">
                  <span className="text-zinc-400 font-medium">默认值设定逻辑：</span><br />
                  • 1-5 年增长率：维持标的当前年度营收增长水平 ({(financialData?.revenueGrowth * 100 || 15).toFixed(1)}%)。<br />
                  • 6-10 年增长率：在 1-5 年基础上自动减少 50%（模拟企业进入成熟期后的增速放缓）。
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
                type="range" min="0" max="50" step="0.5"
                value={inputs.growthRate1to5 * 100}
                onChange={(e) => handleInputChange('growthRate1to5', e.target.value)}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 flex justify-between">
                <span>6-10 年营收增长率</span>
                <span className="text-indigo-400 font-mono">{(inputs.growthRate6to10 * 100).toFixed(1)}%</span>
              </label>
              <input 
                type="range" min="0" max="30" step="0.5"
                value={inputs.growthRate6to10 * 100}
                onChange={(e) => handleInputChange('growthRate6to10', e.target.value)}
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
                ${(inputs.baseRevenue).toFixed(1)}M × (1 + {(inputs.growthRate6to10 * 100).toFixed(1)}%)¹⁰ × {(inputs.fcfMargin * 100).toFixed(1)}% 
                = <span className="text-white">${(dcfResult.projections[9].fcf).toFixed(2)}M</span>
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

      {/* Section 3: Step 3 Terminal Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm border border-emerald-500/30">3</div>
            <h3 className="text-lg font-bold text-white">设定终值参数 (Terminal Value)</h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 flex justify-between">
                <span>永久增长率 (通常 2-3%)</span>
                <span className="text-emerald-400 font-mono">{(inputs.terminalGrowth * 100).toFixed(1)}%</span>
              </label>
              <input 
                type="range" min="0" max="5" step="0.1"
                value={inputs.terminalGrowth * 100}
                onChange={(e) => handleInputChange('terminalGrowth', e.target.value)}
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
                终值 (TV) = <span className="text-white">${((dcfResult.terminalPV * Math.pow(1 + inputs.discountRate, 10))).toFixed(2)}M</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Step 4 Discount Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-bold text-sm border border-amber-500/30">4</div>
            <h3 className="text-lg font-bold text-white">设定折现率 (Discount Rate)</h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 flex justify-between">
                <span>折现率 (WACC/期望回报率)</span>
                <span className="text-amber-400 font-mono">{(inputs.discountRate * 100).toFixed(1)}%</span>
              </label>
              <input 
                type="range" min="5" max="20" step="0.5"
                value={inputs.discountRate * 100}
                onChange={(e) => handleInputChange('discountRate', e.target.value)}
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
                <p className="text-sm font-bold text-white font-mono">${(dcfResult.totalPV).toFixed(2)}M</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase">终值现值</p>
                <p className="text-sm font-bold text-white font-mono">${(dcfResult.terminalPV).toFixed(2)}M</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Step 5 Final Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center font-bold text-sm border border-rose-500/30">5</div>
            <h3 className="text-lg font-bold text-white">财务调整与股权价值</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-500">企业价值 (EV)</span>
              <span className="text-sm font-bold text-white font-mono">${(dcfResult.enterpriseValue).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-500">(+) 现金及投资</span>
              <span className="text-sm font-bold text-emerald-500 font-mono">+${(dcfResult.cash).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-500">(-) 总负债</span>
              <span className="text-sm font-bold text-rose-500 font-mono">-${(dcfResult.debt).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <span className="text-xs text-indigo-300 font-bold">股权价值</span>
              <span className="text-sm font-bold text-indigo-400 font-mono">${(dcfResult.equityValue).toFixed(2)}M</span>
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
                ${(dcfResult.equityValue).toFixed(2)}M / {(stats.sharesOutstanding / 1e6).toFixed(2)}M 股 
                = <span className="text-white font-bold">${dcfResult.fairValue.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <div className={cn(
            "mt-8 px-8 py-4 rounded-3xl flex flex-col items-center w-full",
            dcfResult.marginOfSafety > 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"
          )}>
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">安全边际 (Margin of Safety)</p>
            <p className={cn("text-3xl font-bold font-mono", dcfResult.marginOfSafety > 0 ? "text-emerald-500" : "text-rose-500")}>
              {dcfResult.marginOfSafety.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


