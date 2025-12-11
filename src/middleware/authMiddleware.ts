import type { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin.js"; 
import User from "../models/User.js"; 
import type { IUser } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: IUser | null; 
}

// protect 미들웨어 함수
// 이 함수는 API 요청이 실제 로직에 도달하기 전에 먼저 실행
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 요청 헤더에서 'Authorization' 정보를 가져옴
    const authHeader = req.headers.authorization;

    // 헤더가 없거나, 'Bearer '로 시작하지 않으면 통과시키지 않고 바로 에러 응답을 보냄
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "인증 실패: Bearer 토큰이 필요합니다." });
    }

    // 'Bearer '라는 글자를 잘라내고 순수한 토큰 부분만 추출
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "인증 실패: 토큰이 비어있습니다." });
    }

    // Firebase Admin SDK를 사용해 토큰이 진짜인지, 위조되지 않았는지 검증
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 토큰이 진짜라면, 토큰에 담긴 고유 ID(uid)를 사용해 DB에서 해당 사용자를 찾음
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    // 만약 DB에 해당 사용자가 없다면, 통과시키지 않고 에러 응답을 보냄
    if (!user) {
      return res
        .status(401)
        .json({ message: "인증 실패: 등록되지 않은 사용자입니다." });
    }

    // 찾은 사용자 정보를 req.user에 저장
    req.user = user;
    next();
  } catch (error) {
    // (토큰 검증) 또는 (DB 조회) 과정에서 발생한 에러 처리
    console.error("인증 미들웨어 에러:", error);
    return res
      .status(401)
      .json({ message: "인증에 실패했습니다. 유효하지 않은 토큰입니다." });
  }
};
