import { 
  WifiOff, 
  Clock, 
  SearchX, 
  AlertTriangle, 
  Database, 
  Timer, 
  Key, 
  CloudOff, 
  ServerOff, 
  HelpCircle,
  RefreshCw,
  X,
  Lightbulb,
  MessageCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { FriendlyError } from '../types/error';

interface ErrorDisplayProps {
  error: FriendlyError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * 错误图标映射
 */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'wifi-off': WifiOff,
  'clock': Clock,
  'search-x': SearchX,
  'alert-triangle': AlertTriangle,
  'database': Database,
  'timer': Timer,
  'key': Key,
  'cloud-off': CloudOff,
  'server-off': ServerOff,
  'help-circle': HelpCircle,
};

/**
 * 错误类型对应的颜色方案
 */
const colorSchemes: Record<string, { bg: string; border: string; icon: string; title: string; text: string }> = {
  NETWORK_ERROR: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-500',
    title: 'text-amber-500',
    text: 'text-amber-500/80',
  },
  TIMEOUT_ERROR: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-500',
    title: 'text-orange-500',
    text: 'text-orange-500/80',
  },
  STOCK_NOT_FOUND: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
    title: 'text-blue-500',
    text: 'text-blue-500/80',
  },
  INVALID_SYMBOL: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-500',
    title: 'text-yellow-500',
    text: 'text-yellow-500/80',
  },
  NO_DATA_AVAILABLE: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    icon: 'text-slate-500',
    title: 'text-slate-500',
    text: 'text-slate-500/80',
  },
  API_RATE_LIMIT: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-500',
    title: 'text-purple-500',
    text: 'text-purple-500/80',
  },
  API_KEY_INVALID: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-500',
    title: 'text-red-500',
    text: 'text-red-500/80',
  },
  SERVICE_UNAVAILABLE: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-500',
    title: 'text-cyan-500',
    text: 'text-cyan-500/80',
  },
  SERVER_ERROR: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: 'text-rose-500',
    title: 'text-rose-500',
    text: 'text-rose-500/80',
  },
  UNKNOWN_ERROR: {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    icon: 'text-zinc-500',
    title: 'text-zinc-500',
    text: 'text-zinc-500/80',
  },
};

/**
 * 友好的错误显示组件
 * 
 * 特点：
 * 1. 不同类型的错误使用不同颜色
 * 2. 显示详细的解决建议
 * 3. 支持重试操作
 * 4. 支持关闭
 */
export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className 
}: ErrorDisplayProps) {
  const Icon = iconMap[error.icon || 'help-circle'] || HelpCircle;
  const colors = colorSchemes[error.type] || colorSchemes.UNKNOWN_ERROR;

  // 将建议文本按行分割
  const suggestionLines = error.suggestion.split('\n');

  return (
    <div 
      className={cn(
        'rounded-2xl border p-6 backdrop-blur-sm',
        colors.bg,
        colors.border,
        className
      )}
    >
      {/* 头部：图标、标题、关闭按钮 */}
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-black/20'
        )}>
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn('text-lg font-bold', colors.title)}>
              {error.title}
            </h3>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
              >
                <X className={cn('w-4 h-4', colors.text)} />
              </button>
            )}
          </div>
          
          <p className={cn('mt-1 text-sm', colors.text)}>
            {error.message}
          </p>
        </div>
      </div>

      {/* 解决建议 */}
      <div className="mt-4 ml-16">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className={cn('w-4 h-4', colors.icon)} />
          <span className={cn('text-xs font-semibold uppercase tracking-wider', colors.title)}>
            解决建议
          </span>
        </div>
        <div className={cn(
          'bg-black/20 rounded-xl p-4 text-sm space-y-1',
          colors.text
        )}>
          {suggestionLines.map((line, index) => (
            <p key={index} className={line.startsWith('•') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('-') ? '' : 'font-medium'}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 ml-16 flex items-center gap-3">
        {error.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-white/10 hover:bg-white/20 text-white'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        )}
        
        {/* 反馈按钮 */}
        <button
          onClick={() => {
            // 可以在这里添加反馈功能
            alert('感谢您的反馈！我们会持续改进错误提示。');
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'hover:bg-white/5',
            colors.text
          )}
        >
          <MessageCircle className="w-4 h-4" />
          问题未解决？
        </button>
      </div>

      {/* 错误代码（调试用，默认隐藏） */}
      <div className="mt-4 ml-16 pt-4 border-t border-white/10">
        <p className="text-[10px] text-zinc-600 font-mono">
          错误代码: {error.type}
        </p>
      </div>
    </div>
  );
}

/**
 * 小型错误提示（用于紧凑空间）
 */
export function ErrorDisplayCompact({ 
  error, 
  onRetry 
}: { 
  error: FriendlyError; 
  onRetry?: () => void;
}) {
  const Icon = iconMap[error.icon || 'help-circle'] || HelpCircle;
  const colors = colorSchemes[error.type] || colorSchemes.UNKNOWN_ERROR;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border',
      colors.bg,
      colors.border
    )}>
      <Icon className={cn('w-5 h-5 flex-shrink-0', colors.icon)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', colors.title)}>
          {error.title}
        </p>
        <p className={cn('text-xs truncate', colors.text)}>
          {error.message}
        </p>
      </div>
      {error.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-white/10',
            colors.text
          )}
          title="重试"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Toast 通知样式的错误提示
 */
export function ErrorToast({ 
  error, 
  onClose 
}: { 
  error: FriendlyError; 
  onClose: () => void;
}) {
  const Icon = iconMap[error.icon || 'help-circle'] || HelpCircle;
  const colors = colorSchemes[error.type] || colorSchemes.UNKNOWN_ERROR;

  return (
    <div className={cn(
      'fixed bottom-8 right-8 max-w-md rounded-xl border p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-2',
      colors.bg,
      colors.border,
      'bg-zinc-950/95 backdrop-blur-md'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)} />
        <div className="flex-1">
          <h4 className={cn('font-semibold text-sm', colors.title)}>
            {error.title}
          </h4>
          <p className={cn('text-xs mt-1', colors.text)}>
            {error.message}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
