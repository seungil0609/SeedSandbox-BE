import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  deleteTransaction,
  updateTransaction,
} from "../controllers/transactionController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Transactions
 *     description: 개별 거래 내역 관리
 */

/**
 * @swagger
 * /api/transactions/{transactionId}:
 *   put:
 *     summary: 거래 내역 수정
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateTransactionBody"
 *     responses:
 *       '200':
 *         description: 수정 성공
 *
 *   delete:
 *     summary: 거래 내역 삭제
 *     tags:
 *       - Transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: 삭제 성공
 */
router
  .route("/:transactionId")
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

export default router;
