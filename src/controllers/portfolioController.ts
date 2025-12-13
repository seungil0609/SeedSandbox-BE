import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import Asset from "../models/Asset.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const YahooFinance = require("yahoo-finance2").default;

type HistoricalData = { date: string; value: number };

const formatDateToYMD = (date: Date): string => {
  return date.toISOString().split("T")[0]!;
};

type ChartRangeOption = "7d" | "1mo" | "3mo" | "6mo" | "1y" | "3y" | "max";

type ChartQueryOptions = {
  startDate?: string;
  interval?: string;
  range?: ChartRangeOption;
};

const sanitizeInterval = (interval?: string): string => {
  const allowed = new Set(["1d", "5d", "1wk", "1mo", "3mo"]);
  if (interval && allowed.has(interval)) return interval;
  return "1d";
};

const normalizeRange = (range?: string): ChartRangeOption | undefined => {
  const allowed: ChartRangeOption[] = [
    "7d",
    "1mo",
    "3mo",
    "6mo",
    "1y",
    "3y",
    "max",
  ];
  return allowed.includes(range as ChartRangeOption)
    ? (range as ChartRangeOption)
    : undefined;
};

const rangeStartDate = (
  range: ChartRangeOption | undefined,
  today: Date
): Date | null => {
  if (!range || range === "max") return null;
  const start = new Date(today);
  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "1mo":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3mo":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6mo":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "3y":
      start.setFullYear(start.getFullYear() - 3);
      break;
  }
  return start;
};

// 🗓️ 날짜 배열 생성기 (빈 날짜 채우기용)
const generateDateRange = (start: Date, end: Date): string[] => {
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(formatDateToYMD(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const buildHistoricalAndMarketData = async (
  transactions: any[],
  tickers: string[],
  yf: any,
  options?: ChartQueryOptions
): Promise<{ historicalChartData: HistoricalData[] }> => {
  let historicalChartData: HistoricalData[] = [];
  const today = new Date();

  // 1. 기간 설정
  const earliestTxDate =
    transactions.length > 0
      ? transactions.reduce((earliest, tx) => {
          const d = new Date(tx.transactionDate);
          return d < earliest ? d : earliest;
        }, new Date())
      : new Date();

  const parsedStart = options?.startDate ? new Date(options.startDate) : null;
  const normalizedRange = normalizeRange(options?.range);
  const rangeStart = rangeStartDate(normalizedRange, today);

  // 사용자가 요청한 기간 vs 최초 거래일 중 더 늦은 날짜 사용? (X)
  // 정규화를 위해 사용자가 요청한 기간(Range)을 우선시하되, 데이터가 없으면 0으로 채움.
  let startDate = rangeStart || parsedStart || earliestTxDate;

  // max인 경우 최초 거래일 사용
  if (normalizedRange === "max" && earliestTxDate < startDate) {
    startDate = earliestTxDate;
  }

  const endDate = today;
  if (startDate > endDate) return { historicalChartData };

  const fetchInterval = "1d"; // 기본 1일 단위로 가져옴

  // 2. 야후 파이낸스 데이터 조회
  const historicalResults: Record<string, { date: Date; close: number }[]> = {};
  for (const ticker of tickers) {
    try {
      const tickerData = await yf.historical(ticker, {
        period1: formatDateToYMD(startDate),
        period2: formatDateToYMD(endDate),
        interval: fetchInterval,
      });
      historicalResults[ticker] = tickerData;
    } catch (err) {
      historicalResults[ticker] = [];
    }
  }

  // 3. 일별 가격 맵 구성
  const priceMap = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();

  for (const ticker of tickers) {
    const dailyData = historicalResults[ticker] || [];
    for (const day of dailyData) {
      const dateStr = formatDateToYMD(day.date);
      if (!priceMap.has(dateStr)) priceMap.set(dateStr, new Map());
      priceMap.get(dateStr)!.set(ticker, day.close);
      allDates.add(dateStr);
    }
  }

  // 4. 거래 내역 처리
  const quantityChangeMap = new Map<string, Map<string, number>>();
  const initialQuantities = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.asset?.ticker) continue;
    const txDate = new Date(tx.transactionDate);
    const dateStr = formatDateToYMD(txDate);
    const ticker = tx.asset.ticker;
    const change = tx.transactionType === "BUY" ? tx.quantity : -tx.quantity;

    if (txDate < startDate) {
      initialQuantities.set(
        ticker,
        (initialQuantities.get(ticker) || 0) + change
      );
    } else if (txDate <= endDate) {
      if (!quantityChangeMap.has(dateStr))
        quantityChangeMap.set(dateStr, new Map());
      const current = quantityChangeMap.get(dateStr)!.get(ticker) || 0;
      quantityChangeMap.get(dateStr)!.set(ticker, current + change);
    }
  }

  // 5. 날짜별 포트폴리오 가치 계산 (Zero Filling)
  // 사용자가 요청한 기간의 모든 날짜 생성
  const fullDateRange = generateDateRange(startDate, endDate);
  const currentQuantities = new Map(initialQuantities);
  const lastKnownPrices = new Map<string, number>();

  const rawValues: { date: string; value: number }[] = [];

  for (const dateStr of fullDateRange) {
    // 수량 업데이트
    if (quantityChangeMap.has(dateStr)) {
      const changes = quantityChangeMap.get(dateStr)!;
      for (const [ticker, change] of changes.entries()) {
        currentQuantities.set(
          ticker,
          (currentQuantities.get(ticker) || 0) + change
        );
      }
    }

    // 가격 업데이트
    const pricesForDay = priceMap.get(dateStr);
    if (pricesForDay) {
      for (const [ticker, price] of pricesForDay.entries()) {
        lastKnownPrices.set(ticker, price);
      }
    }

    // 총 가치 계산
    let totalValue = 0;
    for (const [ticker, qty] of currentQuantities.entries()) {
      if (qty > 0) {
        const price = lastKnownPrices.get(ticker) || 0; // 가격 없으면 0
        totalValue += qty * price;
      }
    }

    rawValues.push({ date: dateStr, value: totalValue });
  }

  // 6. 데이터 정규화 (Normalization) - 수익률(%) 변환
  // 기준점: 데이터 중 "최초로 가치가 0이 아닌 지점"의 가치
  let baseValue = 0;
  const firstNonZero = rawValues.find((v) => v.value > 0);
  if (firstNonZero) baseValue = firstNonZero.value;

  const normalizedData = rawValues.map((point) => {
    let normalizedValue = 0;

    // 아직 투자를 시작하지 않은 구간(0원) -> 0%
    if (point.value === 0) {
      normalizedValue = 0;
    }
    // 투자를 시작한 이후 -> (현재가치 - 기준가치) / 기준가치 * 100
    else if (baseValue > 0) {
      normalizedValue = ((point.value - baseValue) / baseValue) * 100;
    }

    return { date: point.date, value: Number(normalizedValue.toFixed(2)) };
  });

  // 7. 인터벌 리샘플링 (1d가 아닌 경우)
  // 여기서는 간단하게 해당 인터벌의 마지막 날짜 데이터만 남김
  /* 
     주의: 정규화된 데이터이므로 단순 합산하면 안됨. 
     특정 시점(주말, 월말)의 스냅샷을 가져와야 함.
  */

  if (options?.interval && options.interval !== "1d") {
    // 리샘플링 로직은 일단 생략하고 1d로 전체 반환 (프론트에서 처리 가능)
    // 필요 시 bucketKeyForInterval 로직 사용하여 마지막 값 pick
  }

  return { historicalChartData: normalizedData };
};

// ... (나머지 컨트롤러 함수들은 기존 코드와 동일하므로 유지) ...
// createPortfolio, getMyPortfolios, getPortfolioById, updatePortfolio, deletePortfolio,
// getPortfolioSummary, getAssetDetails, runSimulation

export const createPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const { name, baseCurrency } = req.body;
    if (!name) return res.status(400).json({ message: "이름 필요" });
    const user = req.user;
    if (!user) return res.status(401).json({ message: "인증 필요" });

    const newPortfolio = new Portfolio({ name, baseCurrency, user: user._id });
    const saved = await newPortfolio.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getMyPortfolios = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "인증 필요" });
    const portfolios = await Portfolio.find({ user: user._id });
    res.status(200).json(portfolios);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getPortfolioById = async (req: AuthRequest, res: Response) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: "포트폴리오 없음" });
    if (
      (portfolio.user as any).toString() !== (req.user?._id as any).toString()
    )
      return res.status(403).json({ message: "권한 없음" });
    res.status(200).json(portfolio);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const updatePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: "포트폴리오 없음" });
    if (
      (portfolio.user as any).toString() !== (req.user?._id as any).toString()
    )
      return res.status(403).json({ message: "권한 없음" });

    portfolio.name = req.body.name || portfolio.name;
    portfolio.baseCurrency = req.body.baseCurrency || portfolio.baseCurrency;
    const updated = await portfolio.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const deletePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: "포트폴리오 없음" });
    if (
      (portfolio.user as any).toString() !== (req.user?._id as any).toString()
    )
      return res.status(403).json({ message: "권한 없음" });

    await Transaction.deleteMany({ portfolio: req.params.id });
    await portfolio.deleteOne();
    res.status(200).json({ message: "삭제 완료" });
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getPortfolioSummary = async (req: AuthRequest, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const user = req.user;

    const portfolio = await Portfolio.findById(portfolioId);
    if (
      !portfolio ||
      (portfolio.user as any).toString() !== (user?._id as any).toString()
    ) {
      return res.status(403).json({ message: "권한 없음" });
    }

    const baseCurrency = portfolio.baseCurrency || "KRW";
    const transactions = await Transaction.find({
      portfolio: portfolioId,
    }).populate("asset");

    const assetHoldings: any = {};
    const tickers: string[] = [];

    transactions.forEach((t: any) => {
      if (!t.asset) return;
      const ticker = t.asset.ticker;

      if (!assetHoldings[ticker]) {
        assetHoldings[ticker] = {
          qty: 0,
          totalCost: 0,
          ticker,
          name: t.asset.name,
          sector: t.asset.sector || "Unknown",
          sectorWeights: t.asset.sectorWeights,
          currency: t.currency,
        };
        tickers.push(ticker);
      }

      if (t.transactionType === "BUY") {
        assetHoldings[ticker].qty += t.quantity;
        assetHoldings[ticker].totalCost += t.price * t.quantity;
      } else if (t.transactionType === "SELL") {
        const avg =
          assetHoldings[ticker].qty > 0
            ? assetHoldings[ticker].totalCost / assetHoldings[ticker].qty
            : 0;
        assetHoldings[ticker].qty -= t.quantity;
        assetHoldings[ticker].totalCost -= avg * t.quantity;
      }
    });

    const activeTickers = Object.values(assetHoldings)
      .filter((h: any) => h.qty > 0)
      .map((h: any) => h.ticker) as string[];

    const yf = new YahooFinance({
      suppressNotices: ["yahooSurvey", "ripHistorical"],
    });

    const priceMap = new Map<string, number>();
    let exchangeRate = 1;

    if (activeTickers.length > 0) {
      const symbolsToFetch = [...activeTickers];
      if (baseCurrency === "KRW") symbolsToFetch.push("KRW=X");

      try {
        const results = await yf.quote(symbolsToFetch);
        const quotes = Array.isArray(results) ? results : [results];
        quotes.forEach((q: any) => {
          if (q.symbol === "KRW=X") exchangeRate = q.regularMarketPrice || 1;
          else priceMap.set(q.symbol, q.regularMarketPrice || 0);
        });
      } catch (e: any) {
        console.warn("시세 조회 일부 실패");
      }
    }

    let totalInvestment = 0;
    let currentValuation = 0;

    const sectorValueMap: Record<string, number> = {};

    const assetsSummary = [];

    for (const ticker of activeTickers) {
      const holding = assetHoldings[ticker];
      const currentPrice =
        priceMap.get(ticker) || holding.totalCost / holding.qty || 0;

      const applyRate =
        holding.currency === "USD" && baseCurrency === "KRW" ? exchangeRate : 1;

      const valuation = holding.qty * currentPrice * applyRate;
      const adjustedCost = holding.totalCost * applyRate;

      totalInvestment += adjustedCost;
      currentValuation += valuation;

      let weights = holding.sectorWeights;
      if (weights instanceof Map) {
        weights = Object.fromEntries(weights);
      }

      if (weights && Object.keys(weights).length > 0) {
        for (const [secName, weight] of Object.entries(weights)) {
          const w = typeof weight === "number" ? weight : 0;
          if (w > 0) {
            const val = valuation * w;
            sectorValueMap[secName] = (sectorValueMap[secName] || 0) + val;
          }
        }
      } else {
        const secName = holding.sector || "Unknown";
        sectorValueMap[secName] = (sectorValueMap[secName] || 0) + valuation;
      }

      assetsSummary.push({
        ticker,
        name: holding.name,
        sector: holding.sector,
        sectorWeights: weights,
        quantity: holding.qty,
        averagePrice: holding.totalCost / holding.qty,
        currentPrice,
        currency: holding.currency,
        totalValue: valuation,
        returnRate:
          adjustedCost > 0
            ? ((valuation - adjustedCost) / adjustedCost) * 100
            : 0,
      });
    }

    const sectorAllocation: Record<string, number> = {};
    if (currentValuation > 0) {
      for (const [secName, val] of Object.entries(sectorValueMap)) {
        sectorAllocation[secName] = parseFloat(
          ((val / currentValuation) * 100).toFixed(2)
        );
      }
    }

    res.status(200).json({
      portfolioId: portfolio._id,
      name: portfolio.name,
      baseCurrency,
      exchangeRate,
      totalPortfolioValue: currentValuation,
      totalPortfolioCostBasis: totalInvestment,
      totalPortfolioProfitLoss: currentValuation - totalInvestment,
      totalPortfolioReturnPercentage:
        totalInvestment > 0
          ? ((currentValuation - totalInvestment) / totalInvestment) * 100
          : 0,
      sectorAllocation,
      assets: assetsSummary,
    });
  } catch (error) {
    console.error("대시보드 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getAssetDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id: portfolioId, assetTicker } = req.params;
    const asset = await Asset.findOne({ ticker: assetTicker });
    if (!asset) return res.status(404).json({ message: "존재하지 않는 종목" });

    const transactions = await Transaction.find({
      portfolio: portfolioId,
      asset: asset._id,
    }).sort({ transactionDate: -1 });

    let totalQty = 0,
      totalCost = 0;
    transactions.forEach((t) => {
      if (t.transactionType === "BUY") {
        totalQty += t.quantity;
        totalCost += t.price * t.quantity;
      } else {
        const avg = totalQty > 0 ? totalCost / totalQty : 0;
        totalQty -= t.quantity;
        totalCost -= avg * t.quantity;
      }
    });

    const yf = new YahooFinance({
      suppressNotices: ["yahooSurvey", "ripHistorical"],
    });
    const quote = await yf.quote(assetTicker);
    const currentPrice =
      quote?.regularMarketPrice || (totalQty > 0 ? totalCost / totalQty : 0);

    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    const chartResult = await yf.chart(assetTicker, {
      period1: formatDateToYMD(oneMonthAgo),
      period2: formatDateToYMD(today),
      interval: "1d",
    });

    const historyData = (chartResult.quotes || []).map((q: any) => ({
      date: formatDateToYMD(new Date(q.date)),
      price: q.adjClose || q.close,
    }));

    res.status(200).json({
      ticker: assetTicker,
      name: asset.name,
      sector: asset.sector,
      totalQuantity: totalQty,
      averageBuyPrice: totalQty > 0 ? totalCost / totalQty : 0,
      currentPrice,
      totalProfitLoss: totalQty * currentPrice - totalCost,
      returnPercentage:
        totalCost > 0
          ? ((totalQty * currentPrice - totalCost) / totalCost) * 100
          : 0,
      chartData: historyData,
      transactions,
    });
  } catch (error) {
    console.error("자산 상세 조회 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const runSimulation = async (req: AuthRequest, res: Response) => {
  try {
    const { assetTicker, additionalQuantity, additionalPrice } = req.body;
    res.status(200).json({
      message: "시뮬레이션 성공",
      simulationResult: {
        ticker: assetTicker,
        newAvgPrice: additionalPrice,
        newTotalQuantity: additionalQuantity,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getPortfolioChartData = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const portfolioId = req.params.id;
    const user = req.user;

    const portfolio = await Portfolio.findById(portfolioId);
    if (
      !portfolio ||
      (portfolio.user as any).toString() !== (user?._id as any).toString()
    ) {
      return res.status(403).json({ message: "권한 없음" });
    }

    const transactions = await Transaction.find({
      portfolio: portfolioId,
    }).populate("asset");
    const tickersSet = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.asset?.ticker) tickersSet.add(t.asset.ticker);
    });
    const tickers = Array.from(tickersSet);

    const yf = new YahooFinance({
      suppressNotices: ["yahooSurvey", "ripHistorical"],
    });
    const { startDate, interval, range } = req.query as any;

    const { historicalChartData } = await buildHistoricalAndMarketData(
      transactions,
      tickers,
      yf,
      { startDate, range, interval }
    );

    res.status(200).json({ historicalChartData });
  } catch (error) {
    console.error("차트 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};
