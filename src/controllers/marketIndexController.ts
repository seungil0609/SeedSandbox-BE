import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import yahooFinance from "../config/yahooFinance.js";

type IndexMeta = { symbol: string; name: string };
type HistoricalPoint = { date: string; value: number };
type ChartInterval = "1d" | "5d" | "1wk" | "1mo" | "3mo";
type ChartRangeOption = "7d" | "1mo" | "3mo" | "6mo" | "1y" | "3y" | "max";

const INDICES: Record<string, IndexMeta> = {
  sp500: { symbol: "^GSPC", name: "S&P 500" },
  dowjones: { symbol: "^DJI", name: "Dow Jones" },
  nasdaq: { symbol: "^IXIC", name: "Nasdaq" },
  kospi: { symbol: "^KS11", name: "KOSPI" },
  kosdaq: { symbol: "^KQ11", name: "KOSDAQ" },
};

const formatDateToYMD = (date: Date): string =>
  date.toISOString().split("T")[0]!;

const sanitizeInterval = (interval?: string): ChartInterval => {
  const allowed = new Set<ChartInterval>(["1d", "5d", "1wk", "1mo", "3mo"]);
  return interval && allowed.has(interval as ChartInterval)
    ? (interval as ChartInterval)
    : "1d";
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

// 🟢 [추가] 날짜 채우기 함수
const fillMissingDates = (
  data: HistoricalPoint[],
  start: Date,
  end: Date
): HistoricalPoint[] => {
  const filled: HistoricalPoint[] = [];
  const dateMap = new Map(data.map((d) => [d.date, d.value]));

  let current = new Date(start);
  let lastValue = data.length > 0 ? data[0].value : 0; // 초기값

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];

    if (dateMap.has(dateStr)) {
      lastValue = dateMap.get(dateStr)!; // 데이터 있으면 갱신
    }

    // 데이터가 없으면(주말) lastValue(금요일 종가)를 그대로 사용
    filled.push({ date: dateStr, value: lastValue });
    current.setDate(current.getDate() + 1);
  }
  return filled;
};

const resolveDateRange = (
  range: string | undefined,
  startDateInput: string | undefined
): { startDate: Date; endDate: Date } => {
  const today = new Date();
  const defaultStart = new Date();
  defaultStart.setFullYear(today.getFullYear() - 1);

  const normalizedRange = normalizeRange(range);
  const parsedStart = startDateInput ? new Date(startDateInput) : undefined;
  const rangeStart = rangeStartDate(normalizedRange, today);

  let startDate = rangeStart || parsedStart || defaultStart;
  if (normalizedRange === "max") startDate = new Date("2020-01-01"); // MAX 기본값

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
  try {
    const result = await yahooFinance.chart(index.symbol, {
      period1: formatDateToYMD(startDate),
      period2: formatDateToYMD(endDate),
      interval,
    });

    const quotes = (result as any)?.quotes || [];
    let rawPoints = quotes
      .filter((q: any) => q.date && (q.adjClose || q.close))
      .map((q: any) => ({
        date: formatDateToYMD(new Date(q.date)),
        value: q.adjClose || q.close,
      }));

    if (rawPoints.length === 0) return [];

    // 🟢 [수정] 1일 간격일 때만 주말 데이터 채우기 (빈 날짜 메우기)
    if (interval === "1d") {
      rawPoints = fillMissingDates(rawPoints, startDate, endDate);
    }

    // 정규화 (Normalization): 첫 데이터 기준 수익률(%)로 변환
    const baseValue = rawPoints[0].value;
    return rawPoints.map((p: any) => ({
      date: p.date,
      value: Number((((p.value - baseValue) / baseValue) * 100).toFixed(2)),
    }));
  } catch (error) {
    console.error("Index fetch error:", error);
    return [];
  }
};

const buildHandler =
  (key: keyof typeof INDICES) => async (req: AuthRequest, res: Response) => {
    try {
      const { range, startDate: startDateInput, interval } = req.query as any;

      // 포트폴리오 ID가 있어도, 차트 비교를 위해 무조건 사용자 요청 기간을 사용함
      const { startDate, endDate } = resolveDateRange(range, startDateInput);
      const safeInterval = sanitizeInterval(interval);

      const index = INDICES[key];
      const data = await fetchIndexSeries(
        index,
        startDate,
        endDate,
        safeInterval
      );

      res.status(200).json({
        index: index.name,
        symbol: index.symbol,
        interval: safeInterval,
        range: normalizeRange(range),
        startDate: formatDateToYMD(startDate),
        endDate: formatDateToYMD(endDate),
        data,
      });
    } catch (error) {
      console.error(`[MarketIndex] ${INDICES[key].name} error:`, error);
      res.status(500).json({ message: "Error" });
    }
  };

export const getSP500Series = buildHandler("sp500");
export const getDowJonesSeries = buildHandler("dowjones");
export const getNasdaqSeries = buildHandler("nasdaq");
export const getKospiSeries = buildHandler("kospi");
export const getKosdaqSeries = buildHandler("kosdaq");
