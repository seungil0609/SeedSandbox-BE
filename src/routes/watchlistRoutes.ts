// import express from "express";
// import { protect } from "../middleware/authMiddleware.js";
// import {
//   addToWatchlist,
//   getWatchlistQuotes,
//   removeFromWatchlist,
// } from "../controllers/watchlistController.js";

// const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Watchlist
 *     description: 관심 종목 관리 및 실시간 시세 조회
 */

/**
 * @swagger
 * /api/watchlist:
 *   post:
 *     summary: 관심 종목 추가
 *     description: 자산 티커를 기반으로 관심 종목에 등록합니다.
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewWatchlistBody'
 *     responses:
 *       '201':
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WatchlistCreateResponse'
 *       '400':
 *         description: 잘못된 요청 (티커 누락 등)
 *       '401':
 *         description: 인증 실패
 *       '409':
 *         description: 이미 관심 종목에 존재
 *   get:
 *     summary: 관심 종목 실시간 시세 조회
 *     description: 내 관심 종목 목록과 현재가를 반환합니다.
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WatchlistQuote'
 *       '401':
 *         description: 인증 실패
 *
 * /api/watchlist/{watchlistId}:
 *   delete:
 *     summary: 관심 종목 삭제
 *     description: watchlistId를 기반으로 관심 종목을 삭제합니다.
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: watchlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 관심 종목 ID
 *     responses:
 *       '200':
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "관심 종목이 삭제되었습니다."
 *       '400':
 *         description: 잘못된 요청 또는 ID 형식
 *       '401':
 *         description: 인증 실패
 *       '404':
 *         description: 관심 종목을 찾을 수 없음
 */
// router.post("/", protect, addToWatchlist);
// router.get("/", protect, getWatchlistQuotes);
// router.delete("/:watchlistId", protect, removeFromWatchlist);

// export default router;
