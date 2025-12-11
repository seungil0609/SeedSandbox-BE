import type { Request, Response, RequestHandler } from "express";
import { Types } from "mongoose";
import Transaction from "../models/Transaction.js";
import Portfolio from "../models/Portfolio.js";
import Asset from "../models/Asset.js";
import { createRequire } from "module";
import { triggerAiAnalysis } from "../services/aiService.js";

const require = createRequire(import.meta.url);
const YahooFinance = require("yahoo-finance2").default;

// 유틸리티: 섹터 이름 포맷팅
const formatSectorName = (rawName: string) => {
  return rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// 인터페이스 정의
interface UserFromMiddleware {
  _id: Types.ObjectId;
}
interface CustomRequest extends Request {
  user?: UserFromMiddleware;
}

export const addTransaction: RequestHandler = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "인증 정보가 없습니다." });

    const portfolioId = req.params.id;
    const userId = req.user._id;
    const { assetTicker, transactionType, quantity, price, transactionDate } =
      req.body;

    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) return res.status(404).json({ message: "포트폴리오 없음" });
    if ((portfolio.user as Types.ObjectId).toString() !== userId.toString()) {
      return res.status(401).json({ message: "권한 없음" });
    }

    const yf = new YahooFinance();
    let detectedCurrency = "USD";
    let foundItem = null;

    try {
      const quote = await yf.quote(assetTicker);
      if (quote) {
        detectedCurrency = quote.currency || "USD";
        foundItem = quote;
      }
    } catch (e) {
      console.warn(`[Transaction] 통화 정보 조회 실패 (${assetTicker}):`, e);
    }

    let asset = await Asset.findOne({ ticker: assetTicker });

    if (!asset) {
      console.log(`[Auto-Asset] '${assetTicker}' 신규 등록 시작...`);
      try {
        if (!foundItem) {
          const searchResult = await yf.search(assetTicker);
          foundItem = searchResult.quotes[0];
        }

        if (!foundItem)
          return res.status(404).json({
            message: `Yahoo에서 '${assetTicker}'를 찾을 수 없습니다.`,
          });

        const summary = await yf.quoteSummary(foundItem.symbol, {
          modules: ["summaryProfile", "topHoldings", "fundProfile"],
        });

        let sector = foundItem.sector || "Unknown";
        const sectorWeights: Record<string, number> = {};

        // (1) 주식: 단일 섹터 100%
        if (summary.summaryProfile?.sector) {
          sector = summary.summaryProfile.sector;
          sectorWeights[sector] = 1.0;
        }
        // (2) ETF: 상세 섹터 비중 분해
        else if (summary.topHoldings?.sectorWeightings?.length > 0) {
          let maxW = -1;
          let maxN = "";
          summary.topHoldings.sectorWeightings.forEach((item: any) => {
            for (const [k, v] of Object.entries(item)) {
              const w = typeof v === "number" ? v : 0;
              const name = formatSectorName(k);
              if (w > 0) sectorWeights[name] = w;
              if (w > maxW) {
                maxW = w;
                maxN = name;
              }
            }
          });
          // 가장 비중 큰 걸 대표 섹터로 설정
          if (maxN) sector = maxN;
        }

        asset = await Asset.create({
          ticker: foundItem.symbol,
          name: foundItem.shortname || foundItem.symbol,
          assetType: foundItem.quoteType,
          sector: sector,
          sectorWeights: sectorWeights,
        });
      } catch (err) {
        console.error("자산 자동 등록 실패:", err);
        return res
          .status(500)
          .json({ message: "자산 정보 조회 중 오류가 발생했습니다." });
      }
    }

    const newTransaction = await Transaction.create({
      portfolio: portfolioId,
      asset: asset._id,
      transactionType,
      quantity,
      price,
      currency: detectedCurrency,
      transactionDate,
    });

    triggerAiAnalysis(portfolioId).catch((err) =>
      console.error("AI Trigger Error:", err)
    );

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error("거래 추가 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const deleteTransaction: RequestHandler = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const transactionId = req.params.transactionId;
    if (!req.user)
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    const userId = req.user._id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction)
      return res.status(404).json({ message: "거래 내역 없음" });

    // 타입 에러 방지를 위해 (transaction as any) 사용
    const portfolioId = (transaction as any).portfolio.toString();

    const portfolio = await Portfolio.findById(portfolioId);
    if (
      !portfolio ||
      (portfolio.user as Types.ObjectId).toString() !== userId.toString()
    ) {
      return res.status(401).json({ message: "권한 없음" });
    }

    await Transaction.findByIdAndDelete(transactionId);

    triggerAiAnalysis(portfolioId).catch((err) =>
      console.error("AI Trigger Error:", err)
    );
    res.status(200).json({ message: "삭제 완료" });
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const updateTransaction: RequestHandler = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const transactionId = req.params.transactionId;
    if (!req.user)
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    const userId = req.user._id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction)
      return res.status(404).json({ message: "거래 내역 없음" });

    const portfolio = await Portfolio.findById(transaction.portfolio);
    if (
      !portfolio ||
      (portfolio.user as Types.ObjectId).toString() !== userId.toString()
    ) {
      return res.status(401).json({ message: "권한 없음" });
    }

    const updated = await Transaction.findByIdAndUpdate(
      transactionId,
      req.body,
      { new: true }
    );

    if (updated) {
      // 타입 에러 방지를 위해 (updated as any) 사용
      triggerAiAnalysis((updated as any).portfolio.toString()).catch((err) =>
        console.error("AI Trigger Error:", err)
      );
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};

export const getTransactions: RequestHandler = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    if (!req.user) return res.status(401).json({ message: "인증 정보 없음" });
    const portfolio = await Portfolio.findById(req.params.id);
    if (
      !portfolio ||
      (portfolio.user as Types.ObjectId).toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: "권한 없음" });
    }
    const transactions = await Transaction.find({
      portfolio: req.params.id,
    }).populate("asset");
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "서버 에러" });
  }
};
