import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import yahooFinance from "../config/yahooFinance.js";

type IndexMeta = {
  symbol: string;
  name: string;
};

type HistoricalPoint = {
  date: string;
  value: number;
};

// 포트폴리오 차트 API와 비교가 깔끔하도록 인터벌을 동일하게 설정
type ChartInterval = "1d" | "5d" | "1wk" | "1mo" | "3mo";

type ChartRangeOption =
  | "7d"
  | "1mo"
  | "3mo"
  | "6mo"
  | "1y"
  | "3y"
  | "max";

const INDICES: Record<string, IndexMeta> = {
  sp500: { symbol: "^GSPC", name: "S&P 500" },
  dowjones: { symbol: "^DJI", name: "Dow Jones Industrial Average" },
  nasdaq: { symbol: "^IXIC", name: "Nasdaq Composite" },
  kospi: { symbol: "^KS11", name: "KOSPI" },
  kosdaq: { symbol: "^KQ11", name: "KOSDAQ" },
};

const formatDateToYMD = (date: Date): string =>
  date.toISOString().split("T")[0]!;

const sanitizeInterval = (interval?: string): ChartInterval => {
  const allowed = new Set<ChartInterval>(["1d", "5d", "1wk", "1mo", "3mo"]);
  if (interval && allowed.has(interval as ChartInterval))
    return interval as ChartInterval;
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

const findEarliestTransactionDate = async (
  portfolioId?: string
): Promise<Date | null> => {
  if (!portfolioId) return null;
  const earliestTx = await Transaction.findOne({
    portfolio: portfolioId,
  })
    .sort({ transactionDate: 1 })
    .select("transactionDate");

  if (!earliestTx?.transactionDate) return null;
  return new Date(earliestTx.transactionDate);
};

const resolveDateRange = (
  range: string | undefined,
  startDateInput: string | undefined,
  earliestTxDate: Date | null
): { startDate: Date; endDate: Date } => {
  const today = new Date();
  const defaultStart = new Date();
  defaultStart.setFullYear(today.getFullYear() - 1);

  const normalizedRange = normalizeRange(range);
  const parsedStart = startDateInput ? new Date(startDateInput) : undefined;
  const rangeStart = rangeStartDate(normalizedRange, today);

  let startDate = defaultStart;

  if (parsedStart && !isNaN(parsedStart.getTime())) {
    startDate = parsedStart;
  }

  if (rangeStart) {
    startDate = rangeStart;
  }

  if (!parsedStart && !rangeStart && earliestTxDate) {
    startDate = earliestTxDate;
  }

  if (normalizedRange === "max" && earliestTxDate) {
    startDate = earliestTxDate;
  }

  const endDate = today;

  if (startDate > endDate) return { startDate: defaultStart, endDate: today };
  return { startDate, endDate };
};

const fetchIndexSeries = async (
  index: IndexMeta,
  startDate: Date,
  endDate: Date,
  interval: ChartInterval
): Promise<HistoricalPoint[]> => {
  const result = await yahooFinance.chart(index.symbol, {
    period1: formatDateToYMD(startDate),
    period2: formatDateToYMD(endDate),
    interval,
  });

  const quotes = (result as any)?.quotes || [];

  return quotes
    .filter((q: any) => q.date && (q.adjClose || q.close))
    .map((q: any) => ({
      date: formatDateToYMD(new Date(q.date)),
      value: q.adjClose || q.close,
    }));
};

const buildHandler =
  (key: keyof typeof INDICES) => async (req: AuthRequest, res: Response) => {
    try {
      const { range, startDate: startDateInput } = req.query as {
        range?: string;
        startDate?: string;
      };
      const portfolioId = req.query.portfolioId as string | undefined;

      let earliestTxDate: Date | null = null;
      if (portfolioId) {
        const portfolio = await Portfolio.findById(portfolioId);
        if (!portfolio) {
          return res.status(404).json({ message: "Portfolio not found" });
        }
        if (
          !req.user ||
          (portfolio.user as any).toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
        earliestTxDate = await findEarliestTransactionDate(portfolioId);
      }

      const interval = sanitizeInterval(req.query.interval as string);
      const { startDate, endDate } = resolveDateRange(
        range,
        startDateInput,
        earliestTxDate
      );

      const index = INDICES[key];
      const data = await fetchIndexSeries(index, startDate, endDate, interval);

      res.status(200).json({
        index: index.name,
        symbol: index.symbol,
        portfolioId: portfolioId || undefined,
        interval,
        range: normalizeRange(range) || undefined,
        startDate: formatDateToYMD(startDate),
        endDate: formatDateToYMD(endDate),
        data,
      });
    } catch (error) {
      console.error(`[MarketIndex] ${INDICES[key].name} fetch failed:`, error);
      res.status(500).json({ message: "Market index fetch error" });
    }
  };

export const getSP500Series = buildHandler("sp500");
export const getDowJonesSeries = buildHandler("dowjones");
export const getNasdaqSeries = buildHandler("nasdaq");
export const getKospiSeries = buildHandler("kospi");
export const getKosdaqSeries = buildHandler("kosdaq");
