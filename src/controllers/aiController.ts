import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Portfolio from "../models/Portfolio.js";

// @desc    Get AI Summary from DB
// @route   GET /api/ai/summary/:portfolioId
// @access  Private
export const getAiAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const portfolioId = req.params.portfolioId;

    if (!user) {
      return res
        .status(401)
        .json({ message: "사용자 정보를 찾을 수 없습니다." });
    }

    const portfolio = await Portfolio.findById(portfolioId);

    if (!portfolio || portfolio.user.toString() !== user._id.toString()) {
      return res
        .status(404)
        .json({ message: "포트폴리오를 찾을 수 없거나 접근 권한이 없습니다." });
    }

    // 이미 저장된 요약본과 상태를 반환
    res.status(200).json({
      summary: portfolio.aiSummary || "분석 대기 중입니다...",
      isAnalyzing: portfolio.isAnalyzing,
    });
  } catch (error) {
    console.error("AI 요약 조회 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
};
