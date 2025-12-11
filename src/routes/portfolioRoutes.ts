import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createPortfolio,
  getMyPortfolios,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioSummary,
  getPortfolioChartData,
  runSimulation,
  getAssetDetails,
} from "../controllers/portfolioController.js";
import {
  addTransaction,
  getTransactions,
} from "../controllers/transactionController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Portfolios
 *     description: 포트폴리오 관리 및 대시보드
 *   - name: Transactions
 *     description: 포트폴리오 내 거래 내역 관리
 */

/**
 * @swagger
 * /api/portfolios:
 *   get:
 *     summary: 내 모든 포트폴리오 조회
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 조회 성공
 *
 *   post:
 *     summary: 새 포트폴리오 생성
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/NewPortfolioBody"
 *     responses:
 *       '201':
 *         description: 생성 성공
 */
router.route("/").get(protect, getMyPortfolios).post(protect, createPortfolio);

/**
 * @swagger
 * /api/portfolios/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: 포트폴리오 ID
 *
 *   get:
 *     summary: 특정 포트폴리오 상세 조회
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 조회 성공
 *
 *   put:
 *     summary: 포트폴리오 수정
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PortfolioUpdate"
 *     responses:
 *       '200':
 *         description: 수정 성공
 *
 *   delete:
 *     summary: 포트폴리오 삭제
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 삭제 성공
 */
router
  .route("/:id")
  .get(protect, getPortfolioById)
  .put(protect, updatePortfolio)
  .delete(protect, deletePortfolio);

/**
 * @swagger
 * /api/portfolios/{id}/summary:
 *   get:
 *     summary: 포트폴리오 대시보드 (요약 정보)
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 포트폴리오 ID
 *     responses:
 *       '200':
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PortfolioSummary"
 */
router.get("/:id/summary", protect, getPortfolioSummary);

/**
 * @swagger
 * /api/portfolios/{id}/chart:
 *   get:
 *     summary: 포트폴리오 차트 시계열 데이터 조회
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 포트폴리오 ID
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: (옵션) range 미사용 시 직접 지정하는 조회 시작일, 종료일은 항상 오늘 (YYYY-MM-DD)
 *       - in: query
 *         name: range
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["7d", "1mo", "3mo", "6mo", "1y", "3y", "max"]
 *         description: 조회 시작일을 오늘 기준으로 설정 (종료일은 오늘 고정, max는 모든 거래일 포함)
 *       - in: query
 *         name: interval
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["1d", "5d", "1wk", "1mo", "3mo"]
 *           default: "1d"
 *         description: 조회 간격 (요청한 간격으로 로컬 리샘플링)
 *     responses:
 *       "200":
 *         description: 조회 성공 (시장지수 제외, 포트폴리오 시계열만 반환)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PortfolioChartData"
 */
router.get("/:id/chart", protect, getPortfolioChartData);

/**
 * @swagger
 * /api/portfolios/{id}/transactions:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: 포트폴리오 ID
 *
 *   get:
 *     summary: 거래 내역 목록 조회
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 조회 성공
 *
 *   post:
 *     summary: 새 거래 내역 추가
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/NewTransactionBody"
 *     responses:
 *       '201':
 *         description: 생성 성공
 */
router
  .route("/:id/transactions")
  .get(protect, getTransactions)
  .post(protect, addTransaction);

/**
 * @swagger
 * /api/portfolios/{id}/assets/{assetTicker}:
 *   get:
 *     summary: 포트폴리오 내 특정 종목 상세 분석
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetTicker
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: 조회 성공
 */
router.get("/:id/assets/:assetTicker", protect, getAssetDetails);

/**
 * @swagger
 * /api/portfolios/simulations/what-if:
 *   post:
 *     summary: What-if 시뮬레이션
 *     tags:
 *       - Portfolios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/WhatIfRequest"
 *     responses:
 *       '200':
 *         description: 시뮬레이션 성공
 */
router.post("/simulations/what-if", protect, runSimulation);

export default router;


