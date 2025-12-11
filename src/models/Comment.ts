import mongoose, { Schema, Document } from "mongoose";
import type { IPost } from "./Post.js";
import type { IUser } from "./User.js";

export interface IComment extends Document {
  post: IPost["_id"];
  user: IUser["_id"];
  parentComment?: IComment["_id"]; // 대댓글인 경우 부모 댓글의 ID
  content: string;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment", // 자기 자신을 참조해서 대댓글 관계를 만듦
    default: null, // 부모가 없으면(일반 댓글이면) null
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

export default mongoose.model<IComment>("Comment", CommentSchema);

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - post
 *         - user
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: 댓글 ID
 *           example: "67c022ab9c0e1234abcd9200"
 *         post:
 *           type: string
 *           description: 게시글 ID
 *           example: "67c013de9c0e1234abcd9044"
 *         user:
 *           type: string
 *           description: 댓글 작성자 ID
 *           example: "67c010ab3fb9abcd12349012"
 *         parentComment:
 *           type: string
 *           nullable: true
 *           description: 부모 댓글 ID (대댓글일 경우)
 *           example: null
 *         content:
 *           type: string
 *           description: 댓글 내용
 *           example: "축하드립니다! 저도 엔비디아 추매하러 갑니다."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 작성일
 *           example: "2025-02-22T10:05:00.000Z"
 *
 *     NewCommentBody:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: 댓글 내용
 *           example: "엔비디아 실적 발표 기대되네요."
 *         parentComment:
 *           type: string
 *           nullable: true
 *           description: 대댓글일 경우 부모 댓글 ID
 *           example: null
 */
