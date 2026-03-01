import { useState, useEffect } from 'react';
import { Search, Loader2, BarChart3, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type TimePeriod = '1d' | '1wk' | '1mo';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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

  // 初始加载
  useEffect(() => {
    loadData('AAPL', '1d');
  }, []);

  const loadData = async (sym: string, per: TimePeriod) => {
    setLoading(true);
    try {
      // 尝试从 API 获取
      const response = await fetch(`/api/stock/historical/${sym}?period=${per}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCandles(result.data.candles);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('API failed, using mock data');
    }
    
    // 使用模拟数据
    setCandles(generateMockCandles(sym));
    setLoading(false);
  };

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
  const change = ((currentPrice - prevClose) / prevClose * 100).toFixed(2);

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
        </div>

        {/* 股票信息 */}
        {symbol && (
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
            <Badge variant="outline" className={cn(
              market === 'US' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              market === 'HK' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            )}>
              {market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}
            </Badge>
            {currentPrice > 0 && (
              <>
                <span className="text-2xl font-mono text-white">${currentPrice.toFixed(2)}</span>
                <span className={cn(
                  "text-sm",
                  parseFloat(change) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {parseFloat(change) >= 0 ? '+' : ''}{change}%
                </span>
              </>
            )}
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

        {/* 提示 */}
        <div className="text-center text-zinc-500 text-sm">
          <p>技术面分析页面正在开发中...</p>
          <p className="mt-2">当前显示 {candles.length} 条模拟数据</p>
        </div>
      </div>
    </div>
  );
}
