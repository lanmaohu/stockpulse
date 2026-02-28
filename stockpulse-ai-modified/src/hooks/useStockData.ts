import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { StockData, HistoryPoint } from '../types/stock';
import type { FriendlyError, ErrorType } from '../types/error';
import { createFriendlyError, parseError, getErrorTypeFromStatus } from '../types/error';
import { isValidSymbol } from '../utils/errorHandler';

interface UseStockDataReturn {
  symbol: string;
  stockData: StockData | null;
  history: HistoryPoint[];
  loading: boolean;
  error: FriendlyError | null;
  fetchData: (targetSymbol: string) => Promise<void>;
  clearError: () => void;
  retry: () => void;
}

/**
 * 股票数据获取 Hook
 * 
 * 功能：
 * 1. 获取股票基本信息和历史数据
 * 2. 计算 KDJ 和移动平均线指标
 * 3. 提供友好的错误提示
 */
export function useStockData(initialSymbol: string = 'AAPL'): UseStockDataReturn {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [lastSymbol, setLastSymbol] = useState(initialSymbol);

  /**
   * 计算 KDJ 指标
   */
  const calculateKDJ = (
    data: Array<{ high: number; low: number; close: number }>,
    index: number,
    prevK: number,
    prevD: number
  ): { k: number; d: number; j: number } => {
    if (index < 8) {
      return { k: 50, d: 50, j: 50 };
    }

    const last9 = data.slice(index - 8, index + 1);
    const lowN = Math.min(...last9.map((d) => d.low));
    const highN = Math.max(...last9.map((d) => d.high));
    const rsv = highN === lowN ? 50 : ((data[index].close - lowN) / (highN - lowN)) * 100;

    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    const j = 3 * k - 2 * d;

    return { k, d, j };
  };

  /**
   * 计算移动平均线
   */
  const calculateMA = (
    data: Array<{ close: number }>,
    index: number,
    period: number
  ): number | null => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    return sum / period;
  };

  /**
   * 获取股票数据（核心函数）
   */
  const fetchData = useCallback(async (targetSymbol: string) => {
    // 1. 前置校验：检查股票代码格式
    if (!targetSymbol || !targetSymbol.trim()) {
      setError(createFriendlyError('INVALID_SYMBOL' as ErrorType, '请输入股票代码'));
      return;
    }

    const trimmedSymbol = targetSymbol.trim().toUpperCase();

    if (!isValidSymbol(trimmedSymbol)) {
      setError(createFriendlyError('INVALID_SYMBOL' as ErrorType));
      return;
    }

    // 2. 开始加载
    setLoading(true);
    setError(null);
    setLastSymbol(trimmedSymbol);

    try {
      // 3. 并行请求股票基本信息和历史数据
      const [stockResponse, historyResponse] = await Promise.all([
        fetch(`/api/stock/${trimmedSymbol}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }),
        fetch(`/api/stock/history/${trimmedSymbol}?interval=1d`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }),
      ]);

      // 4. 处理股票基本信息响应
      if (!stockResponse.ok) {
        const errorType = getErrorTypeFromStatus(stockResponse.status);
        
        // 尝试解析错误详情
        let errorDetail = '';
        try {
          const errorData = await stockResponse.json();
          errorDetail = errorData.error?.message || errorData.message || '';
        } catch {
          // 解析失败，使用默认错误
        }

        // 针对特定错误类型提供额外信息
        if (errorType === 'STOCK_NOT_FOUND' as ErrorType) {
          throw createFriendlyError(
            'STOCK_NOT_FOUND' as ErrorType,
            `未找到股票 "${trimmedSymbol}"，请检查代码是否正确`
          );
        }

        throw createFriendlyError(errorType, errorDetail || undefined);
      }

      const data: StockData = await stockResponse.json();

      // 验证数据完整性
      if (!data.quote || !data.quote.symbol) {
        throw createFriendlyError(
          'NO_DATA_AVAILABLE' as ErrorType,
          `股票 "${trimmedSymbol}" 数据不完整，可能已退市或暂无数据`
        );
      }

      // 5. 处理历史数据响应
      if (!historyResponse.ok) {
        console.warn('历史数据获取失败，但仍显示基本信息');
        // 历史数据失败不影响基本信息显示
        setStockData(data);
        setHistory([]);
        setSymbol(trimmedSymbol);
        return;
      }

      const historyData = await historyResponse.json();

      // 6. 格式化并处理历史数据
      if (!historyData.quotes || !Array.isArray(historyData.quotes)) {
        console.warn('历史数据格式异常');
        setStockData(data);
        setHistory([]);
        setSymbol(trimmedSymbol);
        return;
      }

      const formattedHistory = historyData.quotes
        .map((q: any) => ({
          date: format(new Date(q.date), 'MM-dd'),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume,
        }))
        .filter((q: any) => q.close !== null && !isNaN(q.close));

      // 7. 计算技术指标（KDJ 和 MA）
      let k = 50, d = 50;
      const enrichedHistory: HistoryPoint[] = formattedHistory.map(
        (q: any, i: number) => {
          const kdj = calculateKDJ(formattedHistory, i, k, d);
          k = kdj.k;
          d = kdj.d;

          return {
            ...q,
            k: kdj.k,
            d: kdj.d,
            j: kdj.j,
            ma5: calculateMA(formattedHistory, i, 5),
            ma10: calculateMA(formattedHistory, i, 10),
            ma20: calculateMA(formattedHistory, i, 20),
            range: [q.low, q.high],
            body: [q.open, q.close],
          };
        }
      );

      // 8. 更新状态
      setStockData(data);
      setHistory(enrichedHistory);
      setSymbol(trimmedSymbol);
      setError(null);

    } catch (err: any) {
      console.error('获取股票数据失败:', err);

      // 9. 统一错误处理
      let friendlyError: FriendlyError;

      if (err?.type && Object.values(ErrorType).includes(err.type)) {
        // 已经是 FriendlyError
        friendlyError = err;
      } else if (err instanceof TypeError) {
        // 网络错误
        if (err.message.includes('fetch') || err.message.includes('network')) {
          friendlyError = createFriendlyError('NETWORK_ERROR' as ErrorType);
        } else {
          friendlyError = createFriendlyError('UNKNOWN_ERROR' as ErrorType, err.message);
        }
      } else if (err instanceof Error) {
        // 其他错误
        friendlyError = parseError(err);
      } else {
        // 未知错误
        friendlyError = createFriendlyError('UNKNOWN_ERROR' as ErrorType, String(err));
      }

      setError(friendlyError);
      // 清空旧数据，避免显示错误的信息
      setStockData(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 重试上一次请求
   */
  const retry = useCallback(() => {
    if (lastSymbol) {
      fetchData(lastSymbol);
    }
  }, [fetchData, lastSymbol]);

  // 初始加载
  useEffect(() => {
    fetchData(initialSymbol);
  }, [fetchData, initialSymbol]);

  return {
    symbol,
    stockData,
    history,
    loading,
    error,
    fetchData,
    clearError,
    retry,
  };
}
