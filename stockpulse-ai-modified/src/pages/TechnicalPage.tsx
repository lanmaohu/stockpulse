import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, TrendingDown, Activity, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
    const high = Math.max(open, close) + Math.random() * price * 0.015;
    const low = Math.min(open, close) - Math.random() * price * 0.015;
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

// 简单的 K 线图表组件（含成交量）
function SimpleChart({ candles, ma5, ma20 }: { candles: CandleData[]; ma5?: number[]; ma20?: number[] }) {
  if (candles.length === 0) return null;
  
  const width = 800;
  const chartHeight = 280;
  const volumeHeight = 100;
  const gap = 20;
  const totalHeight = chartHeight + volumeHeight + gap;
  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  
  const plotWidth = width - padding.left - padding.right;
  
  // 价格范围
  const prices = candles.map(c => [c.high, c.low, c.open, c.close]).flat();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  // 成交量范围
  const maxVolume = Math.max(...candles.map(c => c.volume));
  
  const xScale = plotWidth / candles.length;
  const priceYScale = (chartHeight - padding.top - padding.bottom) / priceRange;
  const volumeYScale = (volumeHeight - 20) / maxVolume;
  
  const priceToY = (price: number) => chartHeight - padding.bottom - (price - minPrice) * priceYScale;
  const volumeToY = (vol: number) => totalHeight - 10 - vol * volumeYScale;
  const indexToX = (i: number) => padding.left + i * xScale + xScale / 2;
  
  // 格式化成交量
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
  };
  
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={totalHeight} className="bg-zinc-950">
        {/* ===== 价格图表区域 ===== */}
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding.top + t * (chartHeight - padding.top - padding.bottom);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#27272a"
                strokeWidth={1}
              />
              <text
                x={width - padding.right + 5}
                y={y + 4}
                fill="#71717a"
                fontSize={10}
              >
                {(maxPrice - t * priceRange).toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* K线 */}
        {candles.map((c, i) => {
          const x = indexToX(i);
          const yOpen = priceToY(c.open);
          const yClose = priceToY(c.close);
          const yHigh = priceToY(c.high);
          const yLow = priceToY(c.low);
          const isUp = c.close >= c.open;
          const color = isUp ? '#22c55e' : '#ef4444';
          
          return (
            <g key={`candle-${i}`}>
              {/* 影线 */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={color}
                strokeWidth={1}
              />
              {/* 实体 */}
              <rect
                x={x - xScale * 0.35}
                y={Math.min(yOpen, yClose)}
                width={xScale * 0.7}
                height={Math.max(Math.abs(yClose - yOpen), 1)}
                fill={color}
              />
            </g>
          );
        })}
        
        {/* MA5 */}
        {ma5 && ma5.some(v => !isNaN(v)) && (
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.5}
            points={ma5.map((v, i) => !isNaN(v) ? `${indexToX(i)},${priceToY(v)}` : '').filter(Boolean).join(' ')}
          />
        )}
        
        {/* MA20 */}
        {ma20 && ma20.some(v => !isNaN(v)) && (
          <polyline
            fill="none"
            stroke="#a855f7"
            strokeWidth={1.5}
            points={ma20.map((v, i) => !isNaN(v) ? `${indexToX(i)},${priceToY(v)}` : '').filter(Boolean).join(' ')}
          />
        )}
        
        {/* ===== 分隔线 ===== */}
        <line
          x1={padding.left}
          y1={chartHeight}
          x2={width - padding.right}
          y2={chartHeight}
          stroke="#3f3f46"
          strokeWidth={1}
        />
        
        {/* ===== 成交量图表区域 ===== */}
        {/* 成交量网格线 */}
        <line
          x1={padding.left}
          y1={chartHeight + gap + (volumeHeight - 20) / 2}
          x2={width - padding.right}
          y2={chartHeight + gap + (volumeHeight - 20) / 2}
          stroke="#27272a"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        
        {/* 成交量柱状图 */}
        {candles.map((c, i) => {
          const x = indexToX(i);
          const isUp = c.close >= c.open;
          const color = isUp ? '#22c55e' : '#ef4444';
          const barHeight = c.volume * volumeYScale;
          const y = totalHeight - 10 - barHeight;
          
          return (
            <rect
              key={`vol-${i}`}
              x={x - xScale * 0.4}
              y={y}
              width={xScale * 0.8}
              height={barHeight}
              fill={color}
              opacity={0.6}
            />
          );
        })}
        
        {/* 成交量刻度 */}
        <text x={width - padding.right + 5} y={chartHeight + gap + 10} fill="#71717a" fontSize={10}>
          {formatVolume(maxVolume)}
        </text>
        <text x={width - padding.right + 5} y={totalHeight - 5} fill="#71717a" fontSize={10}>
          0
        </text>
        
        {/* 成交量标签 */}
        <text x={padding.left} y={totalHeight - 5} fill="#71717a" fontSize={11}>
          成交量
        </text>
      </svg>
    </div>
  );
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
    const ma5 = showMA ? calculateSMA(closes, 5) : [];
    const ma10 = showMA ? calculateSMA(closes, 10) : [];
    const ma20 = showMA ? calculateSMA(closes, 20) : [];
    const ma60 = showMA ? calculateSMA(closes, 60) : [];
    const macd = showMACD ? calculateMACD(closes) : null;
    const rsi = showRSI ? calculateRSI(closes, 14) : [];
    const signals = generateSignals(candles, closes[closes.length - 1], ma5, ma20, rsi, macd || { dif: [], dea: [], macd: [] });

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

        {/* K线图 */}
        {candles.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                K线 & 成交量
                {showMA && (
                  <span className="flex gap-2 text-[10px]">
                    <span className="text-amber-400">MA5</span>
                    <span className="text-purple-400">MA20</span>
                  </span>
                )}
              </h3>
            </div>
            <SimpleChart candles={candles} ma5={showMA ? ma5 : undefined} ma20={showMA ? ma20 : undefined} />
          </div>
        )}

        {/* 指标和信号 */}
        {candles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MACD */}
            {showMACD && macd && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">MACD</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-zinc-500">DIF</div>
                    <div className={cn("text-lg font-mono", macd.dif[macd.dif.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {macd.dif[macd.dif.length - 1]?.toFixed(2) || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">DEA</div>
                    <div className={cn("text-lg font-mono", macd.dea[macd.dea.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {macd.dea[macd.dea.length - 1]?.toFixed(2) || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">MACD</div>
                    <div className={cn("text-lg font-mono", macd.macd[macd.macd.length - 1] > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {macd.macd[macd.macd.length - 1]?.toFixed(2) || '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RSI */}
            {showRSI && rsi.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">RSI (14)</h3>
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
                    {rsi[rsi.length - 1] > 70 ? '超买区域 ⚠️' :
                     rsi[rsi.length - 1] < 30 ? '超卖区域 ✅' :
                     '正常区间'}
                  </div>
                </div>
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
              </div>
            )}

            {/* 交易信号 */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                交易信号
              </h3>
              {signals.length === 0 ? (
                <div className="text-sm text-zinc-500 py-4 text-center">暂无明确信号</div>
              ) : (
                <div className="space-y-2">
                  {signals.slice(0, 2).map((signal, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-2 rounded-lg text-xs",
                        signal.type === 'buy' 
                          ? 'bg-emerald-500/10 border border-emerald-500/20' 
                          : 'bg-rose-500/10 border border-rose-500/20'
                      )}
                    >
                      <div className={cn("font-medium", signal.type === 'buy' ? 'text-emerald-400' : 'text-rose-400')}>
                        {signal.indicator} · {signal.type === 'buy' ? '买入' : '卖出'}
                      </div>
                      <div className="text-zinc-400 mt-1">{signal.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 数据表格 */}
        {candles.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 overflow-x-auto">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">最近10日数据</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 text-zinc-500">日期</th>
                  <th className="text-right py-2 text-zinc-500">开盘</th>
                  <th className="text-right py-2 text-zinc-500">最高</th>
                  <th className="text-right py-2 text-zinc-500">最低</th>
                  <th className="text-right py-2 text-zinc-500">收盘</th>
                  <th className="text-right py-2 text-zinc-500">成交量</th>
                </tr>
              </thead>
              <tbody>
                {candles.slice(-10).reverse().map((c, i) => (
                  <tr key={i} className="border-b border-zinc-900/50">
                    <td className="py-2 text-zinc-400">{c.time}</td>
                    <td className="py-2 text-right text-zinc-300">{c.open.toFixed(2)}</td>
                    <td className="py-2 text-right text-emerald-400">{c.high.toFixed(2)}</td>
                    <td className="py-2 text-right text-rose-400">{c.low.toFixed(2)}</td>
                    <td className={cn(
                      "py-2 text-right font-medium",
                      c.close >= c.open ? 'text-emerald-400' : 'text-rose-400'
                    )}>{c.close.toFixed(2)}</td>
                    <td className="py-2 text-right text-zinc-500">{(c.volume / 1000000).toFixed(2)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
