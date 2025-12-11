import mongoose, { Schema, Document } from "mongoose";
import type { IPortfolio } from "./Portfolio.js";
import type { IAsset } from "./Asset.js";

export interface ITransaction extends Document {
  portfolio: IPortfolio["_id"];
  asset: IAsset["_id"];
  transactionType: "BUY" | "SELL";
  quantity: number;
  price: number;
  currency: string;
  transactionDate: Date;
}

const TransactionSchema: Schema = new Schema({
  portfolio: {
    type: Schema.Types.ObjectId,
    ref: "Portfolio",
    required: true,
  },
  asset: {
    type: Schema.Types.ObjectId,
    ref: "Asset",
    required: true,
  },
  transactionType: {
    type: String,
    enum: ["BUY", "SELL"], // 'BUY' 또는 'SELL' 값만 허용
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  transactionDate: {
    type: Date,
    required: true,
  },
});

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       description: 단일 거래 내역 정보 응답
 *       properties:
 *         _id:
 *           type: string
 *           example: "690c29...00ce"
 *         portfolio:
 *           type: string
 *           description: 이 거래가 속한 포트폴리오 ID
 *           example: "690b6c...f6753"
 *         asset:
 *           type: string
 *           description: 거래된 자산(Asset) ID
 *           example: "690c29...00cc"
 *         transactionType:
 *           type: string
 *           enum: [BUY, SELL]
 *           example: "BUY"
 *         quantity:
 *           type: number
 *           example: 5
 *         price:
 *           type: number
 *           example: 1000
 *         currency:
 *           type: string
 *           example: "USD"
 *         transactionDate:
 *           type: string
 *           format: date-time
 *           example: "2025-01-06T00:00:00.000Z"
 *
 *     NewTransactionBody:
 *       type: object
 *       description: 새 거래 추가 시 Request Body (addTransaction)
 *       required: [assetTicker, transactionType, quantity, price, currency, transactionDate]
 *       properties:
 *         assetTicker:
 *           type: string
 *           description: 거래할 자산의 티커 (예시 AAPL)
 *           example: "AAPL"
 *         transactionType:
 *           type: string
 *           enum: [BUY, SELL]
 *           example: "BUY"
 *         quantity:
 *           type: number
 *           example: 10
 *         price:
 *           type: number
 *           example: 150
 *         currency:
 *           type: string
 *           example: "USD"
 *         transactionDate:
 *           type: string
 *           format: date
 *           description: 거래 날짜 (YYYY-MM-DD)
 *           example: "2025-01-10"
 *
 *     UpdateTransactionBody:
 *       type: object
 *       description: 거래 수정 시 Request Body
 *       properties:
 *         transactionType:
 *           type: string
 *           enum: [BUY, SELL]
 *         quantity:
 *           type: number
 *           example: 12
 *         price:
 *           type: number
 *           example: 155
 *         transactionDate:
 *           type: string
 *           format: date
 *           example: "2025-01-11"
 *         currency:
 *           type: string
 *           example: "USD"
 */
