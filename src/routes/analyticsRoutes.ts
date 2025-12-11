import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getRiskMetrics } from "../controllers/analyticsController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: 고급 분석 및 데이터 스냅샷
 */

/**
 * @swagger
 * /api/analytics/risk/{id}:
 *   get:
 *     summary: 포트폴리오 리스크 분석 (벤치마크 선택 가능)
 *     description: |
 *       내 포트폴리오의 리스크 지표를 조회합니다.
 *       - **항상 반환**: 변동성, MDD, 샤프지수, 상관계수(내 종목 간)
 *       - **선택 시 추가 반환**: 베타(Beta), 벤치마크 정보(시장 변동성/MDD/샤프지수)
 *       (벤치마크를 선택하지 않으면 `beta`와 `benchmark` 필드는 응답에서 제외됩니다.)
 *     tags:
 *       - Analytics
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
 *         name: benchmark
 *         required: false
 *         schema:
 *           type: string
 *           enum: [sp500, dowjones, nasdaq, kospi, kosdaq]
 *         description: "비교할 벤치마크 지수 (선택 시에만 베타 및 벤치마크 데이터 계산)"
 *     responses:
 *       '200':
 *         description: 분석 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     volatility:
 *                       type: number
 *                       description: 내 포트폴리오 연환산 변동성
 *                     maxDrawdown:
 *                       type: number
 *                       description: 내 포트폴리오 최대 낙폭
 *                     sharpeRatio:
 *                       type: number
 *                       description: 내 포트폴리오 샤프 지수 (무위험 이자율 4.14% 반영)
 *                     correlationMatrix:
 *                       type: object
 *                       description: "내 보유 종목 간의 상관계수 행렬 (항상 반환)"
 *                     beta:
 *                       type: number
 *                       description: "시장 민감도 (벤치마크 선택 시에만 포함됨)"
 *                     benchmark:
 *                       type: object
 *                       description: "선택한 벤치마크 정보 (벤치마크 선택 시에만 포함됨)"
 *                       properties:
 *                         symbol:
 *                           type: string
 *                         name:
 *                           type: string
 *                         volatility:
 *                           type: number
 *                           description: 벤치마크 변동성 (비교용)
 *                         maxDrawdown:
 *                           type: number
 *                           description: 벤치마크 MDD (비교용)
 *                         sharpeRatio:
 *                           type: number
 *                           description: 벤치마크 샤프지수 (비교용)
 */
router.get("/risk/:id", protect, getRiskMetrics);

export default router;
