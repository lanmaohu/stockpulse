import express from "express";
import { createServer as createViteServer } from "vite";
import YahooFinance from 'yahoo-finance2';
import dotenv from "dotenv";

dotenv.config();

// Fix for yahoo-finance2 v3 initialization issue
// @ts-ignore
const yf = new YahooFinance();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const quote = await yf.quote(symbol);
      const summary = await yf.quoteSummary(symbol, {
        modules: [ 
          "summaryDetail", 
          "financialData", 
          "defaultKeyStatistics", 
          "assetProfile",
          "earnings",
          "cashflowStatementHistory"
        ]
      });
      res.json({ quote, summary });
    } catch (error) {
      console.error("Error fetching stock data:", error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/stock/:symbol/history", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { period1, period2, interval } = req.query;
      
      const queryOptions: any = {
        interval: (interval as any) || '1d',
      };

      // Ensure period1 and period2 are numbers if they look like timestamps, or strings
      if (period1) queryOptions.period1 = isNaN(Number(period1)) ? period1 : Number(period1);
      if (period2) queryOptions.period2 = isNaN(Number(period2)) ? period2 : Number(period2);

      // Default to last 3 months if no period is specified
      if (!queryOptions.period1) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        queryOptions.period1 = threeMonthsAgo;
      }

      const result = await yf.chart(symbol, queryOptions);
      res.json(result);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/stock/analyze", async (req, res) => {
    try {
      const { symbol, data } = req.body;
      const apiKey = process.env.KIMI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Kimi API Key 未配置" });
      }

      const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "moonshot-v1-8k",
          messages: [
            {
              role: "user",
              content: `请分析以下关于 ${symbol} 的股票数据，并提供专业的投资展望。
重点关注财务健康状况、近期表现和潜在风险。
数据: ${JSON.stringify(data)}

请使用中文回答，并以 Markdown 格式排版。`,
            },
          ],
        }),
      });

      const result = await response.json() as any;
      const text = result?.choices?.[0]?.message?.content || "分析失败，请稍后重试。";
      res.json({ analysis: text });
    } catch (error) {
      console.error("Error analyzing stock:", error);
      res.status(500).json({ error: "AI 分析请求失败" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
