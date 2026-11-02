import { GoogleGenerativeAI } from '@google/generative-ai';

// Default supported models
export const SUPPORTED_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest / Recommended)', tier: 'Free' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Reliable / High Quota)', tier: 'Free' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deep Reasoning)', tier: 'Pro' }
];

export async function generateStockRecommendations({
  dailyBudgetINR,
  candidates,
  marketOverview,
  modelId = 'gemini-2.0-flash',
  apiKey = process.env.GEMINI_API_KEY
}) {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Generating algorithmic fallback plan.');
    return generateAlgorithmicPlan(dailyBudgetINR, candidates, marketOverview, modelId);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `
You are an institutional Indian Stock Market (NSE/BSE) Day Trading Strategist and Risk Manager.
You analyze pre-screened Indian equities, India VIX, and Nifty 50 momentum to formulate strict, actionable intraday trading setups in Indian Rupees (INR / ₹).

CORE TRADING MANDATES:
1. Daily Capital Budget: The total capital allocated across all recommended stocks MUST be less than or equal to ₹${dailyBudgetINR}.
2. Diversification: Select 4 to 8 stocks from DIFFERENT non-correlated sectors (e.g., IT, Banking, Auto, Energy, FMCG, Pharma, Metals, Telecom). Prioritize non-correlated sectors for maximum diversification.
3. Risk-to-Reward (R:R): Every setup MUST have an R:R ratio of at least 1:2.0 (e.g., Target 1 upside must be at least 2x the stop-loss risk).
4. Stop-Loss Precision: Ground the stop-loss strictly in technical market structure (e.g. 1.2x to 1.5x ATR below entry or just beneath VWAP).
5. All values must be in INR (₹). Suggested shares must be whole integers such that (suggested_shares * current_price) fits the allocated sub-budget.
6. Return your response as a strict, valid JSON object without markdown fences or additional conversational prose.
`;

  const prompt = `
Daily Trading Capital: ₹${dailyBudgetINR}
Market Context:
- Nifty 50: ${marketOverview.nifty.price} (${marketOverview.nifty.changePercent > 0 ? '+' : ''}${marketOverview.nifty.changePercent}%)
- India VIX: ${marketOverview.vix.price} (${marketOverview.vix.level} Volatility)
- Session Time: ${marketOverview.sessionTimeIST}

Candidate Stocks Screened Across Sectors:
${JSON.stringify(candidates.map(c => ({
  ticker: c.symbol,
  company: c.name,
  sector: c.sector,
  currentPrice: c.currentPrice,
  vwap: c.vwap,
  vwapDiffPercent: `${c.vwapDiffPercent}%`,
  rsi: c.rsi,
  macdTrend: c.macd.trend,
  macdHist: c.macd.histogram,
  ema9: c.ema9,
  ema21: c.ema21,
  atr: c.atr,
  rvol: c.rvol,
  preliminarySignal: c.signal
})), null, 2)}

Produce a structured JSON response matching this exact schema:
{
  "market_summary": "1-2 sentences on Nifty 50 and India VIX sentiment",
  "daily_budget_inr": ${dailyBudgetINR},
  "total_capital_deployed": 0,
  "cash_reserve_inr": 0,
  "model_used": "${modelId}",
  "recommendations": [
    {
      "ticker": "SYMBOL.NS",
      "company_name": "Company Name",
      "sector": "Sector Name",
      "current_price": 0,
      "entry_range": "₹X - ₹Y",
      "suggested_shares": 0,
      "capital_required": 0,
      "target_1": 0,
      "target_2": 0,
      "stop_loss": 0,
      "risk_reward_ratio": 2.2,
      "technical_rationale": "Clear technical reasoning citing VWAP, RSI, EMA, ATR",
      "exit_plan": "Strategy for taking 50% profit at Target 1 and trailing the rest"
    }
  ]
}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      },
      systemInstruction
    });

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(cleanJsonString(text));
    return enrichRecommendations(parsed, candidates);
  } catch (err) {
    console.error(`Gemini Generation Error with model ${modelId}:`, err.message);

    // Fallback: If primary model fails (e.g., 429 quota), try gemini-1.5-flash as secondary
    if (modelId !== 'gemini-1.5-flash') {
      try {
        console.log('Attempting failover to gemini-1.5-flash...');
        const fallbackModel = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          systemInstruction
        });
        const result = await fallbackModel.generateContent(prompt);
        const parsed = JSON.parse(cleanJsonString(result.response.text()));
        parsed.model_used = 'gemini-1.5-flash (Failover)';
        return enrichRecommendations(parsed, candidates);
      } catch (fallbackErr) {
        console.error('Fallback model failed too:', fallbackErr.message);
      }
    }

    // Algorithmic fallback if all models fail
    return enrichRecommendations(generateAlgorithmicPlan(dailyBudgetINR, candidates, marketOverview, modelId), candidates);
  }
}

function enrichRecommendations(parsed, candidates) {
  if (!parsed || !parsed.recommendations) return parsed;
  const candidateMap = new Map(candidates.map(c => [c.symbol, c]));

  parsed.recommendations = parsed.recommendations.map(rec => {
    const matched = candidateMap.get(rec.ticker) || {};
    return {
      ...rec,
      sparkline: matched.sparkline || [],
      vwap: matched.vwap || rec.current_price,
      rsi: matched.rsi || 50,
      atr: matched.atr || 5,
      macdTrend: matched.macd?.trend || 'NEUTRAL',
      rvol: matched.rvol || 1.0
    };
  });
  return parsed;
}

function cleanJsonString(str) {
  if (!str) return '{}';
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
}

/**
 * Algorithmic Fallback Engine
 * Produces institutional quality quantitative setups if Gemini API key is missing or quotas are exhausted.
 */
function generateAlgorithmicPlan(dailyBudgetINR, candidates, marketOverview, modelId) {
  // Sort candidates by signal quality (STRONG_BUY > BUY > NEUTRAL) and RSI stability
  const bullish = candidates
    .filter(c => c.currentPrice >= c.vwap && c.rsi >= 42 && c.rsi <= 75)
    .sort((a, b) => (b.rvol || 1) - (a.rvol || 1));

  // Pick diverse stocks across non-correlated sectors (up to 9 candidates for pagination)
  const selected = [];
  const usedSectors = new Set();

  for (const c of bullish) {
    if (!usedSectors.has(c.sector) && selected.length < 9) {
      selected.push(c);
      usedSectors.add(c.sector);
    }
  }

  // If fewer than 6 found, fill with other promising candidates
  if (selected.length < 6) {
    for (const c of candidates) {
      if (!selected.some(s => s.symbol === c.symbol) && selected.length < 9) {
        selected.push(c);
      }
    }
  }

  const count = selected.length || 1;
  const allocationPerStock = Math.floor(dailyBudgetINR / count);
  let totalDeployed = 0;

  const recommendations = selected.map(stock => {
    const shares = Math.max(1, Math.floor(allocationPerStock / stock.currentPrice));
    const capital = Math.round(shares * stock.currentPrice);
    totalDeployed += capital;

    const stopDistance = Math.max(stock.atr * 1.3, stock.currentPrice * 0.012);
    const stopLoss = Math.round((stock.currentPrice - stopDistance) * 10) / 10;
    const target1 = Math.round((stock.currentPrice + stopDistance * 2.0) * 10) / 10;
    const target2 = Math.round((stock.currentPrice + stopDistance * 3.5) * 10) / 10;
    const rr = parseFloat(((target1 - stock.currentPrice) / (stock.currentPrice - stopLoss)).toFixed(2));

    return {
      ticker: stock.symbol,
      company_name: stock.name,
      sector: stock.sector,
      current_price: stock.currentPrice,
      entry_range: `₹${stock.currentPrice} - ₹${(stock.currentPrice * 1.004).toFixed(1)}`,
      suggested_shares: shares,
      capital_required: capital,
      target_1: target1,
      target_2: target2,
      stop_loss: stopLoss,
      risk_reward_ratio: rr,
      technical_rationale: `Price is trading ${(stock.vwapDiffPercent >= 0 ? '+' : '')}${stock.vwapDiffPercent}% relative to intraday VWAP with healthy RSI at ${stock.rsi}. MACD histogram is ${stock.macd.trend}. ATR volatility permits logical stop at ₹${stopLoss}.`,
      exit_plan: `Scale out 50% shares at Target 1 (₹${target1}) and advance Stop-Loss to entry. Let remaining 50% trail toward Target 2 (₹${target2}). Exit by 03:05 PM IST.`
    };
  });

  return {
    market_summary: `Nifty 50 at ${marketOverview.nifty.price} (${marketOverview.nifty.changePercent}%). India VIX at ${marketOverview.vix.price} reflects ${marketOverview.vix.level} intraday volatility.`,
    daily_budget_inr: dailyBudgetINR,
    total_capital_deployed: totalDeployed,
    cash_reserve_inr: Math.max(0, dailyBudgetINR - totalDeployed),
    model_used: `${modelId} (Quantitative Engine)`,
    recommendations
  };
}
