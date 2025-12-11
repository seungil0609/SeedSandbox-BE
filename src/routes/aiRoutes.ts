import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAiAnalysis } from "../controllers/aiController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: AI
 *     description: AI 기반 포트폴리오 분석 (미리 생성된 요약 조회)
 */

/**
 * @swagger
 * /api/ai/summary/{portfolioId}:
 *   get:
 *     summary: 포트폴리오 AI 요약 조회
 *     description: DB에 저장된 AI 분석 요약을 즉시 반환합니다. (분석은 거래 내역 변경 시 백그라운드에서 수행됨)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         required: true
 *         schema:
 *           type: string
 *         description: 포트폴리오 ID
 *     responses:
 *       "200":
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiSummaryResponse'
 *       "404":
 *         description: 포트폴리오 없음
 */

// GET /summary/:portfolioId 사용
router.get("/summary/:portfolioId", protect, getAiAnalysis);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     AiSummaryResponse:
 *       type: object
 *       properties:
 *         summary:
 *           type: string
 *           description: AI가 생성한 요약 텍스트 (불렛 포인트 형식)
 *           example: "• 성장주 위주의 공격적인 투자 성향입니다.\n• 현금 비중이 낮아 유동성 위험이 있습니다."
 *         isAnalyzing:
 *           type: boolean
 *           description: 현재 최신 데이터로 다시 분석 중인지 여부
 *           example: false
 */
