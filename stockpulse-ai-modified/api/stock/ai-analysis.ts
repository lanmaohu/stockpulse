import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { symbol, companyName, dcfData, dcfResult } = req.body;

  if (!symbol || !dcfData || !dcfResult) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const currency = dcfData.currency || 'USD';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'HKD' ? 'HK$' : '¥';
  const upsidePct = dcfResult.upsidePotential.toFixed(1);
  const verdict = dcfResult.valuationVerdict;

  const prompt = `You are an expert financial analyst specializing in equity valuation. Analyze the following DCF (Discounted Cash Flow) valuation results for ${companyName || symbol} and provide a concise, insightful investment analysis.

## Company: ${companyName || symbol} (${symbol})
## Currency: ${currency}

## DCF Valuation Results
- Current Market Price: ${currencySymbol}${dcfData.currentPrice.toFixed(2)}
- Intrinsic Value per Share: ${currencySymbol}${dcfResult.intrinsicValuePerShare.toFixed(2)}
- Upside/Downside Potential: ${upsidePct}%
- Valuation Verdict: ${verdict.toUpperCase()}

## Key Financial Assumptions
- Current Free Cash Flow: ${currencySymbol}${dcfData.currentFCF.toFixed(0)}M
- Growth Rate (Years 1-5): ${dcfData.growthRateYears1to5}%
- Growth Rate (Years 6-10): ${dcfData.growthRateYears6to10}%
- Terminal Growth Rate: ${dcfData.terminalGrowthRate}%
- Discount Rate (WACC): ${dcfData.discountRate}%
- Cash & Equivalents: ${currencySymbol}${dcfData.cashAndEquivalents.toFixed(0)}M
- Total Debt: ${currencySymbol}${dcfData.totalDebt.toFixed(0)}M
- Shares Outstanding: ${dcfData.sharesOutstanding.toFixed(0)}M

## Valuation Summary
- Enterprise Value: ${currencySymbol}${dcfResult.enterpriseValue.toFixed(0)}M
- Equity Value: ${currencySymbol}${dcfResult.equityValue.toFixed(0)}M
- Terminal Value (PV): ${currencySymbol}${dcfResult.terminalValuePV.toFixed(0)}M

Please provide a structured analysis in the following format:

### 1. Valuation Summary
Briefly state whether the stock appears undervalued, fairly valued, or overvalued based on the DCF analysis.

### 2. Key Investment Thesis
2-3 bullet points on the main drivers supporting or undermining this valuation.

### 3. Risk Assessment
Identify 2-3 key risks to the DCF assumptions (growth rates, WACC, terminal value).

### 4. Sensitivity Insights
Comment on which assumptions have the most impact on the valuation.

### 5. Investment Recommendation
A concise recommendation (Buy/Hold/Sell consideration) with a brief rationale. Note that this is for educational purposes only and not financial advice.

Keep the response focused and professional, using financial terminology appropriate for sophisticated investors.`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
}
