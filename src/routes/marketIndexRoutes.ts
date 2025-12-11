import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getSP500Series,
  getDowJonesSeries,
  getNasdaqSeries,
  getKospiSeries,
  getKosdaqSeries,
} from "../controllers/marketIndexController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: MarketIndex
 *     description: Market index time series (S&P 500, Dow Jones, Nasdaq, KOSPI, KOSDAQ)
 */

/**
 * @swagger
 * /api/market-index/sp500:
 *   get:
 *     summary: S&P 500 시계열 (포트폴리오 차트 파라미터와 동일)
 *     tags:
 *       - MarketIndex
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         required: false
 *         schema:
 *           type: string
 *         description: 포트폴리오 전체 기간과 정렬해 조회 (소유자만 사용 가능)
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 시작일(YYYY-MM-DD). range가 우선하며, 미입력 시 포트폴리오 첫 거래일/기본 1년을 사용
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 1mo, 3mo, 6mo, 1y, 3y, max]
 *         description: 오늘 기준 상대 기간. max는 포트폴리오 첫 거래일부터 오늘까지
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *         description: 조회 간격(종료일은 항상 오늘 고정)
 *     responses:
 *       '200':
 *         description: 시계열 조회 성공
 */
router.get("/sp500", protect, getSP500Series);

/**
 * @swagger
 * /api/market-index/dowjones:
 *   get:
 *     summary: Dow Jones 시계열 (포트폴리오 차트 파라미터와 동일)
 *     tags:
 *       - MarketIndex
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 1mo, 3mo, 6mo, 1y, 3y, max]
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *     responses:
 *       '200':
 *         description: 시계열 조회 성공
 */
router.get("/dowjones", protect, getDowJonesSeries);

/**
 * @swagger
 * /api/market-index/nasdaq:
 *   get:
 *     summary: Nasdaq 시계열 (포트폴리오 차트 파라미터와 동일)
 *     tags:
 *       - MarketIndex
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 1mo, 3mo, 6mo, 1y, 3y, max]
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *     responses:
 *       '200':
 *         description: 시계열 조회 성공
 */
router.get("/nasdaq", protect, getNasdaqSeries);

/**
 * @swagger
 * /api/market-index/kospi:
 *   get:
 *     summary: KOSPI 시계열 (포트폴리오 차트 파라미터와 동일)
 *     tags:
 *       - MarketIndex
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 1mo, 3mo, 6mo, 1y, 3y, max]
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *     responses:
 *       '200':
 *         description: 시계열 조회 성공
 */
router.get("/kospi", protect, getKospiSeries);

/**
 * @swagger
 * /api/market-index/kosdaq:
 *   get:
 *     summary: KOSDAQ 시계열 (포트폴리오 차트 파라미터와 동일)
 *     tags:
 *       - MarketIndex
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: portfolioId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: [7d, 1mo, 3mo, 6mo, 1y, 3y, max]
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1wk, 1mo, 3mo]
 *           default: "1d"
 *     responses:
 *       '200':
 *         description: 시계열 조회 성공
 */
router.get("/kosdaq", protect, getKosdaqSeries);

export default router;
