import mongoose, { Schema, Document, Types } from "mongoose";
import { IUser } from "./User.js";

export interface IPost extends Document {
  user: Types.ObjectId | IUser; // ObjectId 또는 populate된 IUser 객체
  boardType: "자유" | "질문" | "정보" | "수익률자랑" | "종목 토론" | "공지";
  title: string;
  content: string;
  createdAt: Date;
}

const PostSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  boardType: {
    type: String,
    enum: ["자유", "질문", "정보", "수익률자랑", "종목 토론", "공지"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPost>("Post", PostSchema);

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - user
 *         - boardType
 *         - title
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: 게시글 ID
 *           example: "67c013de9c0e1234abcd9044"
 *
 *         user:
 *           type: string
 *           description: 작성자 ID
 *           example: "67c010ab3fb9abcd12349012"
 *
 *         boardType:
 *           type: string
 *           enum: ["자유", "질문", "정보", "수익률자랑", "종목 토론", "공지"]
 *           description: 게시판 유형
 *           example: "수익률자랑"
 *
 *         title:
 *           type: string
 *           description: 제목
 *           example: "NVDA 수익률 50% 달성했습니다! 🚀"
 *
 *         content:
 *           type: string
 *           description: 내용
 *           example: "역시 AI 대장주 엔비디아 믿고 있었습니다. H100 수요가 엄청나네요."
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 작성일
 *           example: "2025-02-22T10:00:00.000Z"
 *
 *     UpdatePostBody:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: 수정할 제목 (선택)
 *           example: "제목을 이렇게 바꿨어요"
 *         content:
 *           type: string
 *           description: 수정할 내용 (선택)
 *           example: "본문을 업데이트했습니다."
 *         boardType:
 *           type: string
 *           enum: ["수익률자랑", "자유"]
 *           description: 게시글 종류 (선택)
 *           example: "자유"
 */
