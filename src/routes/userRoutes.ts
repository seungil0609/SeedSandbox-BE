import express from "express";

import {
  registerUser,
  getUserProfile,
  deleteUser,
  logoutUser, 
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: 사용자 인증 및 프로필 관리
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: 사용자 등록
 *     description: Firebase UID로 신규 사용자를 등록합니다.
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserBody'
 *     responses:
 *       '201':
 *         description: 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: 잘못된 요청 (필수 필드 누락 등)
 */
// '/register' 주소로 POST 요청이 오면, registerUser 함수를 실행
router.post("/register", registerUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 내 프로필 정보 조회
 *     description: 로그인된 사용자의 DB 정보를 조회합니다.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '401':
 *         description: 인증 실패
 */

// 내 프로필 보기
router.get("/profile", protect, getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   delete:
 *     summary: 회원 탈퇴
 *     description: 내 계정을 삭제합니다 (소유 리소스 처리 정책은 서버 동작에 따름).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *                   example: "회원 탈퇴가 완료되었습니다."
 *       '401':
 *         description: 인증 실패
 *       '404':
 *         description: 사용자 없음
 */

// 회원 탈퇴 라우트
router.delete("/profile", protect, deleteUser);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: 로그아웃 (토큰 무효화)
 *     description: 서버 측에서 Firebase Refresh Token을 강제로 만료시킵니다.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그아웃 되었습니다. (토큰 무효화 완료)"
 *       '401':
 *         description: 인증 실패
 */

router.post("/logout", protect, logoutUser);

export default router;
