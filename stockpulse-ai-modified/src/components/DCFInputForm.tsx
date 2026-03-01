import { useState, useEffect } from 'react';
import type { DCFInputData } from '@/types/dcf';
import { DEFAULT_INPUT_DATA } from '@/types/dcf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, RotateCcw, Info, Search, Building2, Globe, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { ALL_STOCKS, findStockByCode, convertToDCFInput, STOCKS_BY_MARKET } from '@/lib/stockData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DCFInputFormProps {
  onCalculate: (data: DCFInputData) => void;
  onReset: () => void;
}

export function DCFInputForm({ onCalculate, onReset }: DCFInputFormProps) {
  const [data, setData] = useState<DCFInputData>(DEFAULT_INPUT_DATA);
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastFetchedTicker, setLastFetchedTicker] = useState('');
  const [lastFetchedMarket, setLastFetchedMarket] = useState<'US' | 'HK' | 'CN'>('US');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'US' | 'HK' | 'CN'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [revenueGrowthRates, setRevenueGrowthRates] = useState<number[]>([]);

  // 组件挂载时默认加载 Apple 数据
  useEffect(() => {
    setTicker('AAPL');
    // 设置永续增长率默认值为 3%
    handleChange('terminalGrowthRate', 3);
    fetchStockDataFromAPI('AAPL');
  }, []);

  const handleChange = (field: keyof DCFInputData, value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // 根据市场类型生成财务数据链接
  const getFinancialDataUrl = (symbol: string, market: 'US' | 'HK' | 'CN'): string => {
    const cleanSymbol = symbol.replace(/\.HK$|\.SS$|\.SZ$/g, '');
    
    switch (market) {
      case 'HK':
        // 港股使用 Stock Analysis 的 HK 格式
        return `https://stockanalysis.com/quote/hkg/${cleanSymbol}/financials/`;
      case 'CN':
        // A股使用东方财富
        if (symbol.endsWith('.SS')) {
          return `https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/Index?type=web&code=SH${cleanSymbol}`;
        } else {
          return `https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/Index?type=web&code=SZ${cleanSymbol}`;
        }
      case 'US':
      default:
        // 美股使用 Stock Analysis
        return `https://stockanalysis.com/stocks/${cleanSymbol.toLowerCase()}/financials/`;
    }
  };

  // 从API获取实时财务数据
  const fetchStockDataFromAPI = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stock/financials/${code}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '获取数据失败');
      }
      
      const stockData = result.data;
      
      setData(prev => ({
        ...prev,
        currentFCF: stockData.currentFCF,
        cashAndEquivalents: stockData.cashAndEquivalents,
        totalDebt: stockData.totalDebt,
        sharesOutstanding: stockData.sharesOutstanding,
        currentPrice: stockData.currentPrice,
        discountRate: stockData.wacc || 10, // 使用 API 返回的 WACC
        currency: stockData.currency || 'USD', // 保存货币信息
      }));
      
      // 设置 Revenue Growth 收入增长率数据，并自动计算前5年增长率（取最近一年）
      if (stockData.revenueGrowthRates && stockData.revenueGrowthRates.length > 0) {
        setRevenueGrowthRates(stockData.revenueGrowthRates);
        // 取最近一年的 Revenue Growth 作为前5年增长率默认值
        const latestGrowthRate = Math.round(stockData.revenueGrowthRates[0]);
        // 第6-10年增长率在前5年基础上减少20%
        const years6to10Rate = Math.round(latestGrowthRate * 0.8);
        handleChange('growthRateYears1to5', latestGrowthRate);
        handleChange('growthRateYears6to10', years6to10Rate);
      }
      
      setCompanyName(stockData.name);
      setLastFetchedTicker(stockData.symbol);
      // 确保 market 值有效，默认为 US
      const market = stockData.market === 'HK' ? 'HK' : stockData.market === 'CN' ? 'CN' : 'US';
      setLastFetchedMarket(market);
      console.log(`[Debug] Stock: ${stockData.symbol}, Market: ${market}, API market: ${stockData.market}`);
      
      toast.success(`已加载 ${stockData.name} 的实时财务数据`);
    } catch (error: any) {
      console.error('获取实时数据失败:', error);
      toast.error(`获取实时数据失败: ${error.message}，尝试使用预设数据`);
      
      // 如果API失败，使用预设数据
      const stock = findStockByCode(code);
      if (stock) {
        const dcfData = convertToDCFInput(stock);
        setData(prev => ({ ...prev, ...dcfData }));
        setCompanyName(stock.name);
        setLastFetchedTicker(stock.code);
        setLastFetchedMarket(stock.market === 'CN' ? 'CN' : stock.market === 'HK' ? 'HK' : 'US');
        toast.info(`已加载 ${stock.name} 的预设数据`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchStockData = async () => {
    if (!ticker.trim()) {
      toast.error('请输入股票代码');
      return;
    }
    
    // 重置估值结果
    onReset();
    
    await fetchStockDataFromAPI(ticker.trim().toUpperCase());
  };

  const selectStock = async (code: string) => {
    setTicker(code);
    // 重置估值结果
    onReset();
    await fetchStockDataFromAPI(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(data);
  };

  const handleReset = () => {
    setData(DEFAULT_INPUT_DATA);
    setTicker('');
    setCompanyName('');
    setLastFetchedTicker('');
    setRevenueGrowthRates([]);
    onReset();
  };

  const getFilteredStocks = () => {
    if (selectedMarket === 'ALL') return ALL_STOCKS;
    return STOCKS_BY_MARKET[selectedMarket] || [];
  };

  const getMarketLabel = (market: string) => {
    switch (market) {
      case 'US': return '美股';
      case 'HK': return '港股';
      case 'CN': return 'A股';
      default: return market;
    }
  };

  const getMarketBadgeColor = (market: string) => {
    switch (market) {
      case 'US': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'HK': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'CN': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const inputField = (
    label: string,
    field: keyof DCFInputData,
    unit: string = '百万元',
    tooltip: string = '',
    step: string = '0.01'
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field} className="text-sm font-medium text-zinc-400">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-zinc-600 cursor-help hover:text-zinc-400" />
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        <Input
          id={field}
          type="number"
          step={step}
          value={data[field]}
          onChange={(e) => handleChange(field, parseFloat(e.target.value) || 0)}
          className="pr-12 bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
          {unit}
        </span>
      </div>
    </div>
  );

  // 滑块输入组件
  const sliderField = (
    label: string,
    field: keyof DCFInputData,
    min: number,
    max: number,
    step: number,
    tooltip: string
  ) => (
    <div className="space-y-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-zinc-300">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-zinc-600 cursor-help hover:text-zinc-400" />
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-lg font-bold text-emerald-500">
          {data[field]}<span className="text-sm text-zinc-500 ml-0.5">%</span>
        </span>
      </div>
      <Slider
        value={[data[field] as number]}
        onValueChange={([value]) => handleChange(field, value)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Calculator className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">DCF估值参数输入</h2>
            <p className="text-sm text-zinc-500">选择股票自动加载财务数据，或手动输入参数</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 股票代码查询 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              选择股票
            </h3>
            
            {/* 股票代码输入 */}
            <div className="space-y-2">
              <Label htmlFor="ticker" className="text-sm font-medium text-zinc-400">
                股票代码
              </Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    id="ticker"
                    type="text"
                    placeholder="输入代码如 AAPL 或从下方选择"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchStockData())}
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500/50"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleFetchStockData}
                  disabled={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? '查询中...' : '查询'}
                </Button>
              </div>
            </div>

            {/* 市场筛选 */}
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'US', 'HK', 'CN'] as const).map((market) => (
                <Button
                  key={market}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMarket(market)}
                  className={cn(
                    "border-zinc-800",
                    selectedMarket === market 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  {market === 'ALL' && <Globe className="h-3 w-3 mr-1" />}
                  {market !== 'ALL' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {market === 'ALL' ? '全部' : market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股'}
                </Button>
              ))}
            </div>

            {/* 股票列表 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-400">
                热门股票 ({getFilteredStocks().length}只)
              </Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                {getFilteredStocks().map((stock) => (
                  <button
                    key={stock.code}
                    type="button"
                    onClick={() => selectStock(stock.code)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5",
                      lastFetchedTicker === stock.code
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    )}
                  >
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${getMarketBadgeColor(stock.market)}`}>
                      {getMarketLabel(stock.market)}
                    </Badge>
                    <span className="font-medium">{stock.code}</span>
                    <span className="text-zinc-600">{stock.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 查询结果提示 */}
            {companyName && lastFetchedTicker && (
              <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {lastFetchedTicker}
                  </Badge>
                  <span className="font-medium text-emerald-400">{companyName}</span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  财务数据已自动填充，请检查并调整增长率假设
                </p>
              </div>
            )}
          </div>

          {/* 基础财务数据 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-lg font-semibold text-white">基础财务数据</h3>
              {lastFetchedTicker && (
                <a
                  href={getFinancialDataUrl(lastFetchedTicker, lastFetchedMarket)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  查看 {lastFetchedTicker} 财务数据
                  <span className="text-zinc-500 ml-1">
                    ({lastFetchedMarket === 'US' ? 'Stock Analysis' : lastFetchedMarket === 'HK' ? 'Stock Analysis' : '东方财富'})
                  </span>
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inputField(
                '当前年度自由现金流 (FCF)',
                'currentFCF',
                '百万元',
                '公司最近一个财年的自由现金流，可通过经营活动现金流减去资本支出计算得出'
              )}
              {inputField(
                '现金及现金等价物',
                'cashAndEquivalents',
                '百万元',
                '公司资产负债表上的现金、银行存款和短期投资'
              )}
              {inputField(
                '总负债',
                'totalDebt',
                '百万元',
                '公司有息负债总额，包括短期借款和长期借款'
              )}
              {inputField(
                '总股本',
                'sharesOutstanding',
                '百万股',
                '公司发行在外的普通股总数'
              )}
              {inputField(
                '当前股价',
                'currentPrice',
                '元',
                '股票当前市场交易价格，用于比较估值结果',
                '0.01'
              )}
            </div>
          </div>

          {/* 增长率假设 */}
          <div className="space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h3 className="text-lg font-semibold text-white">增长率假设</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                请预估未来自由现金流（FCF）增长率：第1-5年为高速增长期，第6-10年为放缓增长期
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 前5年增长率 - 带历史数据显示 */}
              <div className="space-y-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-zinc-300">前5年增长率</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-zinc-600 cursor-help hover:text-zinc-400" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                          <p className="max-w-xs text-xs">预测期内前5年的自由现金流年化增长率，通常参考行业增长和公司历史表现（建议5-30%，极端情况可达50-100%）</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-lg font-bold text-emerald-500">
                    {data.growthRateYears1to5}<span className="text-sm text-zinc-500 ml-0.5">%</span>
                  </span>
                </div>
                
                {/* 显示最近5年 Revenue Growth 收入增长率 */}
                {revenueGrowthRates.length > 0 && (
                  <div className="bg-zinc-950/50 rounded-lg px-3 py-2 border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 mb-1">最近5年收入增长率 Revenue Growth（Stock Analysis）</p>

                    <div className="flex items-center gap-2">
                      {revenueGrowthRates.map((rate, index) => (
                        <span 
                          key={index} 
                          className={`text-[11px] font-medium ${rate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                        >
                          {rate >= 0 ? '+' : ''}{rate}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <Slider
                  value={[data.growthRateYears1to5]}
                  onValueChange={([value]) => {
                    handleChange('growthRateYears1to5', value);
                    // 第6-10年增长率在前5年基准值上减少20%（即前5年的80%）
                    handleChange('growthRateYears6to10', Math.round(value * 0.8));
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              {sliderField(
                '第6-10年增长率',
                'growthRateYears6to10',
                0,
                100,
                1,
                '预测期第6-10年的增长率，自动设为前5年增长率的80%（减少20%），反映增长放缓'
              )}
              {/* 永续增长率 - 可修改，默认 3% */}
              {sliderField(
                '永续增长率',
                'terminalGrowthRate',
                0,
                5,
                0.5,
                '预测期结束后的长期永续增长率，默认 3%，接近 GDP 增长率水平（建议 2-3%）'
              )}
              {sliderField(
                '折现率 (WACC)',
                'discountRate',
                5,
                20,
                0.5,
                '加权平均资本成本(WACC)：美股默认10%，港股默认12%，A股默认8%。可根据公司风险程度调整。'
              )}
            </div>
          </div>

          {/* 预测期设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">预测设置</h3>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-400">预测期年数</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleChange('projectionYears', 5)}
                  className={cn(
                    "border-zinc-800",
                    data.projectionYears === 5 
                      ? 'bg-emerald-500 text-black hover:bg-emerald-600' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  5年
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleChange('projectionYears', 10)}
                  className={cn(
                    "border-zinc-800",
                    data.projectionYears === 10 
                      ? 'bg-emerald-500 text-black hover:bg-emerald-600' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  10年
                </Button>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 text-base"
            >
              <Calculator className="h-5 w-5 mr-2" />
              开始计算DCF估值
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="px-6 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              重置
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
