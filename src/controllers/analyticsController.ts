import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Transaction from "../models/Transaction.js";
import yahooFinance from "../config/yahooFinance.js";

// 통계 유틸리티 함수들
const calculateMean = (data: number[]) =>
  data.reduce((a, b) => a + b, 0) / data.length;

const calculateStdDev = (data: number[], mean: number) => {
  if (data.length < 2) return 0;
  const variance =
    data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
};

const calculateCovariance = (
  dataA: number[],
  meanA: number,
  dataB: number[],
  meanB: number
) => {
  let sum = 0;
  const n = Math.min(dataA.length, dataB.length);
  if (n < 2) return 0;
  for (let i = 0; i < n; i++) {
    sum += (dataA[i] - meanA) * (dataB[i] - meanB);
  }
  return sum / (n - 1);
};

const calculateCorrelation = (dataA: number[], dataB: number[]): number => {
  if (dataA.length !== dataB.length || dataA.length < 2) return 0;
  const meanA = calculateMean(dataA);
  const meanB = calculateMean(dataB);
  const stdA = calculateStdDev(dataA, meanA);
  const stdB = calculateStdDev(dataB, meanB);
  if (stdA === 0 || stdB === 0) return 0;
  const cov = calculateCovariance(dataA, meanA, dataB, meanB);
  return cov / (stdA * stdB);
};

const calculateMaxDrawdown = (prices: number[]) => {
  let maxDrawdown = 0;
  let peak = prices[0];
  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = (price - peak) / peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
};

// 벤치마크 맵
const BENCHMARK_MAP: Record<string, { symbol: string; name: string }> = {
  sp500: { symbol: "^GSPC", name: "S&P 500" },
  dowjones: { symbol: "^DJI", name: "Dow Jones Industrial Average" },
  nasdaq: { symbol: "^IXIC", name: "Nasdaq Composite" },
  kospi: { symbol: "^KS11", name: "KOSPI" },
  kosdaq: { symbol: "^KQ11", name: "KOSDAQ" },
};

export const getRiskMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const portfolioId = req.params.id;
    // 선택 안 하면 undefined
    const benchmarkKey = req.query.benchmark as string | undefined;

    // 1. 포트폴리오 데이터 수집
    const transactions = await Transaction.find({
      portfolio: portfolioId,
    }).populate("asset");
    const holdings: Record<string, number> = {};

    transactions.forEach((t: any) => {
      if (!t.asset) return;
      const ticker = t.asset.ticker;
      if (!holdings[ticker]) holdings[ticker] = 0;
      if (t.transactionType === "BUY") holdings[ticker] += t.quantity;
      else if (t.transactionType === "SELL") holdings[ticker] -= t.quantity;
    });

    const tickers = Object.keys(holdings).filter((t) => holdings[t] > 0);

    // 보유 종목 없으면 0 반환 (beta, benchmark 아예 생략)
    if (tickers.length === 0) {
      return res.status(200).json({
        metrics: {
          volatility: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          correlationMatrix: {},
          beta: undefined, // JSON에서 키 삭제됨
        },
        benchmark: undefined, // JSON에서 키 삭제됨
      });
    }

    // 2. 과거 데이터 조회 (내 종목 + 선택된 벤치마크)
    let fetchTickers = [...tickers];
    let benchmarkTicker: string | undefined;
    let benchmarkName: string | undefined;

    // 벤치마크가 선택되었고 유효하다면 조회 목록에 추가
    if (benchmarkKey && BENCHMARK_MAP[benchmarkKey]) {
      const selectedBenchmark = BENCHMARK_MAP[benchmarkKey];
      benchmarkTicker = selectedBenchmark.symbol;
      benchmarkName = selectedBenchmark.name;
      fetchTickers.push(benchmarkTicker);
    }

    const rawHistoryData: Record<string, Record<string, number>> = {};
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const period1 = oneYearAgo.toISOString().split("T")[0];

    await Promise.all(
      fetchTickers.map(async (ticker) => {
        try {
          const result = (await yahooFinance.chart(ticker, {
            period1: period1,
            interval: "1d",
          })) as any;
          const quotes = result.quotes || [];
          const priceMap: Record<string, number> = {};
          quotes.forEach((q: any) => {
            if (q.date && (q.adjClose || q.close)) {
              const dateStr = new Date(q.date).toISOString().split("T")[0];
              priceMap[dateStr] = q.adjClose || q.close;
            }
          });
          rawHistoryData[ticker] = priceMap;
        } catch (e: any) {
          console.warn(`${ticker} 데이터 조회 실패`);
          rawHistoryData[ticker] = {};
        }
      })
    );

    // 3. 데이터 정제 (공통 거래일 찾기)
    // 데이터가 존재하는 내 종목만 필터링
    const validTickers = tickers.filter(
      (t) => rawHistoryData[t] && Object.keys(rawHistoryData[t]).length > 0
    );

    //  유효한 종목이 하나도 없을 때 (beta, benchmark 아예 생략)
    if (validTickers.length === 0) {
      return res.status(200).json({
        metrics: {
          volatility: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          correlationMatrix: {},
          beta: undefined, // JSON에서 키 삭제됨
        },
        benchmark: undefined, // JSON에서 키 삭제됨
      });
    }

    // 공통 날짜 필터링을 위한 티커 리스트 (벤치마크 포함 여부 결정)
    const checkTickers = [...validTickers];
    let hasBenchmarkData = false;

    // 벤치마크 데이터가 성공적으로 조회되었는지 확인
    if (
      benchmarkTicker &&
      rawHistoryData[benchmarkTicker] &&
      Object.keys(rawHistoryData[benchmarkTicker]).length > 0
    ) {
      checkTickers.push(benchmarkTicker);
      hasBenchmarkData = true;
    }

    // 기준 티커 설정 (날짜 추출용)
    const baseTicker = checkTickers[0];
    const baseData = rawHistoryData[baseTicker];

    const commonDates = Object.keys(baseData)
      .filter((date) =>
        checkTickers.every((t) => rawHistoryData[t][date] !== undefined)
      )
      .sort();

    if (commonDates.length < 2) {
      return res.status(200).json({ message: "데이터 부족으로 분석 불가" });
    }

    // 가격 및 수익률 배열 생성
    const alignedPrices: Record<string, number[]> = {};
    const returns: Record<string, number[]> = {};

    checkTickers.forEach((ticker) => {
      // 가격 정렬
      const prices = commonDates.map((date) => rawHistoryData[ticker][date]);
      alignedPrices[ticker] = prices;

      // 수익률 계산
      const dailyRet = [];
      for (let i = 1; i < prices.length; i++) {
        dailyRet.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      returns[ticker] = dailyRet;
    });

    // 4. 내 포트폴리오 지표 계산 (항상 수행)
    let totalPortfolioValue = 0;
    const weights: Record<string, number> = {};

    validTickers.forEach((t) => {
      const lastPrice = alignedPrices[t][alignedPrices[t].length - 1];
      const val = lastPrice * holdings[t];
      totalPortfolioValue += val;
      weights[t] = val;
    });
    validTickers.forEach((t) => {
      weights[t] =
        totalPortfolioValue > 0 ? weights[t] / totalPortfolioValue : 0;
    });

    const portfolioReturns = [];
    const days = returns[validTickers[0]].length;
    for (let i = 0; i < days; i++) {
      let portRet = 0;
      validTickers.forEach((t) => {
        portRet += returns[t][i] * weights[t];
      });
      portfolioReturns.push(portRet);
    }

    //  변동성, MDD, 샤프지수
    const portMean = calculateMean(portfolioReturns);
    const portStd = calculateStdDev(portfolioReturns, portMean);
    const annualizedVolatility = portStd * Math.sqrt(252);

    let cumValue = 100;
    const portValues = [100];
    for (const ret of portfolioReturns) {
      cumValue = cumValue * (1 + ret);
      portValues.push(cumValue);
    }
    const maxDrawdown = calculateMaxDrawdown(portValues);

    // 무위험 이자율 4.14% 반영
    const riskFreeRate = 0.0414 / 252;
    const excessReturns = portfolioReturns.map((r) => r - riskFreeRate);
    const excessMean = calculateMean(excessReturns);
    const excessStd = calculateStdDev(excessReturns, excessMean);
    const sharpeRatio =
      excessStd !== 0 ? (excessMean / excessStd) * Math.sqrt(252) : 0;

    // 상관계수 매트릭스: 벤치마크와 상관없이 내 종목들끼리 계산 (항상 수행)
    const correlationMatrix: Record<string, Record<string, number>> = {};
    for (const t1 of validTickers) {
      correlationMatrix[t1] = {};
      for (const t2 of validTickers) {
        if (t1 === t2) correlationMatrix[t1][t2] = 1;
        else
          correlationMatrix[t1][t2] = calculateCorrelation(
            returns[t1],
            returns[t2]
          );
      }
    }

    // 5. 벤치마크 관련 지표 (선택 + 데이터 존재 시에만 수행)
    // 값이 없으면 JSON에서 아예 사라짐 (Optional Pattern)
    let beta: number | undefined;
    let benchmarkResult: any; // undefined

    if (hasBenchmarkData && benchmarkTicker) {
      const benchRets = returns[benchmarkTicker];
      const benchMean = calculateMean(benchRets);
      const benchStd = calculateStdDev(benchRets, benchMean);
      const benchVariance = Math.pow(benchStd, 2);

      // 베타 계산
      const covariance = calculateCovariance(
        portfolioReturns,
        portMean,
        benchRets,
        benchMean
      );
      beta = benchVariance !== 0 ? covariance / benchVariance : 0;

      // 벤치마크 자체 지표 (비교용)
      // 벤치마크 샤프지수
      const benchExcessReturns = benchRets.map((r) => r - riskFreeRate);
      const benchExcessMean = calculateMean(benchExcessReturns);
      const benchExcessStd = calculateStdDev(
        benchExcessReturns,
        benchExcessMean
      );
      const benchSharpe =
        benchExcessStd !== 0
          ? (benchExcessMean / benchExcessStd) * Math.sqrt(252)
          : 0;

      benchmarkResult = {
        symbol: benchmarkTicker,
        name: benchmarkName,
        volatility: benchStd * Math.sqrt(252),
        maxDrawdown: calculateMaxDrawdown(alignedPrices[benchmarkTicker]),
        sharpeRatio: benchSharpe,
      };
    }

    res.status(200).json({
      metrics: {
        volatility: annualizedVolatility,
        maxDrawdown: maxDrawdown,
        sharpeRatio: sharpeRatio,
        correlationMatrix: correlationMatrix, 
        beta: beta, 
      },
      benchmark: benchmarkResult, 
    });
  } catch (error) {
    console.error("리스크 분석 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};
