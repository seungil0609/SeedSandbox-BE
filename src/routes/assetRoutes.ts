import express from "express";
import {
  searchAssets,
  getAssetDetails,
} from "../controllers/assetController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Assets
 *     description: 자산(종목) 검색 및 상세 정보
 */

/**
 * @swagger
 * /api/assets/search:
 *   get:
 *     summary: "자산 검색 (검색어)"
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: "검색어 (예: Apple, NVDA)"
 *     responses:
 *       200:
 *         description: "검색 성공"
 */
router.get("/search", searchAssets);

/**
 * @swagger
 * /api/assets/details/{ticker}:
 *   get:
 *     summary: "자산 상세 정보 조회 (차트, 재무, 뉴스)"
 *     description: "특정 종목의 상세 정보를 조회합니다. range와 interval 파라미터를 사용하여 차트 데이터를 필터링할 수 있습니다. 자산 유형에 따라 fundamentals 필드가 유동적으로 반환됩니다."
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *         description: "종목 티커 (예: AAPL, SPY, BTC-USD)"
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["7d", "1mo", "3mo", "6mo", "1y", "3y", "max"]
 *           default: "1y"
 *         description: "차트 조회 기간 (오늘 기준)"
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["1d", "5d", "1wk", "1mo", "3mo"]
 *           default: "1d"
 *         description: "차트 캔들 간격"
 *     responses:
 *       200:
 *         description: "조회 성공"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                       example: "AAPL"
 *                     shortName:
 *                       type: string
 *                       example: "Apple Inc."
 *                     regularMarketPrice:
 *                       type: number
 *                       example: 172.5
 *                     assetType:
 *                       type: string
 *                       example: "EQUITY"
 *                     sector:
 *                       type: string
 *                       example: "Technology"
 *                 fundamentals:
 *                   type: object
 *                   description: "값이 없는 필드는 반환되지 않음"
 *                   properties:
 *                     marketCap:
 *                       type: number
 *                       description: "시가총액"
 *                     trailingPE:
 *                       type: number
 *                       description: "PER (과거)"
 *                     forwardPE:
 *                       type: number
 *                       description: "PER (선행)"
 *                     eps:
 *                       type: number
 *                       description: "주당순이익"
 *                     profitMargins:
 *                       type: number
 *                       description: "순이익률 (0.1 = 10%)"
 *                     totalRevenue:
 *                       type: number
 *                       description: "총 매출액"
 *                     totalCash:
 *                       type: number
 *                       description: "보유 현금"
 *                     totalDebt:
 *                       type: number
 *                       description: "총 부채"
 *                     recommendationKey:
 *                       type: string
 *                       description: "전문가 의견"
 *                       example: "buy"
 *                     targetPrice:
 *                       type: number
 *                       description: "목표 주가"
 *                     dividendYield:
 *                       type: number
 *                       description: "배당률"
 *                     expenseRatio:
 *                       type: number
 *                       description: "ETF 운용 보수"
 *                     sectorWeightings:
 *                       type: array
 *                       description: "ETF 섹터 비중 (ETF일 경우에만 존재)"
 *                       items:
 *                         type: object
 *                         properties:
 *                           sector:
 *                             type: string
 *                             example: "Technology"
 *                           weight:
 *                             type: number
 *                             example: 0.3
 *                 chartData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       close:
 *                         type: number
 *                       volume:
 *                         type: number
 *                 news:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       link:
 *                         type: string
 *                       publisher:
 *                         type: string
 *       404:
 *         description: "종목을 찾을 수 없음"
 */
router.get("/details/:ticker", getAssetDetails);

export default router;
