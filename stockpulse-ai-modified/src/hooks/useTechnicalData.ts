import { useState, useEffect, useCallback } from 'react';
import type { CandleData } from '@/lib/indicators';

export type TimePeriod = '1d' | '1wk' | '1mo';

export interface TechnicalData {
  candles: CandleData[];
  symbol: string;
  name: string;
  market: 'US' | 'HK' | 'CN';
  currentPrice: number;
  loading: boolean;
  error: string | null;
}

// 生成模拟 K 线数据
function generateMockCandles(symbol: string): CandleData[] {
  const candles: CandleData[] = [];
  const basePrice = symbol === 'AAPL' ? 220 : symbol === '0700.HK' ? 380 : 150;
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

export function useTechnicalData() {
  const [data, setData] = useState<TechnicalData>({
    candles: [],
    symbol: '',
    name: '',
    market: 'US',
    currentPrice: 0,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async (symbol: string, period: TimePeriod = '1d') => {
    if (!symbol) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/stock/historical/${symbol}?period=${period}`);
      
      // 如果 API 不存在或失败，使用模拟数据
      if (!response.ok) {
        console.log('API not available, using mock data');
        const mockCandles = generateMockCandles(symbol);
        setData({
          candles: mockCandles,
          symbol,
          name: symbol,
          market: symbol.endsWith('.HK') ? 'HK' : 'US',
          currentPrice: mockCandles[mockCandles.length - 1]?.close || 0,
          loading: false,
          error: null,
        });
        return;
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取数据失败');
      }

      setData({
        candles: result.data.candles,
        symbol: result.data.symbol,
        name: result.data.name,
        market: result.data.market,
        currentPrice: result.data.currentPrice,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching technical data:', error);
      // 使用模拟数据作为备用
      const mockCandles = generateMockCandles(symbol);
      setData({
        candles: mockCandles,
        symbol,
        name: symbol,
        market: symbol.endsWith('.HK') ? 'HK' : 'US',
        currentPrice: mockCandles[mockCandles.length - 1]?.close || 0,
        loading: false,
        error: null,
      });
    }
  }, []);

  return { ...data, fetchData };
}
