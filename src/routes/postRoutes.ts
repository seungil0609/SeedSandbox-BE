import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/postController.js";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Posts
 *     description: 커뮤니티 게시글
 *   - name: Comments
 *     description: 게시글 댓글
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: 게시글 목록 조회
 *     tags: [Posts]
 *     responses:
 *       '200':
 *         description: 목록 조회 성공
 *   post:
 *     summary: 게시글 작성
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       '201':
 *         description: 생성 성공
 *       '400':
 *         description: 잘못된 입력
 *       '401':
 *         description: 인증 실패
 */
router.route("/").get(getPosts).post(protect, createPost);

// 2. 특정 게시글(:id)에 대한 라우트 
/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: 게시글 상세 조회
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: 조회 성공 }
 *       '404': { description: 없음 }
 *   put:
 *     summary: 게시글 수정
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostBody'
 *     responses:
 *       '200': { description: 수정 성공 }
 *       '400': { description: 잘못된 입력 }
 *       '401': { description: 인증 실패 }
 *       '403': { description: 권한 없음 }
 *       '404': { description: 없음 }
 *   delete:
 *     summary: 게시글 삭제
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: 삭제 성공 }
 *       '401': { description: 인증 실패 }
 *       '403': { description: 권한 없음 }
 *       '404': { description: 없음 }
 */
router
  .route("/:id")
  // 상세 조회 (로그인 안 해도 가능)
  .get(getPostById)
  // 수정 (로그인 + 본인만 가능)
  .put(protect, updatePost)
  // 삭제 (로그인 + 본인만 가능)
  .delete(protect, deletePost);

// 3. 특정 게시글(:id)에 댓글 관련 라우트
/**
 * @swagger
 * /api/posts/{id}/comments:
 *   get:
 *     summary: 댓글 목록 조회
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: 조회 성공 }
 *       '404': { description: 게시글 없음 }
 *   post:
 *     summary: 댓글 작성
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewCommentBody'
 *     responses:
 *       '201': { description: 생성 성공 }
 *       '400': { description: 잘못된 입력 }
 *       '401': { description: 인증 실패 }
 *       '404': { description: 게시글 없음 }
 */
router.route("/:id/comments").get(getComments).post(protect, createComment);

// 4. 특정 댓글 수정/삭제
/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}:
 *   put:
 *     summary: 댓글 수정
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewCommentBody'
 *     responses:
 *       '200': { description: 수정 성공 }
 *       '400': { description: 잘못된 입력 }
 *       '401': { description: 인증 실패 }
 *       '403': { description: 권한 없음 }
 *       '404': { description: 없음 }
 *   delete:
 *     summary: 댓글 삭제
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: 삭제 성공 }
 *       '401': { description: 인증 실패 }
 *       '403': { description: 권한 없음 }
 *       '404': { description: 없음 }
 */
router
  .route("/:postId/comments/:commentId")
  .put(protect, updateComment)
  .delete(protect, deleteComment);

export default router;
