import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: number;
}

export function StatCard({ title, value, subValue, trend }: StatCardProps) {
  return (
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
}
