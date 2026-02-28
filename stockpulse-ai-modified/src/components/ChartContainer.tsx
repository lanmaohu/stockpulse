interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}

export function ChartContainer({ title, subtitle, children, height = 300 }: ChartContainerProps) {
  return (
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
}
