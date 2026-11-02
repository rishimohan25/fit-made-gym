import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

process.env.TEST_MODE = 'true';

const {
  addPosition,
  getPositions,
  evaluatePositions,
  closePosition,
  getAlerts
} = await import('../src/lib/positionManager.js');

test('Position Lifecycle: Adding a confirmed purchase stores correct position structure', () => {
  const trade = {
    ticker: 'TMPV.NS',
    companyName: 'Tata Motors',
    buyPrice: 950.00,
    shares: 20,
    target1: 975.00,
    target2: 995.00,
    stopLoss: 935.00,
    modelUsed: 'gemini-2.0-flash'
  };

  const pos = addPosition(trade);
  assert.strictEqual(pos.ticker, 'TMPV.NS');
  assert.strictEqual(pos.buyPrice, 950.00);
  assert.strictEqual(pos.shares, 20);
  assert.strictEqual(pos.totalInvested, 19000.00);
  assert.strictEqual(pos.status, 'OPEN');
  assert.strictEqual(pos.currentStopLoss, 935.00);
});

test('Position Evaluation: Target 1 hit triggers alert and raises Stop-Loss to breakeven', () => {
  // Price rises to 980 (above Target 1 of 975)
  const currentPrices = { 'TMPV.NS': 980.00 };
  const { positions, newAlerts } = evaluatePositions(currentPrices);

  const pos = positions.find(p => p.ticker === 'TMPV.NS' && p.status === 'OPEN');
  assert(pos, 'Position should exist and be OPEN');
  assert.strictEqual(pos.tp1Hit, true, 'TP1 must be flagged as hit');
  assert.strictEqual(pos.currentStopLoss, 950.00, 'Stop Loss must advance to breakeven price (950.00)');

  const tp1Alert = newAlerts.find(a => a.type === 'TARGET_1' && a.ticker === 'TMPV.NS');
  assert(tp1Alert, 'TARGET_1 alert must be emitted');
  assert.strictEqual(tp1Alert.severity, 'SUCCESS');
});

test('Position Evaluation: Stop Loss breach triggers CRITICAL SELL ALERT', () => {
  const slTrade = {
    ticker: 'INFY.NS',
    companyName: 'Infosys',
    buyPrice: 1800.00,
    shares: 10,
    target1: 1850.00,
    target2: 1890.00,
    stopLoss: 1770.00,
    modelUsed: 'gemini-1.5-flash'
  };
  addPosition(slTrade);

  // Price drops below 1770 to 1765
  const currentPrices = { 'INFY.NS': 1765.00 };
  const { newAlerts } = evaluatePositions(currentPrices);

  const slAlert = newAlerts.find(a => a.type === 'STOP_LOSS' && a.ticker === 'INFY.NS');
  assert(slAlert, 'STOP_LOSS alert must be triggered on price drop');
  assert.strictEqual(slAlert.severity, 'CRITICAL');
});

test('Position Closing: closing trade updates status to CLOSED with realized PnL', () => {
  const positions = getPositions();
  const openPos = positions.find(p => p.ticker === 'TMPV.NS' && p.status === 'OPEN');
  assert(openPos, 'Should find open Tata Motors position');

  const closed = closePosition(openPos.id, 985.00, 'TARGET_REACHED');
  assert.strictEqual(closed.status, 'CLOSED');
  assert.strictEqual(closed.exitPrice, 985.00);
  assert.strictEqual(closed.pnl, 700.00); // (985 - 950) * 20 = 700
});

test('Emerging Opportunities: detects high-conviction breakout on unowned stocks', async () => {
  const { detectEmergingOpportunities } = await import('../src/lib/positionManager.js');

  const candidates = [
    {
      symbol: 'SUZLON.NS',
      name: 'Suzlon Energy',
      sector: 'Energy',
      currentPrice: 65.0,
      vwap: 63.5,
      vwapDiffPercent: 2.36,
      rsi: 61.5,
      macd: { trend: 'BULLISH', histogram: 0.8 },
      rvol: 2.1,
      signal: 'STRONG_BUY',
      atr: 2.5
    },
    {
      symbol: 'TATASTEEL.NS',
      name: 'Tata Steel',
      sector: 'Metals',
      currentPrice: 155.0,
      vwap: 156.0,
      vwapDiffPercent: -0.64,
      rsi: 48.0,
      macd: { trend: 'NEUTRAL', histogram: -0.1 },
      rvol: 0.9,
      signal: 'NEUTRAL',
      atr: 4.0
    }
  ];

  const openPositions = [{ ticker: 'RELIANCE.NS', status: 'OPEN' }];
  const opps = detectEmergingOpportunities(candidates, openPositions, []);

  assert.strictEqual(opps.length, 1, 'Should detect exactly 1 breakout opportunity');
  assert.strictEqual(opps[0].ticker, 'SUZLON.NS');
  assert.strictEqual(opps[0].type, 'OPPORTUNITY');
  assert(opps[0].tradeDetails, 'Must include complete trade details');

  // Clean up test files
  const testPositions = path.join(process.cwd(), 'test_active_positions.json');
  const testAlerts = path.join(process.cwd(), 'test_active_alerts.json');
  const testBackup = path.join(process.cwd(), 'test_trades_backup.jsonl');
  if (fs.existsSync(testPositions)) fs.unlinkSync(testPositions);
  if (fs.existsSync(testAlerts)) fs.unlinkSync(testAlerts);
  if (fs.existsSync(testBackup)) fs.unlinkSync(testBackup);
});
