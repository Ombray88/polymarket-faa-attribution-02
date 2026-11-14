/**
 * Forecaster design: volatility from winsorized one-minute changes,
 * damped recent-trend drift, asymmetric quantile bands wider below the median.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Market {
  id: string;
  name: string;
  slug: string;
  yes_token: string;
  start: string | number;
  prices: number[];
}

interface CaseInput {
  schema: string;
  case: string | number;
  at: string;
  horizon_minutes: number;
  quantiles: number[];
  event: any;
  markets: Market[];
}

interface MarketForecast {
  id: string;
  q: number[][];
}

interface CaseOutput {
  forecasts: MarketForecast[];
}

function processMarket(market: Market, horizonMinutes: number): MarketForecast {
  const prices = market.prices || [];
  const hasPrices = prices.length > 0;
  const lastPrice = hasPrices ? prices[prices.length - 1] : 0.5;

  let sigma = 0.0025;
  if (prices.length >= 2) {
    const history = prices.slice(-720);
    const changes: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const d = history[i] - history[i - 1];
      const clipped = Math.max(-0.005, Math.min(0.005, d));
      changes.push(clipped);
    }
    if (changes.length > 0) {
      const mean = changes.reduce((acc, val) => acc + val, 0) / changes.length;
      const variance = changes.reduce(
        (acc, val) => acc + Math.pow(val - mean, 2),
        0
      ) / changes.length;
      sigma = Math.sqrt(variance);
    }
  }
  sigma = Math.max(0.0002, Math.min(0.02, sigma));

  let drift = 0;
  if (prices.length >= 61) {
    const slope =
      (prices[prices.length - 1] - prices[prices.length - 61]) / 60;
    drift = slope * 0.25;
    drift = Math.max(-0.0005, Math.min(0.0005, drift));
  }

  const multipliers = [-2.2, -0.8, 0, 0.6, 1.35];
  const qRows: number[][] = [];

  for (let h = 1; h <= horizonMinutes; h++) {
    if (!hasPrices) {
      qRows.push([0.5, 0.5, 0.5, 0.5, 0.5]);
      continue;
    }
    const median = lastPrice + drift * h;
    const row: number[] = [];
    const sqrtH = Math.sqrt(h);
    for (const m of multipliers) {
      let val = median + m * sigma * sqrtH;
      val = Math.max(0, Math.min(1, val));
      let rounded = Number(val.toFixed(6));
      if (rounded === 0) rounded = 0;
      row.push(rounded);
    }
    row.sort((a, b) => a - b);
    qRows.push(row);
  }

  return {
    id: market.id,
    q: qRows,
  };
}

function main() {
  const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const entries = fs.readdirSync(inputDir).sort();
  const inFiles = entries.filter((e) => e.endsWith('.in'));

  const expectedQuantiles = [0.05, 0.25, 0.5, 0.75, 0.95];
  let processedCount = 0;

  for (const file of inFiles) {
    const filePath = path.join(inputDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const caseData: CaseInput = JSON.parse(content);

    const q = caseData.quantiles;
    const isValidQuantiles =
      Array.isArray(q) &&
      q.length === 5 &&
      q.every((val, idx) => val === expectedQuantiles[idx]);

    if (!isValidQuantiles) {
      throw new Error(`Invalid quantiles in file ${filePath}`);
    }

    const forecasts: MarketForecast[] = [];
    const markets = caseData.markets || [];
    for (const market of markets) {
      forecasts.push(processMarket(market, caseData.horizon_minutes));
    }

    const outputData: CaseOutput = { forecasts };
    const baseName = path.basename(file, '.in');
    const outFileName = baseName + '.out';
    const outFilePath = path.join(outputDir, outFileName);

    fs.writeFileSync(outFilePath, JSON.stringify(outputData) + '\n', 'utf-8');
    processedCount++;
  }

  console.log(`Successfully processed ${processedCount} .in files from ${inputDir} to ${outputDir}`);
}

main();
