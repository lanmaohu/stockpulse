# StockPulse AI - 项目说明

## 数据获取策略

### 美股 (US)
- **数据源**: Stock Analysis (https://stockanalysis.com)
- **URL 格式**: `/stocks/{symbol}/financials/`
- **货币**: USD ($)
- **默认 WACC**: 10%

### 港股 (HK)
- **数据源**: Stock Analysis (https://stockanalysis.com)
- **URL 格式**: `/quote/hkg/{code}/financials/`
- **货币**: HKD (HK$)
- **默认 WACC**: 12%

### A股 (CN)
- **主要数据源**: East Money (东方财富)
  - 报价 API: `https://push2.eastmoney.com/api/qt/stock/get`
  - 财务数据: `https://f10.eastmoney.com/`
- **备用数据源**: Yahoo Finance
- **代码格式**: 
  - 上海: `{code}.SS` (如: 600519.SS)
  - 深圳: `{code}.SZ` (如: 000001.SZ)
- **货币**: CNY (¥)
- **默认 WACC**: 8%
- **缓存**: 5分钟
- **预设股票**: 600519.SS(茅台), 000001.SZ(平安银行), 000858.SZ(五粮液)等

## 项目结构

```
/api/stock/financials/[symbol].ts    # DCF财务数据 API 路由
/api/stock/historical/[symbol].ts   # 历史K线数据 API 路由
/src/components/DCFInputForm.tsx     # DCF 输入表单
/src/components/DCFResults.tsx       # DCF 结果展示
/src/components/technical/           # 技术面分析组件
  ├── ChartContainer.tsx            # K线图容器
  ├── IndicatorChart.tsx            # 副图指标(MACD/RSI/KDJ)
  └── SignalList.tsx                # 交易信号列表
/src/pages/TechnicalPage.tsx        # 技术面分析页面
/src/lib/indicators.ts              # 技术指标计算库
/src/hooks/useTechnicalData.ts      # 技术面数据获取 Hook
/src/lib/dcfCalculator.ts           # DCF 计算引擎
/src/lib/stockData.ts               # 预设股票数据
/src/types/dcf.ts                   # TypeScript 类型定义
```

## 技术面分析页面

### 功能特性
- **K线图**: 支持日线/周线/月线
- **技术指标**: MA(5/10/20/60)、MACD、RSI、KDJ
- **交易信号**: 自动识别金叉/死叉、超买/超卖
- **数据来源**: Yahoo Finance API

### API 路由
```
GET /api/stock/historical/{symbol}?period=1d
Response: { candles: [{time, open, high, low, close, volume}], symbol, name, market, currentPrice }
```

## 财务数据链接

根据市场类型生成对应的数据源链接：

| 市场 | 数据源 | URL 格式 |
|------|--------|----------|
| 美股 (US) | Stock Analysis | `https://stockanalysis.com/stocks/{symbol}/financials/` |
| 港股 (HK) | Stock Analysis | `https://stockanalysis.com/quote/hkg/{symbol}/financials/` |
| A股 (CN) | 东方财富 | `https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/Index?type=web&code={SH/SZ}{code}` |

## 技术栈

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- East Money API (A股主要数据源)
- yahoo-finance2 (A股备用数据源)
- cheerio (网页抓取)

## 部署

- 平台: Vercel
- API 路由: `/api/stock/*`
