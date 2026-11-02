import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateATR,
  calculateRVOL
} from '../src/lib/technicalIndicators.js';
import { NIFTY_UNIVERSE, BENCHMARKS } from '../src/lib/indianStocks.js';

test('Indian Stocks Universe: tickers have .NS suffix and non-empty sectors', () => {
  assert(NIFTY_UNIVERSE.length >= 20, 'Should have at least 20 curated Nifty stocks');
  for (const stock of NIFTY_UNIVERSE) {
    assert(stock.symbol.endsWith('.NS'), `Ticker ${stock.symbol} must end with .NS for NSE`);
    assert(stock.sector && stock.sector.length > 0, `Sector must be defined for ${stock.symbol}`);
    assert(stock.basePrice > 0, `Base price must be positive for ${stock.symbol}`);
  }
  assert.strictEqual(BENCHMARKS.nifty50, '^NSEI');
  assert.strictEqual(BENCHMARKS.indiaVix, '^INDIAVIX');
});

test('Technical Indicators: calculateVWAP computes correct typical volume weight', () => {
  const bars = [
    { high: 105, low: 95, close: 100, volume: 1000 }, // Typical = 100, vol = 1000
    { high: 115, low: 105, close: 110, volume: 2000 } // Typical = 110, vol = 2000
  ];
  // (100 * 1000 + 110 * 2000) / 3000 = (100000 + 220000) / 3000 = 320000 / 3000 = 106.67
  const vwap = calculateVWAP(bars);
  assert.strictEqual(vwap, 106.67);
});

test('Technical Indicators: calculateEMA returns expected exponential smooth', () => {
  const values = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const ema = calculateEMA(values, 5);
  assert(ema > 14 && ema < 19, `EMA should be weighted toward recent prices, got ${ema}`);
});

test('Technical Indicators: calculateRSI bounds between 0 and 100', () => {
  const steadyUptrend = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130];
  const rsi = calculateRSI(steadyUptrend, 14);
  assert(rsi > 70, `RSI for continuous gains should be overbought (>70), got ${rsi}`);
  assert(rsi <= 100, `RSI must not exceed 100, got ${rsi}`);
});

test('Technical Indicators: calculateMACD identifies trend and histogram', () => {
  const closes = Array.from({ length: 45 }, (_, i) => 100 + Math.pow(i, 1.5));
  const macd = calculateMACD(closes);
  assert.strictEqual(macd.trend, 'BULLISH', 'Accelerating price breakout should yield BULLISH MACD');
  assert(macd.histogram > 0, `MACD histogram should be positive, got ${macd.histogram}`);
});

test('Technical Indicators: calculateATR returns positive volatility range', () => {
  const bars = Array.from({ length: 20 }, (_, i) => ({
    high: 100 + i + 5,
    low: 100 + i - 5,
    close: 100 + i,
    volume: 10000
  }));
  const atr = calculateATR(bars, 14);
  assert(atr > 0, `ATR should be positive, got ${atr}`);
});
