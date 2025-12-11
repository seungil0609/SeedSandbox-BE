import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import Asset from "../models/Asset.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const YahooFinance = require("yahoo-finance2").default;

// 유틸리티: 차트 데이터 생성
type HistoricalData = { date: string; value: number };

const formatDateToYMD = (date: Date): string => {
  return date.toISOString().split("T")[0]!;
};

type ChartRangeOption =
  | "7d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "3y"
  | "max";

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

const bucketKeyForInterval = (
  date: Date,
  interval: string,
  anchor: Date
): string => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getTime();
  const diffDays = Math.floor((d - anchor.getTime()) / (1000 * 60 * 60 * 24));

  switch (interval) {
    case "5d":
      return `${interval}-${Math.floor(diffDays / 5)}`;
    case "1wk":
      return `${interval}-${Math.floor(diffDays / 7)}`;
    case "1mo":
      return `${y}-${m}`;
    case "3mo":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    default:
      return `${interval}-${date.toISOString().split("T")[0]}`;
  }
};

const buildHistoricalAndMarketData = async (
  transactions: any[],
  tickers: string[],
  yf: any,
  options?: ChartQueryOptions
): Promise<{
  historicalChartData: HistoricalData[];
}> => {
  let historicalChartData: HistoricalData[] = [];
  const today = new Date();

  if (transactions.length === 0 || tickers.length === 0) {
    return { historicalChartData };
  }

  const earliestDate = transactions.reduce((earliest, tx) => {
    const txDate = new Date(tx.transactionDate);
    return txDate < earliest ? txDate : earliest;
  }, new Date());

  const parsedStart = options?.startDate ? new Date(options.startDate) : null;
  const normalizedRange = normalizeRange(options?.range);
  const rangeStart = rangeStartDate(normalizedRange, today);
  const requestedStart = rangeStart || parsedStart;

  const startDate =
    requestedStart &&
    !isNaN(requestedStart.getTime()) &&
    requestedStart > earliestDate
      ? requestedStart
      : earliestDate;
  const endDate = today;

  if (startDate > endDate) {
    return { historicalChartData };
  }

  const interval = sanitizeInterval(options?.interval);
  const fetchInterval = "1d"; // Yahoo historical 호출은 일단 1d로 가져온 뒤 리샘플

  // 1. 개별 종목 과거 데이터
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
      console.warn(`[Chart] '${ticker}' historical 조회 실패 (Skip)`);
      historicalResults[ticker] = [];
    }
  }

  // 2. 가격 맵 구성 (날짜별 종가)
  const priceMap = new Map<string, Map<string, number>>();
  for (const ticker of tickers) {
    const dailyData = historicalResults[ticker] || [];
    for (const day of dailyData) {
      const dateStr = formatDateToYMD(day.date);
      if (!priceMap.has(dateStr)) priceMap.set(dateStr, new Map());
      priceMap.get(dateStr)!.set(ticker, day.close);
    }
  }

  const quantityChangeMap = new Map<string, Map<string, number>>();
  const currentQuantities = new Map<string, number>(); // 시작일 이전 거래 반영용

  for (const tx of transactions) {
    if (!tx.asset?.ticker) continue;
    const txDate = new Date(tx.transactionDate);
    const dateStr = formatDateToYMD(txDate);
    const ticker = tx.asset.ticker;
    const change = tx.transactionType === "BUY" ? tx.quantity : -tx.quantity;

    if (txDate < startDate) {
      const prev = currentQuantities.get(ticker) || 0;
      currentQuantities.set(ticker, prev + change);
      continue;
    }

    if (txDate >= startDate && txDate <= endDate) {
      if (!quantityChangeMap.has(dateStr))
        quantityChangeMap.set(dateStr, new Map());
      const currentChange = quantityChangeMap.get(dateStr)!.get(ticker) || 0;
      quantityChangeMap.get(dateStr)!.set(ticker, currentChange + change);
    }
  }

  const lastKnownPrices = new Map<string, number>();

  // 가격 존재일 + 거래일을 합쳐 정렬된 타임라인 생성
  const timelineSet = new Set<string>();
  for (const dateStr of priceMap.keys()) timelineSet.add(dateStr);
  for (const dateStr of quantityChangeMap.keys()) timelineSet.add(dateStr);

  const timeline = Array.from(timelineSet).sort();

  for (const dateStr of timeline) {
    if (quantityChangeMap.has(dateStr)) {
      const changes = quantityChangeMap.get(dateStr)!;
      for (const [ticker, change] of changes.entries()) {
        const currentQty = currentQuantities.get(ticker) || 0;
        currentQuantities.set(ticker, currentQty + change);
      }
    }

    const pricesForDay = priceMap.get(dateStr);
    if (pricesForDay) {
      for (const [ticker, price] of pricesForDay.entries()) {
        lastKnownPrices.set(ticker, price);
      }
    }

    let totalValueForDay = 0;
    for (const [ticker, quantity] of currentQuantities.entries()) {
      if (quantity > 0) {
        const lastPrice = lastKnownPrices.get(ticker) || 0;
        totalValueForDay += quantity * lastPrice;
      }
    }

    if (totalValueForDay > 0) {
      historicalChartData.push({ date: dateStr, value: totalValueForDay });
    }
  }

  // 리샘플링: 1d가 아닌 경우 주/월/분기 등으로 마지막 값 기준 다운샘플
  if (interval !== "1d") {
    const bucketMap = new Map<string, HistoricalData>();
    const anchor = new Date(startDate.getTime());
    // historicalChartData는 timeline 순서와 동일하게 정렬되어 있음
    for (const point of historicalChartData) {
      const key = bucketKeyForInterval(new Date(point.date), interval, anchor);
      bucketMap.set(key, point); // 같은 버킷에서는 더 최신(뒤쪽) 값으로 덮어씀
    }
    historicalChartData = Array.from(bucketMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  return { historicalChartData };
};

// 컨트롤러 함수

// 포트폴리오 생성
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

// 내 포트폴리오 조회
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

// 포트폴리오 상세 조회
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

// 포트폴리오 수정
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

// 포트폴리오 삭제
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

// 대시보드 요약 
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

    // 1. 보유량 집계
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

    // 2. 현재가 조회
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

    //섹터별 평가 금액 합계를 저장할 맵
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

      // 섹터 비중 계산 로직

      let weights = holding.sectorWeights;
      // Mongoose Map인 경우 일반 객체로 변환
      if (weights instanceof Map) {
        weights = Object.fromEntries(weights);
      }

      if (weights && Object.keys(weights).length > 0) {
        // (A) ETF: 가중치대로 금액 쪼개기
        for (const [secName, weight] of Object.entries(weights)) {
          const w = typeof weight === "number" ? weight : 0;
          if (w > 0) {
            const val = valuation * w;
            sectorValueMap[secName] = (sectorValueMap[secName] || 0) + val;
          }
        }
      } else {
        // (B) 주식 또는 정보 없는 ETF: 단일 섹터에 몰빵
        const secName = holding.sector || "Unknown";
        sectorValueMap[secName] = (sectorValueMap[secName] || 0) + valuation;
      }
      // -----------------------------

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

    // 최종 섹터 비중(%) 계산
    const sectorAllocation: Record<string, number> = {};
    if (currentValuation > 0) {
      for (const [secName, val] of Object.entries(sectorValueMap)) {
        // 소수점 2자리까지만
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
      //  포트폴리오 전체 섹터 비중
      sectorAllocation,
      assets: assetsSummary,
    });
  } catch (error) {
    console.error("대시보드 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};

// 종목 상세 조회
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

    //  날짜 직접 계산 (1달 전 ~ 오늘)
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    //  yf.chart 사용 및 정확한 날짜 전달
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

// 시뮬레이션
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

// 차트 데이터만 따로 조회하는 API
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

    // 쿼리로 기간/간격 설정
    const { startDate, interval, range } = req.query as {
      startDate?: string;
      interval?: string;
      range?: ChartRangeOption;
    };

    // 차트 데이터만 생성해서 반환
    const { historicalChartData } = await buildHistoricalAndMarketData(
      transactions,
      tickers,
      yf,
      {
        startDate,
        range,
        interval,
      }
    );

    res.status(200).json({ historicalChartData });
  } catch (error) {
    console.error("차트 데이터 조회 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};
