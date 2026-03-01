import { useState } from 'react';
import type { DCFInputData } from '@/types/dcf';
import { DEFAULT_INPUT_DATA } from '@/types/dcf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, RotateCcw, Info, Search, Building2, Globe, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ALL_STOCKS, findStockByCode, convertToDCFInput, STOCKS_BY_MARKET } from '@/lib/stockData';
import { toast } from 'sonner';

interface DCFInputFormProps {
  onCalculate: (data: DCFInputData) => void;
  onReset: () => void;
}

export function DCFInputForm({ onCalculate, onReset }: DCFInputFormProps) {
  const [data, setData] = useState<DCFInputData>(DEFAULT_INPUT_DATA);
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastFetchedTicker, setLastFetchedTicker] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'US' | 'HK' | 'CN'>('ALL');

  const handleChange = (field: keyof DCFInputData, value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleFetchStockData = () => {
    if (!ticker.trim()) {
      toast.error('请输入股票代码');
      return;
    }

    const stock = findStockByCode(ticker.trim());
    
    if (stock) {
      const dcfData = convertToDCFInput(stock);
      
      setData(prev => ({
        ...prev,
        ...dcfData,
      }));
      
      setCompanyName(stock.name);
      setLastFetchedTicker(stock.code);
      
      toast.success(`已加载 ${stock.name} 的财务数据`);
    } else {
      toast.error(`未找到股票 ${ticker}，请从下方列表选择`);
    }
  };

  const selectStock = (code: string) => {
    const stock = findStockByCode(code);
    if (stock) {
      setTicker(stock.code);
      const dcfData = convertToDCFInput(stock);
      setData(prev => ({
        ...prev,
        ...dcfData,
      }));
      setCompanyName(stock.name);
      setLastFetchedTicker(stock.code);
      toast.success(`已加载 ${stock.name} 的财务数据`);
    }
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

  const getMarketColor = (market: string) => {
    switch (market) {
      case 'US': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'HK': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'CN': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const inputField = (
    label: string,
    field: keyof DCFInputData,
    unit: string = '亿元',
    tooltip: string = '',
    step: string = '0.01'
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field} className="text-sm font-medium text-slate-700">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
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
          className="pr-12 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          {unit}
        </span>
      </div>
    </div>
  );

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          DCF估值参数输入
        </CardTitle>
        <CardDescription className="text-blue-100">
          选择股票自动加载财务数据，或手动输入参数
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 股票代码查询 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              选择股票
            </h3>
            
            {/* 股票代码输入 */}
            <div className="space-y-2">
              <Label htmlFor="ticker" className="text-sm font-medium text-slate-700">
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
                    className="pr-4 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleFetchStockData}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  查询
                </Button>
              </div>
            </div>

            {/* 市场筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedMarket === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('ALL')}
                className={selectedMarket === 'ALL' ? 'bg-slate-700' : ''}
              >
                <Globe className="h-3 w-3 mr-1" />
                全部
              </Button>
              <Button
                type="button"
                variant={selectedMarket === 'US' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('US')}
                className={selectedMarket === 'US' ? 'bg-blue-600' : ''}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                美股
              </Button>
              <Button
                type="button"
                variant={selectedMarket === 'HK' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('HK')}
                className={selectedMarket === 'HK' ? 'bg-purple-600' : ''}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                港股
              </Button>
              <Button
                type="button"
                variant={selectedMarket === 'CN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('CN')}
                className={selectedMarket === 'CN' ? 'bg-emerald-600' : ''}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                A股
              </Button>
            </div>

            {/* 股票列表 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                热门股票 ({getFilteredStocks().length}只)
              </Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {getFilteredStocks().map((stock) => (
                  <button
                    key={stock.code}
                    type="button"
                    onClick={() => selectStock(stock.code)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                      lastFetchedTicker === stock.code
                        ? 'bg-blue-100 border-blue-300 text-blue-700 ring-2 ring-blue-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${getMarketColor(stock.market)}`}>
                      {getMarketLabel(stock.market)}
                    </Badge>
                    <span className="font-medium">{stock.code}</span>
                    <span className="text-slate-400">{stock.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 查询结果提示 */}
            {companyName && lastFetchedTicker && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {lastFetchedTicker}
                  </Badge>
                  <span className="font-medium text-emerald-800">{companyName}</span>
                </div>
                <p className="text-sm text-emerald-600 mt-1">
                  财务数据已自动填充，请检查并调整增长率假设
                </p>
              </div>
            )}
          </div>

          {/* 基础财务数据 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">基础财务数据</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inputField(
                '当前年度自由现金流 (FCF)',
                'currentFCF',
                '亿元',
                '公司最近一个财年的自由现金流，可通过经营活动现金流减去资本支出计算得出'
              )}
              {inputField(
                '现金及现金等价物',
                'cashAndEquivalents',
                '亿元',
                '公司资产负债表上的现金、银行存款和短期投资'
              )}
              {inputField(
                '总负债',
                'totalDebt',
                '亿元',
                '公司有息负债总额，包括短期借款和长期借款'
              )}
              {inputField(
                '总股本',
                'sharesOutstanding',
                '亿股',
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
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">增长率假设</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inputField(
                '前5年增长率',
                'growthRateYears1to5',
                '%',
                '预测期内前5年的自由现金流年化增长率，通常参考行业增长和公司历史表现'
              )}
              {inputField(
                '第6-10年增长率',
                'growthRateYears6to10',
                '%',
                '预测期第6-10年的增长率，通常低于前5年，反映增长放缓'
              )}
              {inputField(
                '永续增长率',
                'terminalGrowthRate',
                '%',
                '预测期结束后的长期永续增长率，通常接近GDP增长率（2-3%）'
              )}
              {inputField(
                '折现率 (WACC)',
                'discountRate',
                '%',
                '加权平均资本成本，反映资金的时间价值和风险，通常8-12%'
              )}
            </div>
          </div>

          {/* 预测期设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">预测设置</h3>
            <div className="space-y-2">
              <Label htmlFor="projectionYears" className="text-sm font-medium text-slate-700">
                预测期年数
              </Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={data.projectionYears === 5 ? 'default' : 'outline'}
                  onClick={() => handleChange('projectionYears', 5)}
                  className={data.projectionYears === 5 ? 'bg-blue-600' : ''}
                >
                  5年
                </Button>
                <Button
                  type="button"
                  variant={data.projectionYears === 10 ? 'default' : 'outline'}
                  onClick={() => handleChange('projectionYears', 10)}
                  className={data.projectionYears === 10 ? 'bg-blue-600' : ''}
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
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            >
              <Calculator className="h-5 w-5 mr-2" />
              开始计算DCF估值
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="px-6 border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              重置
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
