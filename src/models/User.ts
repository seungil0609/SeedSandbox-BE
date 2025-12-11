import mongoose, { Schema, Document, Types } from "mongoose";

// IUser 인터페이스
export interface IUser extends Document {
  _id: Types.ObjectId;
  firebaseUid: string;
  email: string;
  nickname: string;
  createdAt: Date;
}

// Mongoose 스키마
const UserSchema: Schema = new Schema({
  // Firebase Auth의 고유 ID
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },
  // 사용자의 이메일
  email: {
    type: String,
    required: true,
    unique: true,
  },
  // 사용자의 닉네임
  nickname: {
    type: String,
    required: true,
    unique: true,
  },
  // 계정 생성일
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 스키마를 기반으로 'User' 모델을 생성하고 내보냄
// mongoose.model("모델이름", 스키마)
// DB에는 "모델이름"이 소문자+복수형(users)인 컬렉션(테이블)이 생성됨
export default mongoose.model<IUser>("User", UserSchema);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - nickname
 *       properties:
 *         id:
 *           type: string
 *           description: 사용자 고유 ID
 *           example: "781b54758j7207eda50d7fe6"
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일
 *           example: "test@ajou.ac.kr"
 *         nickname:
 *           type: string
 *           description: 사용자 닉네임
 *           example: "ajou"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 계정 생성일
 *           example: "2025-11-28T06:00:33.074Z"
 *
 *     RegisterUserBody:
 *       type: object
 *       required:
 *         - firebaseUid
 *         - email
 *         - nickname
 *       properties:
 *         firebaseUid:
 *           type: string
 *           description: Firebase Auth UID
 *           example: "5ocXHK85s9Rrs8txYYS35MIKAXU7"
 *         email:
 *           type: string
 *           format: email
 *           example: "test@ajou.ac.kr"
 *         nickname:
 *           type: string
 *           example: "WEI"
 */
