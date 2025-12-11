import type { Request, Response } from "express";
import User from "../models/User.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import admin from "../config/firebaseAdmin.js";

// 회원가입
export const registerUser = async (req: Request, res: Response) => {
  // 프론트에서 보낸 정보에서 필요한 값을 꺼냄
  const { firebaseUid, email, nickname } = req.body;

  try {
    // 필수 정보가 하나라도 없으면, 에러 응답
    if (!firebaseUid || !email || !nickname) {
      return res.status(400).json({ message: "모든 필드를 입력해주세요." });
    }

    // 이미 가입된 이메일이나 닉네임인지 확인
    const existingUser = await User.findOne({ $or: [{ email }, { nickname }] });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "이미 사용 중인 이메일 또는 닉네임입니다." });
    }

    // 새 사용자 정보 생성
    const newUser = new User({
      firebaseUid,
      email,
      nickname,
    });

    // DB에 저장
    await newUser.save();

    // 성공 응답 보내기
    res.status(201).json({
      message: "회원가입 성공!",
      user: {
        id: newUser._id,
        email: newUser.email,
        nickname: newUser.nickname,
      },
    });
  } catch (error: any) {
    console.error("회원가입 에러:", error);
    res
      .status(500)
      .json({ message: "서버 에러가 발생했습니다.", error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private (로그인한 사용자만 접근 가능)
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  // 'protect'가 성공적으로 통과했다면,
  // req.user에는 반드시 DB에서 찾은 사용자 정보가 들어있을 것임
  const user = req.user;

  if (user) {
    // 사용자 정보에서 민감한 정보를 제외하고 필요한 것만 보내줌
    res.status(200).json({
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }
};

// @desc    Delete user account (회원 탈퇴)
// @route   DELETE /api/users/profile
// @access  Private
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    // 1. 'protect'를 통과한 사용자 정보를 가져옴
    const userInDb = req.user;

    // 2. 만약 DB에 사용자가 없다면, 에러 처리
    if (!userInDb) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 3. Firebase Authentication에서 사용자를 삭제
    await admin.auth().deleteUser(userInDb.firebaseUid);

    // 4. DB에서 사용자를 삭제
    await User.findByIdAndDelete(userInDb._id);

    // 5. 성공 메시지 응답
    res.status(200).json({ message: "회원 탈퇴가 성공적으로 처리되었습니다." });
  } catch (error) {
    console.error("회원 탈퇴 에러:", error);
    res
      .status(500)
      .json({ message: "회원 탈퇴 처리 중 서버 에러가 발생했습니다." });
  }
};

// @desc    Logout user & Revoke tokens
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = async (req: AuthRequest, res: Response) => {
  try {
    // 1. 미들웨어를 통과한 유저 정보 가져오기
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    // 2. Firebase Admin SDK를 통해 해당 유저(UID)의 Refresh Token을 모두 무효화(Revoke)
    //    이렇게 하면 해커가 가진 Refresh Token으로 더 이상 새 Access Token을 발급받을 수 없습니다.
    await admin.auth().revokeRefreshTokens(user.firebaseUid);

    // 3. 성공 응답
    res
      .status(200)
      .json({ message: "로그아웃 되었습니다. (토큰 무효화 완료)" });
  } catch (error) {
    console.error("로그아웃/토큰 무효화 에러:", error);
    res
      .status(500)
      .json({ message: "로그아웃 처리 중 서버 에러가 발생했습니다." });
  }
};
