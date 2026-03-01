import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type LineData } from 'lightweight-charts';
import type { CandleData } from '@/lib/indicators';

interface ChartContainerProps {
  candles: CandleData[];
  ma5?: number[];
  ma10?: number[];
  ma20?: number[];
  ma60?: number[];
  height?: number;
  onCrosshairMove?: (data: any) => void;
}

export function ChartContainer({
  candles,
  ma5,
  ma10,
  ma20,
  ma60,
  height = 400,
  onCrosshairMove,
}: ChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ma5SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma10SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma60SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#22c55e',
          labelBackgroundColor: '#22c55e',
        },
        horzLine: {
          color: '#22c55e',
          labelBackgroundColor: '#22c55e',
        },
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      height,
    });

    // 添加 K 线系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // 添加 MA 系列
    const ma5Series = chart.addLineSeries({
      color: '#fbbf24',
      lineWidth: 1,
      title: 'MA5',
    });

    const ma10Series = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      title: 'MA10',
    });

    const ma20Series = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1,
      title: 'MA20',
    });

    const ma60Series = chart.addLineSeries({
      color: '#ec4899',
      lineWidth: 1,
      title: 'MA60',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    ma5SeriesRef.current = ma5Series;
    ma10SeriesRef.current = ma10Series;
    ma20SeriesRef.current = ma20Series;
    ma60SeriesRef.current = ma60Series;

    // 监听十字光标移动
    chart.subscribeCrosshairMove((param) => {
      if (param.time && onCrosshairMove) {
        const data = param.seriesData.get(candlestickSeries);
        onCrosshairMove(data);
      }
    });

    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, onCrosshairMove]);

  // 更新数据
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeriesRef.current.setData(candleData);

    // 更新 MA 数据
    if (ma5 && ma5SeriesRef.current) {
      const ma5Data: LineData[] = candles
        .map((c, i) => ({
          time: c.time as any,
          value: ma5[i],
        }))
        .filter(d => !isNaN(d.value));
      ma5SeriesRef.current.setData(ma5Data);
    }

    if (ma10 && ma10SeriesRef.current) {
      const ma10Data: LineData[] = candles
        .map((c, i) => ({
          time: c.time as any,
          value: ma10[i],
        }))
        .filter(d => !isNaN(d.value));
      ma10SeriesRef.current.setData(ma10Data);
    }

    if (ma20 && ma20SeriesRef.current) {
      const ma20Data: LineData[] = candles
        .map((c, i) => ({
          time: c.time as any,
          value: ma20[i],
        }))
        .filter(d => !isNaN(d.value));
      ma20SeriesRef.current.setData(ma20Data);
    }

    if (ma60 && ma60SeriesRef.current) {
      const ma60Data: LineData[] = candles
        .map((c, i) => ({
          time: c.time as any,
          value: ma60[i],
        }))
        .filter(d => !isNaN(d.value));
      ma60SeriesRef.current.setData(ma60Data);
    }

    // 调整时间范围
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, ma5, ma10, ma20, ma60]);

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />;
}
