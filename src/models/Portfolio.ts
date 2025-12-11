import mongoose, { Schema, Document } from "mongoose";
import type { IUser } from "./User.js";

export interface IPortfolio extends Document {
  user: IUser["_id"];
  name: string;
  baseCurrency: string;
  // AI 요약 멘트 저장
  aiSummary?: string;
  // AI 분석 중인지 여부 (로딩 처리용)
  isAnalyzing: boolean;
  createdAt: Date;
}

const PortfolioSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  baseCurrency: {
    type: String,
    required: true,
    default: "KRW",
  },
 
  aiSummary: {
    type: String,
    default: "거래 내역을 추가하면 AI가 분석을 시작합니다.",
  },
 
  isAnalyzing: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPortfolio>("Portfolio", PortfolioSchema);
/**
 * @swagger
 * components:
 *   schemas:
 *
 *     Portfolio:
 *       type: object
 *       description: 포트폴리오 정보
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         name:
 *           type: string
 *         baseCurrency:
 *           type: string
 *           example: "KRW"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     NewPortfolioBody:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 *         baseCurrency:
 *           type: string
 *           example: "USD"
 *
 *     PortfolioUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         baseCurrency:
 *           type: string
 *
 *     PortfolioAssetSummary:
 *       type: object
 *       description: 포트폴리오 내 자산 요약 정보
 *       properties:
 *         ticker:
 *           type: string
 *         name:
 *           type: string
 *         sector:
 *           type: string
 *         sectorWeights:
 *           type: object
 *           additionalProperties:
 *             type: number
 *         quantity:
 *           type: number
 *           example: 12
 *         averagePrice:
 *           type: number
 *           example: 150.2
 *         currentPrice:
 *           type: number
 *           example: 170.1
 *         currency:
 *           type: string
 *           example: "USD"
 *         totalValue:
 *           type: number
 *           description: 현재 평가 금액
 *           example: 2041.2
 *         returnRate:
 *           type: number
 *           description: 수익률 (%)
 *           example: 13.5
 *
 *     PortfolioSummary:
 *       type: object
 *       description: 포트폴리오 대시보드 응답
 *       properties:
 *         portfolioId:
 *           type: string
 *         name:
 *           type: string
 *         baseCurrency:
 *           type: string
 *         exchangeRate:
 *           type: number
 *           example: 1330.5
 *         totalPortfolioValue:
 *           type: number
 *         totalPortfolioCostBasis:
 *           type: number
 *         totalPortfolioProfitLoss:
 *           type: number
 *         totalPortfolioReturnPercentage:
 *           type: number
 *         assets:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PortfolioAssetSummary'
 *
 *     PortfolioHistoricalPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           example: "2024-01-01"
 *         value:
 *           type: number
 *           example: 10500
 *
 *     PortfolioChartData:
 *       type: object
 *       properties:
 *         historicalChartData:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PortfolioHistoricalPoint'
 *
 *     PortfolioAssetAnalytics:
 *       type: object
 *       properties:
 *         ticker:
 *           type: string
 *         name:
 *           type: string
 *         sector:
 *           type: string
 *         totalQuantity:
 *           type: number
 *         averageBuyPrice:
 *           type: number
 *         currentPrice:
 *           type: number
 *         totalProfitLoss:
 *           type: number
 *         returnPercentage:
 *           type: number
 *         chartData:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               price:
 *                 type: number
 *         transactions:
 *           type: array
 *           items:
 *             type: object
 *
 *     WhatIfRequest:
 *       type: object
 *       required:
 *         - assetTicker
 *         - additionalQuantity
 *         - additionalPrice
 *       properties:
 *         assetTicker:
 *           type: string
 *         additionalQuantity:
 *           type: number
 *         additionalPrice:
 *           type: number
 *
 *     WhatIfResult:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         simulationResult:
 *           type: object
 *           properties:
 *             newAvgPrice:
 *               type: number
 *             newTotalQuantity:
 *               type: number
 *         aiSummary:
 *           type: string
 *           description: "AI가 미리 생성해둔 포트폴리오 요약"
 *           example: "• 기술주 중심의 고수익 추구형입니다.\n• NVDA 비중이 40%로 높아 리스크 관리가 필요합니다."
 *         isAnalyzing:
 *           type: boolean
 *           description: "현재 AI가 분석 중인지 여부"
 *           example: false
 */
