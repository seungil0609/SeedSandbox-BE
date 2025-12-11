import mongoose, { Schema, Document } from "mongoose";
import type { IUser } from "./User.js";

export interface INotification extends Document {
  user: IUser["_id"];
  content: string;
  type: "COMMENT" | "REPORT";
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["COMMENT", "REPORT"], // 알림 유형
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false, // 기본값은 '안 읽음'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - user
 *         - content
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: 알림 ID
 *           example: "67c099zz9c0e1234abcd9999"
 *
 *         user:
 *           type: string
 *           description: 수신자 ID
 *           example: "67c010ab3fb9abcd12349012"
 *
 *         content:
 *           type: string
 *           description: 알림 내용
 *           example: "관심 종목 NVDA(엔비디아)가 목표가에 도달했습니다."
 *
 *         type:
 *           type: string
 *           enum: ["COMMENT", "REPORT"]
 *           description: 알림 유형
 *           example: "REPORT"
 *
 *         isRead:
 *           type: boolean
 *           description: 읽음 여부
 *           example: false
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성일
 *           example: "2025-02-22T11:00:00.000Z"
 */
