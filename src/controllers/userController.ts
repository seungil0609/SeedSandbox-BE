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

    // 🟢 [수정] 이메일과 닉네임을 따로 체크하여 구체적인 에러 메시지 반환

    // 1. 이메일 중복 체크
    const userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    // 2. 닉네임 중복 체크
    const userByNickname = await User.findOne({ nickname });
    if (userByNickname) {
      // 프론트엔드에서 '닉네임'이라는 단어를 감지하므로 메시지에 포함 필수
      return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
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
  const user = req.user;

  if (user) {
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
    const userInDb = req.user;

    if (!userInDb) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // Firebase Authentication에서 사용자 삭제
    await admin.auth().deleteUser(userInDb.firebaseUid);

    // DB에서 사용자 삭제
    await User.findByIdAndDelete(userInDb._id);

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
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    // Refresh Token 무효화
    await admin.auth().revokeRefreshTokens(user.firebaseUid);

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

// 🟢 [추가] 가입 전 중복 확인 전용 함수
export const checkDuplicate = async (req: Request, res: Response) => {
  const { email, nickname } = req.body;

  try {
    // 1. 이메일 중복 체크
    if (email) {
      const userByEmail = await User.findOne({ email });
      if (userByEmail) {
        return res.status(409).json({ message: "이미 가입된 이메일입니다." });
      }
    }

    // 2. 닉네임 중복 체크
    if (nickname) {
      const userByNickname = await User.findOne({ nickname });
      if (userByNickname) {
        return res
          .status(409)
          .json({ message: "이미 사용 중인 닉네임입니다." });
      }
    }

    // 문제 없으면 200 OK
    res.status(200).json({ message: "사용 가능한 정보입니다." });
  } catch (error) {
    console.error("중복 확인 에러:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};
