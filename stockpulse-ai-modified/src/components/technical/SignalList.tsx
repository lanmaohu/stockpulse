import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import type { TradingSignal } from '@/lib/indicators';

interface SignalListProps {
  signals: TradingSignal[];
}

export function SignalList({ signals }: SignalListProps) {
  if (signals.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-zinc-500">
          <Minus className="w-4 h-4" />
          <span className="text-sm">暂无明确交易信号</span>
        </div>
      </div>
    );
  }

  const buySignals = signals.filter(s => s.type === 'buy');
  const sellSignals = signals.filter(s => s.type === 'sell');

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        交易信号
      </h4>
      
      {buySignals.length > 0 && (
        <div className="space-y-2">
          {buySignals.map((signal, idx) => (
            <div
              key={`buy-${idx}`}
              className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
            >
              <TrendingUp className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400">{signal.indicator}</span>
                  <span className="text-xs text-emerald-500/60">强度 {signal.strength}%</span>
                </div>
                <p className="text-sm text-emerald-300 mt-1">{signal.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {sellSignals.length > 0 && (
        <div className="space-y-2">
          {sellSignals.map((signal, idx) => (
            <div
              key={`sell-${idx}`}
              className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
            >
              <TrendingDown className="w-5 h-5 text-rose-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-rose-400">{signal.indicator}</span>
                  <span className="text-xs text-rose-500/60">强度 {signal.strength}%</span>
                </div>
                <p className="text-sm text-rose-300 mt-1">{signal.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
