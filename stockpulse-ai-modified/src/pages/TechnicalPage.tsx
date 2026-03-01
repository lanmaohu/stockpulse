import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, BarChart3, LineChart, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChartContainer } from '@/components/technical/ChartContainer';
import {
  calculateSMA,
  calculateMACD,
  calculateRSI,
  generateSignals,
  type CandleData,
} from '@/lib/indicators';

export type TimePeriod = '1d' | '1wk' | '1mo';

// 生成模拟 K 线数据
function generateMockCandles(symbol: string): CandleData[] {
  const candles: CandleData[] = [];
  const basePrice = symbol.includes('AAPL') ? 220 : symbol.includes('0700') ? 380 : 150;
  let price = basePrice;
  
  const now = new Date();
  for (let i = 100; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.48) * price * 0.03;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.01;
    const low = Math.min(open, close) - Math.random() * price * 0.01;
    const volume = Math.floor(Math.random() * 10000000) + 5000000;
    
    candles.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
    
    price = close;
  }
  
  return candles;
}

export function TechnicalPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [period, setPeriod] = useState<TimePeriod>('1d');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('Apple Inc.');

  // 指标开关
  const [showMA, setShowMA] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  // 初始加载
  useEffect(() => {
    loadData('AAPL', '1d');
  }, []);

  const loadData = async (sym: string, per: TimePeriod) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock/historical/${sym}?period=${per}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCandles(result.data.candles);
          setName(result.data.name);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('API failed, using mock data');
    }
    
    // 使用模拟数据
    setCandles(generateMockCandles(sym));
    setName(sym);
    setLoading(false);
  };

  // 计算指标
  const { ma5, ma10, ma20, ma60, macd, rsi, signals } = useMemo(() => {
    if (candles.length === 0) {
      return { ma5: [], ma10: [], ma20: [], ma60: [], macd: null, rsi: [], signals: [] };
    }

    const closes = candles.map(c => c.close);

    // MA
    const ma5 = showMA ? calculateSMA(closes, 5) : [];
    const ma10 = showMA ? calculateSMA(closes, 10) : [];
    const ma20 = showMA ? calculateSMA(closes, 20) : [];
    const ma60 = showMA ? calculateSMA(closes, 60) : [];

    // MACD
    const macd = showMACD ? calculateMACD(closes) : null;

    // RSI
    const rsi = showRSI ? calculateRSI(closes, 14) : [];

    // 生成信号
    const signals = generateSignals(
      candles,
      closes[closes.length - 1],
      ma5,
      ma20,
      rsi,
      macd || { dif: [], dea: [], macd: [] }
    );

    return { ma5, ma10, ma20, ma60, macd, rsi, signals };
  }, [candles, showMA, showMACD, showRSI]);

  const handleSearch = () => {
    if (!inputValue.trim()) {
      toast.error('请输入股票代码');
      return;
    }
    setSymbol(inputValue.toUpperCase());
    loadData(inputValue.toUpperCase(), period);
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    loadData(symbol, newPeriod);
  };

  const market = symbol.endsWith('.HK') ? 'HK' : symbol.endsWith('.SS') || symbol.endsWith('.SZ') ? 'CN' : 'US';
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
  const change = currentPrice > 0 ? ((currentPrice - prevClose) / prevClose * 100) : 0;
  const isUp = change >= 0;

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-bold text-white">技术面分析</h1>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm text-zinc-500">K线、指标、交易信号</span>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* 搜索栏 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入股票代码 (如: AAPL, 0700.HK)"
                className="bg-zinc-900 border-zinc-800 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-black">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                查询
              </Button>
            </div>

            <Tabs value={period} onValueChange={(v) => handlePeriodChange(v as TimePeriod)}>
              <TabsList className="bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="1d" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">日线</TabsTrigger>
                <TabsTrigger value="1wk" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">周线</TabsTrigger>
                <TabsTrigger value="1mo" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black">月线</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 指标开关 */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-zinc-900">
            <div className="flex items-center gap-2">
              <Switch id="ma" checked={showMA} onCheckedChange={setShowMA} />
              <Label htmlFor="ma" className="text-sm text-zinc-400">MA均线</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="macd" checked={showMACD} onCheckedChange={setShowMACD} />
              <Label htmlFor="macd" className="text-sm text-zinc-400">MACD</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="rsi" checked={showRSI} onCheckedChange={setShowRSI} />
              <Label htmlFor="rsi" className="text-sm text-zinc-400">RSI</Label>
            </div>
          </div>
        </div>

        {/* 股票信息 */}
        {symbol && candles.length > 0 && (
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{name || symbol}</h2>
            <Badge variant="outline" className={cn(
              market === 'US' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              market === 'HK' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            )}>
              {market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}
            </Badge>
            <span className="text-2xl font-mono text-white">${currentPrice.toFixed(2)}</span>
            <span className={cn(
              "text-sm flex items-center gap-1",
              isUp ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}

        {/* 图表区域 */}
        {candles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 主图 */}
            <div className="lg:col-span-3 space-y-4">
              {/* K线主图 */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <LineChart className="w-4 h-4" />
                    K线图
                    {showMA && (
                      <span className="flex gap-2 text-[10px]">
                        <span className="text-amber-400">MA5</span>
                        <span className="text-blue-400">MA10</span>
                        <span className="text-purple-400">MA20</span>
                        <span className="text-pink-400">MA60</span>
                      </span>
                    )}
                  </h3>
                </div>
                <ChartContainer
                  candles={candles}
                  ma5={showMA ? ma5 : undefined}
                  ma10={showMA ? ma10 : undefined}
                  ma20={showMA ? ma20 : undefined}
                  ma60={showMA ? ma60 : undefined}
                  height={450}
                />
              </div>

              {/* 副图指标 */}
              {showMACD && macd && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">MACD</h3>
                  <div className="h-32 flex items-center justify-center text-zinc-500 text-sm">
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="text-xs text-zinc-500">DIF</div>
                        <div className={cn(
                          "text-lg font-mono",
                          macd.dif[macd.dif.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {macd.dif[macd.dif.length - 1]?.toFixed(3) || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">DEA</div>
                        <div className={cn(
                          "text-lg font-mono",
                          macd.dea[macd.dea.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {macd.dea[macd.dea.length - 1]?.toFixed(3) || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">MACD</div>
                        <div className={cn(
                          "text-lg font-mono",
                          macd.macd[macd.macd.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {macd.macd[macd.macd.length - 1]?.toFixed(3) || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showRSI && rsi.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">RSI (14)</h3>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "text-3xl font-mono",
                      rsi[rsi.length - 1] > 70 ? 'text-rose-400' :
                      rsi[rsi.length - 1] < 30 ? 'text-emerald-400' :
                      'text-zinc-300'
                    )}>
                      {rsi[rsi.length - 1]?.toFixed(1) || '-'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {rsi[rsi.length - 1] > 70 ? '超买区域' :
                       rsi[rsi.length - 1] < 30 ? '超卖区域' :
                       '正常区间'}
                    </div>
                  </div>
                  {/* RSI 进度条 */}
                  <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        rsi[rsi.length - 1] > 70 ? 'bg-rose-500' :
                        rsi[rsi.length - 1] < 30 ? 'bg-emerald-500' :
                        'bg-blue-500'
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, rsi[rsi.length - 1]))}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
                    <span>0</span>
                    <span>30</span>
                    <span>50</span>
                    <span>70</span>
                    <span>100</span>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧信息栏 */}
            <div className="space-y-4">
              {/* 交易信号 */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <h4 className="text-xs text-zinc-500 mb-3 flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  交易信号
                </h4>
                {signals.length === 0 ? (
                  <div className="text-sm text-zinc-500 py-4 text-center">暂无明确信号</div>
                ) : (
                  <div className="space-y-2">
                    {signals.map((signal, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-xl text-sm",
                          signal.type === 'buy' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                            : 'bg-rose-500/10 border border-rose-500/20'
                        )}
                      >
                        <div className={cn(
                          "font-medium mb-1",
                          signal.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {signal.indicator} · {signal.type === 'buy' ? '买入' : '卖出'}信号
                        </div>
                        <div className="text-zinc-400 text-xs">{signal.message}</div>
                        <div className="mt-2 text-[10px] text-zinc-500">强度: {signal.strength}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 指标数值 */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <h4 className="text-xs text-zinc-500 mb-3">指标数值</h4>
                <div className="space-y-3 text-sm">
                  {showMA && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 text-xs">MA5</span>
                        <span className="font-mono text-zinc-300">{ma5[ma5.length - 1]?.toFixed(2) || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400 text-xs">MA10</span>
                        <span className="font-mono text-zinc-300">{ma10[ma10.length - 1]?.toFixed(2) || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-400 text-xs">MA20</span>
                        <span className="font-mono text-zinc-300">{ma20[ma20.length - 1]?.toFixed(2) || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-pink-400 text-xs">MA60</span>
                        <span className="font-mono text-zinc-300">{ma60[ma60.length - 1]?.toFixed(2) || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 数据概览 */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <h4 className="text-xs text-zinc-500 mb-3">数据概览</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">数据点数</span>
                    <span className="text-zinc-300">{candles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">最高价</span>
                    <span className="text-emerald-400">${Math.max(...candles.map(c => c.high)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">最低价</span>
                    <span className="text-rose-400">${Math.min(...candles.map(c => c.low)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">平均成交量</span>
                    <span className="text-zinc-300">{(candles.reduce((sum, c) => sum + c.volume, 0) / candles.length / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && candles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Activity className="w-16 h-16 mb-4 opacity-50" />
            <p>输入股票代码查看技术面分析</p>
            <p className="text-sm mt-2">支持美股 (AAPL)、港股 (0700.HK)</p>
          </div>
        )}
      </div>
    </div>
  );
}
