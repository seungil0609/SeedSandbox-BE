import type { Request, Response } from "express";
import yahooFinance from "../config/yahooFinance.js";

// 타입 호환성을 위해 any로 캐스팅 (필요시 유지)
const yf = yahooFinance as any;

// 유틸리티 함수들
const formatDateToYMD = (date: Date): string => {
  return date.toISOString().split("T")[0]!;
};

type ChartRangeOption = "7d" | "1mo" | "3mo" | "6mo" | "1y" | "3y" | "max";

const sanitizeInterval = (interval?: string): string => {
  const allowed = new Set([
    "1m",
    "2m",
    "5m",
    "15m",
    "30m",
    "60m",
    "90m",
    "1h",
    "1d",
    "5d",
    "1wk",
    "1mo",
    "3mo",
  ]);
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

const formatSectorName = (rawName: string) => {
  return rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// @desc    자산 검색 (Yahoo Finance)
export const searchAssets = async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "검색어 필요" });

  try {
    const result = await yf.search(query);

    const formatted = result.quotes
      .filter((item: any) => item.symbol)
      .map((item: any) => ({
        symbol: item.symbol,
        shortname: item.shortname || item.longname,
        exchange: item.exchange,
        typeDisp: item.quoteType,
      }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error("자산 검색 오류:", error);
    res.status(500).json({ error: "검색 실패" });
  }
};

// 자산 상세 정보 조회
export const getAssetDetails = async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker;
    if (!ticker) {
      return res.status(400).json({ message: "티커가 필요합니다." });
    }

    const { range, interval } = req.query as {
      range?: string;
      interval?: string;
    };
    const normalizedRange = normalizeRange(range);
    const validInterval = sanitizeInterval(interval);
    const today = new Date();
    const calculatedStart = rangeStartDate(normalizedRange, today);

    let period1: string | Date;
    if (normalizedRange === "max") {
      period1 = "1700-01-01";
    } else if (calculatedStart) {
      period1 = formatDateToYMD(calculatedStart);
    } else {
      const defaultStart = new Date();
      defaultStart.setFullYear(today.getFullYear() - 1);
      period1 = formatDateToYMD(defaultStart);
    }

    const [quote, summary, chartResult, newsResult] = await Promise.all([
      yf.quote(ticker).catch(() => null),
      yf
        .quoteSummary(ticker, {
          modules: [
            "summaryProfile",
            "summaryDetail",
            "defaultKeyStatistics",
            "financialData",
            "fundProfile",
            "topHoldings",
            "price",
          ],
        })
        .catch(() => null),
      yf
        .chart(ticker, {
          period1: normalizedRange === "max" ? undefined : period1,
          interval: validInterval,
        })
        .catch(() => ({ quotes: [] })),
      yf.search(ticker, { newsCount: 5 }).catch(() => ({ news: [] })),
    ]);

    if (!quote) {
      return res.status(404).json({ message: "해당 종목을 찾을 수 없습니다." });
    }

    let displaySector = "Unknown";
    let formattedSectorWeightings: { sector: string; weight: number }[] = [];
    const sProfile = summary?.summaryProfile;
    const topHoldings = summary?.topHoldings;

    if (topHoldings?.sectorWeightings?.length > 0) {
      topHoldings.sectorWeightings.forEach((item: any) => {
        for (const [k, v] of Object.entries(item)) {
          const w = typeof v === "number" ? v : Number(v) || 0;
          if (w > 0) {
            formattedSectorWeightings.push({
              sector: formatSectorName(k),
              weight: w,
            });
          }
        }
      });
      formattedSectorWeightings.sort((a, b) => b.weight - a.weight);
    }

    if (sProfile?.sector) {
      displaySector = sProfile.sector;
    } else if (formattedSectorWeightings.length > 0) {
      displaySector = formattedSectorWeightings[0].sector;
    }

    const chartData = (chartResult.quotes || [])
      .filter((q: any) => q.date && (q.adjClose || q.close))
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        close: q.adjClose || q.close,
        volume: q.volume,
      }));

    const news = (newsResult.news || []).map((n: any) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      providerPublishTime: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    }));

    const sDetail = summary?.summaryDetail || {};
    const sStats = summary?.defaultKeyStatistics || {};
    const sFin = summary?.financialData || {};
    const sFund = summary?.fundProfile || {};

    const fundamentals = {
      marketCap: sDetail.marketCap || quote.marketCap,
      trailingPE: sDetail.trailingPE || quote.trailingPE,
      forwardPE: sStats.forwardPE || quote.forwardPE,
      priceToBook: sStats.priceToBook || quote.priceToBook,
      eps: sStats.trailingEps || quote.epsTrailingTwelveMonths,
      profitMargins: sFin.profitMargins,
      totalRevenue: sFin.totalRevenue,
      totalCash: sFin.totalCash,
      totalDebt: sFin.totalDebt,
      dividendYield: sDetail.dividendYield || quote.dividendYield,
      beta: sStats.beta || quote.beta,
      targetPrice: sFin.targetMeanPrice,
      recommendationKey: sFin.recommendationKey,
      netAssets: sFund.totalAssets,
      expenseRatio: sFund.feesExpensesInvestment?.annualReportExpenseRatio,
      sectorWeightings:
        formattedSectorWeightings.length > 0
          ? formattedSectorWeightings
          : undefined,
      fiftyTwoWeekHigh: sDetail.fiftyTwoWeekHigh || quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sDetail.fiftyTwoWeekLow || quote.fiftyTwoWeekLow,
      volume: sDetail.volume || quote.regularMarketVolume,
      circulatingSupply: quote.circulatingSupply,
    };

    const responseData = {
      meta: {
        symbol: quote.symbol,
        shortName: quote.shortName || quote.longName,
        longName: quote.longName,
        exchange: quote.exchange,
        currency: quote.currency,
        assetType: quote.quoteType,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketTime: quote.regularMarketTime,
        sector: displaySector,
      },
      fundamentals,
      chartData,
      news,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("자산 상세 조회 실패:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};
