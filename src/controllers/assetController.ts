import type { Request, Response } from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const YahooFinance = require("yahoo-finance2").default;

//  유틸리티: 차트 날짜 및 타입 정의
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

// 섹터 이름 포맷팅
const formatSectorName = (rawName: string) => {
  return rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// @desc    자산 검색 (Yahoo Finance)
// @route   GET /api/assets/search
export const searchAssets = async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: "검색어 필요" });

  try {
    // 인스턴스 생성 후 검색
    const yf = new YahooFinance();
    const result = await yf.search(query);

    const formatted = result.quotes
      .filter((item: any) => item.symbol) // symbol이 있는 것만 통과
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

// 자산 상세 정보 조회 (차트, 재무, 뉴스 포함)
export const getAssetDetails = async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker;
    if (!ticker) {
      return res.status(400).json({ message: "티커가 필요합니다." });
    }

    const yf = new YahooFinance();

    // 1. 쿼리 파라미터 처리 (Range & Interval)
    const { range, interval } = req.query as {
      range?: string;
      interval?: string;
    };

    const normalizedRange = normalizeRange(range);
    const validInterval = sanitizeInterval(interval); // 기본값 '1d'

    // 날짜 계산
    const today = new Date();
    const calculatedStart = rangeStartDate(normalizedRange, today);

    // period1 설정: range가 있으면 계산된 날짜, 없으면 기본 1년 전
    let period1: string | Date;
    if (normalizedRange === "max") {
      period1 = "1700-01-01"; // Yahoo에서 알아서 Max로 처리함 (혹은 period1 생략 가능)
    } else if (calculatedStart) {
      period1 = formatDateToYMD(calculatedStart);
    } else {
      // 기본값: 1년 전
      const defaultStart = new Date();
      defaultStart.setFullYear(today.getFullYear() - 1);
      period1 = formatDateToYMD(defaultStart);
    }

    // 성능을 위해 병렬 처리 (Quote, Summary, Chart, News)
    const [quote, summary, chartResult, newsResult] = await Promise.all([
      yf.quote(ticker).catch(() => null),
      yf
        .quoteSummary(ticker, {
          modules: [
            "summaryProfile", // 섹터 정보가 들어있는 모듈 추가
            "summaryDetail", // 시총, 배당, 52주 변동 등
            "defaultKeyStatistics", // PER, EPS, Beta 등
            "financialData", // 매출, 이익률, 현금, 부채 등이 여기 포함됨
            "fundProfile", // ETF 정보 (운용 보수 등)
            "topHoldings", // ETF 섹터 비중 분석을 위해 필요
            "price", // 기본 가격 정보
          ],
        })
        .catch(() => null),
      // 동적 기간 및 간격 적용
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

    // 대표 섹터 판별 로직
    let displaySector = "Unknown";
    let formattedSectorWeightings: { sector: string; weight: number }[] = [];
    const sProfile = summary?.summaryProfile;
    const topHoldings = summary?.topHoldings;

    // 1. 상세 비중 데이터 추출 및 포맷팅 (ETF용)
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
      // 비중 높은 순으로 정렬
      formattedSectorWeightings.sort((a, b) => b.weight - a.weight);
    }

    // 2. 대표 섹터(displaySector) 판별
    // (A) 주식: 명확한 정보 우선
    if (sProfile?.sector) {
      displaySector = sProfile.sector;
    }
    // (B) ETF: 상세 비중 중 1등 선택
    else if (formattedSectorWeightings.length > 0) {
      displaySector = formattedSectorWeightings[0].sector;
    }

    // 1. 차트 데이터 포맷팅
    const chartData = (chartResult.quotes || [])
      .filter((q: any) => q.date && (q.adjClose || q.close))
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        close: q.adjClose || q.close,
        volume: q.volume,
      }));

    // 2. 뉴스 데이터 포맷팅
    const news = (newsResult.news || []).map((n: any) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      providerPublishTime: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    }));

    // 3. 펀더멘털(재무) 데이터 매핑
    const sDetail = summary?.summaryDetail || {};
    const sStats = summary?.defaultKeyStatistics || {};
    const sFin = summary?.financialData || {};
    const sFund = summary?.fundProfile || {};

    const fundamentals = {
      // 1. 가치 평가 (Valuation)
      marketCap: sDetail.marketCap || quote.marketCap, // 시가총액
      trailingPE: sDetail.trailingPE || quote.trailingPE, // PER (현재)
      forwardPE: sStats.forwardPE || quote.forwardPE, // PER (미래)
      priceToBook: sStats.priceToBook || quote.priceToBook, // PBR

      // 2. 수익성 (Profitability)
      eps: sStats.trailingEps || quote.epsTrailingTwelveMonths, // EPS
      profitMargins: sFin.profitMargins, // 순이익률 (예: 0.25)

      // 3. 성장 및 규모 (Growth & Scale)
      totalRevenue: sFin.totalRevenue, // 총 매출액

      // 4. 재무 건전성 (Financial Health)
      totalCash: sFin.totalCash, // 보유 현금
      totalDebt: sFin.totalDebt, // 총 부채

      // 5. 배당 및 변동성 (Dividend & Risk)
      dividendYield: sDetail.dividendYield || quote.dividendYield, // 배당률
      beta: sStats.beta || quote.beta, // 베타

      // 6. 전문가 의견 (Analysis)
      targetPrice: sFin.targetMeanPrice, // 목표 주가
      recommendationKey: sFin.recommendationKey, // 'strong_buy', 'hold' 등

      // 7. ETF/펀드 전용
      netAssets: sFund.totalAssets,
      expenseRatio: sFund.feesExpensesInvestment?.annualReportExpenseRatio,

      // 배열이 비어있으면(주식인 경우) undefined 처리하여 깔끔하게 보냄
      sectorWeightings:
        formattedSectorWeightings.length > 0
          ? formattedSectorWeightings
          : undefined,

      // 8. 공통 시장 데이터
      fiftyTwoWeekHigh: sDetail.fiftyTwoWeekHigh || quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sDetail.fiftyTwoWeekLow || quote.fiftyTwoWeekLow,
      volume: sDetail.volume || quote.regularMarketVolume,
      circulatingSupply: quote.circulatingSupply,
    };

    // 4. 최종 응답 구조 조립
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
