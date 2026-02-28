import { useState, FormEvent } from 'react';
import {
  Search,
  Activity,
  BarChart3,
  PieChart,
  Users,
  Loader2,
} from 'lucide-react';
import { cn } from './utils/cn';
import { useStockData } from './hooks/useStockData';
import { Dashboard } from './components/Dashboard';
import { DCFValuation } from './components/DCFValuation';
import { ErrorDisplay } from './components/ErrorDisplay';

/**
 * StockPulse AI - 股票分析应用主组件
 * 
 * 功能：
 * 1. 侧边栏导航（仪表盘 / DCF估值）
 * 2. 股票搜索
 * 3. 数据展示
 * 4. 友好的错误提示
 */
export default function App() {
  // 当前激活的标签页
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dcf'>('dashboard');
  
  // 搜索输入框的值
  const [searchInput, setSearchInput] = useState('AAPL');

  // 使用自定义 Hook 获取股票数据
  const { 
    symbol, 
    stockData, 
    history, 
    loading, 
    error, 
    fetchData,
    clearError,
    retry 
  } = useStockData('AAPL');

  // 处理搜索提交
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // 搜索时清除之前的错误
      clearError();
      fetchData(searchInput.toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* 左侧边栏导航 */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="pl-16">
        {/* 顶部导航栏 */}
        <Header
          symbol={stockData?.quote.symbol}
          companyName={stockData?.quote.shortName}
          searchValue={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            // 输入时清除错误
            if (error) clearError();
          }}
          onSearchSubmit={handleSearch}
        />

        {/* 主内容区域 */}
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          {loading && <LoadingState />}
          
          {/* 使用新的错误显示组件 */}
          {error && (
            <ErrorDisplay 
              error={error} 
              onRetry={retry}
              onDismiss={clearError}
            />
          )}
          
          {!loading && !error && stockData && (
            <>
              {activeTab === 'dashboard' ? (
                <Dashboard stockData={stockData} history={history} />
              ) : (
                <DCFValuation stockData={stockData} />
              )}
            </>
          )}
          
          {/* 初始空白状态 */}
          {!loading && !error && !stockData && <EmptyState />}
        </div>

        {/* 页脚 */}
        <Footer />
      </main>
    </div>
  );
}

// ============ 子组件 ============

interface SidebarProps {
  activeTab: 'dashboard' | 'dcf';
  onTabChange: (tab: 'dashboard' | 'dcf') => void;
}

function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-16 border-r border-zinc-800 flex flex-col items-center py-8 gap-8 bg-zinc-950 z-50">
      {/* Logo */}
      <div
        className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
        onClick={() => onTabChange('dashboard')}
      >
        <Activity className="text-black w-6 h-6" />
      </div>

      {/* 导航项 */}
      <div className="flex flex-col gap-6">
        <NavButton
          icon={BarChart3}
          isActive={activeTab === 'dashboard'}
          onClick={() => onTabChange('dashboard')}
          label="仪表盘"
        />
        <NavButton
          icon={PieChart}
          isActive={activeTab === 'dcf'}
          onClick={() => onTabChange('dcf')}
          label="DCF估值"
        />
        <NavButton
          icon={Users}
          isActive={false}
          onClick={() => {}}
          label="用户"
        />
      </div>
    </div>
  );
}

interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  label: string;
}

function NavButton({ icon: Icon, isActive, onClick, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-6 h-6 transition-colors',
        isActive ? 'text-white' : 'text-zinc-600 hover:text-white'
      )}
      title={label}
    >
      <Icon className="w-full h-full" />
    </button>
  );
}

interface HeaderProps {
  symbol?: string;
  companyName?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: FormEvent) => void;
}

function Header({ symbol, companyName, searchValue, onSearchChange, onSearchSubmit }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white tracking-tighter uppercase tracking-[0.2em] text-xs">
          STOCKPULSE AI
        </h1>
        <div className="h-4 w-px bg-zinc-800" />
        {symbol && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-zinc-500">{symbol}</span>
            <span className="text-sm font-semibold text-white">{companyName}</span>
          </div>
        )}
      </div>

      {/* 搜索框 */}
      <form onSubmit={onSearchSubmit} className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索股票代码 (如 TSLA)"
          className="bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 w-64 transition-all"
        />
        {/* 搜索提示 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 hidden group-focus-within:block">
          按回车搜索
        </div>
      </form>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">正在获取市场数据...</p>
      <p className="text-zinc-600 text-xs">正在连接 Yahoo Finance...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-4">
        <BarChart3 className="w-10 h-10 text-zinc-700" />
      </div>
      <h2 className="text-2xl font-bold text-white">欢迎使用 StockPulse AI</h2>
      <p className="text-zinc-500 max-w-md">输入股票代码开始深度分析基本面、技术面及投资见解。</p>
      <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl text-xs text-zinc-500">
        <p className="font-medium mb-2">支持的格式：</p>
        <div className="flex gap-4">
          <span>美股: AAPL</span>
          <span>港股: 0700.HK</span>
          <span>A股: 000001.SZ</span>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-900 px-8 py-12 text-center">
      <p className="text-zinc-600 text-xs font-mono uppercase tracking-[0.3em]">由 Yahoo Finance 提供数据支持</p>
      <p className="text-zinc-800 text-[10px] mt-4 max-w-2xl mx-auto">
        免责声明：StockPulse AI 提供的信息仅供参考，不构成任何投资建议。在做出投资决策前，请务必进行独立研究。
      </p>
    </footer>
  );
}
