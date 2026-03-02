// 技术指标计算库

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 简单移动平均 SMA
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result.push(sum / period);
  }
  return result;
}

// 指数移动平均 EMA
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else if (i < period - 1) {
      result.push(NaN);
    } else {
      const prevEMA = result[i - 1];
      const ema = (data[i] - prevEMA) * multiplier + prevEMA;
      result.push(ema);
    }
  }
  return result;
}

// MACD 指标
export interface MACDResult {
  dif: number[];
  dea: number[];
  macd: number[];
}

export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);
  
  const dif: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      dif.push(NaN);
    } else {
      dif.push(ema12[i] - ema26[i]);
    }
  }
  
  const dea = calculateEMA(dif.filter(v => !isNaN(v)), signalPeriod);
  // 补齐dea长度
  const fullDea: number[] = new Array(data.length).fill(NaN);
  const offset = data.length - dea.length;
  for (let i = 0; i < dea.length; i++) {
    fullDea[i + offset] = dea[i];
  }
  
  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(dif[i]) || isNaN(fullDea[i])) {
      macd.push(NaN);
    } else {
      macd.push((dif[i] - fullDea[i]) * 2);
    }
  }
  
  return { dif, dea: fullDea, macd };
}

// RSI 相对强弱指标
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j] - data[j - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}


// KDJ 随机指标
export interface KDJResult {
  k: number[];
  d: number[];
  j: number[];
}

export function calculateKDJ(
  candles: CandleData[],
  n: number = 9,
  m1: number = 3,
  m2: number = 3
): KDJResult {
  const k: number[] = [];
  const d: number[] = [];
  const j: number[] = [];
  
  let prevK = 50;
  let prevD = 50;
  
  for (let i = 0; i < candles.length; i++) {
    if (i < n - 1) {
      k.push(NaN);
      d.push(NaN);
      j.push(NaN);
      continue;
    }
    
    // 找出N周期内的最低最低价和最高最高价
    let lowestLow = candles[i].low;
    let highestHigh = candles[i].high;
    
    for (let j = i - n + 1; j <= i; j++) {
      lowestLow = Math.min(lowestLow, candles[j].low);
      highestHigh = Math.max(highestHigh, candles[j].high);
    }
    
    const rsv = highestHigh === lowestLow 
      ? 50 
      : ((candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    const currK = (2 * prevK + rsv) / 3;
    const currD = (2 * prevD + currK) / 3;
    const currJ = 3 * currK - 2 * currD;
    
    k.push(currK);
    d.push(currD);
    j.push(currJ);
    
    prevK = currK;
    prevD = currD;
  }
  
  return { k, d, j };
}

// 生成交易信号
export interface TradingSignal {
  type: 'buy' | 'sell' | 'neutral';
  indicator: string;
  message: string;
  strength: number; // 0-100
}

export function generateSignals(
  candles: CandleData[],
  lastPrice: number,
  ma5: number[],
  ma20: number[],
  rsi: number[],
  macd: MACDResult
): TradingSignal[] {
  const signals: TradingSignal[] = [];
  const lastIdx = candles.length - 1;
  
  // MA 金叉/死叉
  if (!isNaN(ma5[lastIdx]) && !isNaN(ma20[lastIdx])) {
    const prevIdx = lastIdx - 1;
    if (!isNaN(ma5[prevIdx]) && !isNaN(ma20[prevIdx])) {
      if (ma5[prevIdx] <= ma20[prevIdx] && ma5[lastIdx] > ma20[lastIdx]) {
        signals.push({
          type: 'buy',
          indicator: 'MA',
          message: 'MA5上穿MA20，形成金叉',
          strength: 70
        });
      } else if (ma5[prevIdx] >= ma20[prevIdx] && ma5[lastIdx] < ma20[lastIdx]) {
        signals.push({
          type: 'sell',
          indicator: 'MA',
          message: 'MA5下穿MA20，形成死叉',
          strength: 70
        });
      }
    }
  }
  
  // RSI 超买/超卖
  const lastRSI = rsi[lastIdx];
  if (!isNaN(lastRSI)) {
    if (lastRSI > 70) {
      signals.push({
        type: 'sell',
        indicator: 'RSI',
        message: `RSI=${lastRSI.toFixed(1)}，处于超买区域`,
        strength: 60
      });
    } else if (lastRSI < 30) {
      signals.push({
        type: 'buy',
        indicator: 'RSI',
        message: `RSI=${lastRSI.toFixed(1)}，处于超卖区域`,
        strength: 60
      });
    }
  }
  
  // MACD 金叉/死叉
  const dif = macd.dif[lastIdx];
  const dea = macd.dea[lastIdx];
  const prevDif = macd.dif[lastIdx - 1];
  const prevDea = macd.dea[lastIdx - 1];
  
  if (!isNaN(dif) && !isNaN(dea) && !isNaN(prevDif) && !isNaN(prevDea)) {
    if (prevDif <= prevDea && dif > dea) {
      signals.push({
        type: 'buy',
        indicator: 'MACD',
        message: 'MACD金叉，DIF上穿DEA',
        strength: 75
      });
    } else if (prevDif >= prevDea && dif < dea) {
      signals.push({
        type: 'sell',
        indicator: 'MACD',
        message: 'MACD死叉，DIF下穿DEA',
        strength: 75
      });
    }
  }
  
  return signals;
}
