import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type HistogramData, type LineData } from 'lightweight-charts';

interface IndicatorChartProps {
  data: {
    time: string;
    value1?: number;
    value2?: number;
    value3?: number;
    histogram?: number;
  }[];
  type: 'macd' | 'rsi' | 'kdj';
  height?: number;
}

export function IndicatorChart({ data, type, height = 150 }: IndicatorChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
      rightPriceScale: {
        borderColor: '#27272a',
      },
      timeScale: {
        borderColor: '#27272a',
        visible: false,
      },
      height,
    });

    chartRef.current = chart;

    if (type === 'macd') {
      // MACD: DIF(黄), DEA(蓝), MACD柱(红绿)
      const difSeries = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1 });
      const deaSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1 });
      const macdSeries = chart.addHistogramSeries({
        color: '#22c55e',
        priceFormat: { type: 'volume' },
      });

      const difData: LineData[] = [];
      const deaData: LineData[] = [];
      const macdData: HistogramData[] = [];

      data.forEach(d => {
        if (!isNaN(d.value1!)) {
          difData.push({ time: d.time as any, value: d.value1 });
        }
        if (!isNaN(d.value2!)) {
          deaData.push({ time: d.time as any, value: d.value2 });
        }
        if (!isNaN(d.histogram!)) {
          macdData.push({
            time: d.time as any,
            value: d.histogram,
            color: d.histogram! >= 0 ? '#22c55e' : '#ef4444',
          });
        }
      });

      difSeries.setData(difData);
      deaSeries.setData(deaData);
      macdSeries.setData(macdData);
    } else if (type === 'rsi') {
      // RSI 线 + 超买超卖区域
      const rsiSeries = chart.addLineSeries({ color: '#a855f7', lineWidth: 1.5 });
      
      const rsiData: LineData[] = data
        .filter(d => !isNaN(d.value1!))
        .map(d => ({ time: d.time as any, value: d.value1 }));
      
      rsiSeries.setData(rsiData);

      // 添加水平线
      const upperLine = chart.addLineSeries({ color: '#ef4444', lineWidth: 1, lastValueVisible: false });
      const lowerLine = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lastValueVisible: false });
      
      if (data.length > 0) {
        const firstTime = data[0].time as any;
        const lastTime = data[data.length - 1].time as any;
        upperLine.setData([
          { time: firstTime, value: 70 },
          { time: lastTime, value: 70 },
        ]);
        lowerLine.setData([
          { time: firstTime, value: 30 },
          { time: lastTime, value: 30 },
        ]);
      }
    } else if (type === 'kdj') {
      // KDJ: K(黄), D(蓝), J(紫)
      const kSeries = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1 });
      const dSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1 });
      const jSeries = chart.addLineSeries({ color: '#a855f7', lineWidth: 1 });

      const kData: LineData[] = [];
      const dData: LineData[] = [];
      const jData: LineData[] = [];

      data.forEach(item => {
        if (!isNaN(item.value1!)) kData.push({ time: item.time as any, value: item.value1 });
        if (!isNaN(item.value2!)) dData.push({ time: item.time as any, value: item.value2 });
        if (!isNaN(item.value3!)) jData.push({ time: item.time as any, value: item.value3 });
      });

      kSeries.setData(kData);
      dSeries.setData(dData);
      jSeries.setData(jData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, type, height]);

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />;
}
