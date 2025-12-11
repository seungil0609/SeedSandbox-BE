import { GoogleGenerativeAI } from "@google/generative-ai";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";

// Gemini API 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_API!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//포트폴리오 분석 트리거 함수
export const triggerAiAnalysis = async (portfolioId: string) => {
  try {
    console.log(`[AI Trigger] 포트폴리오(${portfolioId}) 분석 시작...`);

    // 1. 상태를 '분석 중'으로 변경
    await Portfolio.findByIdAndUpdate(portfolioId, { isAnalyzing: true });

    // 2. 데이터 수집
    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) return;

    const transactions = await Transaction.find({
      portfolio: portfolioId,
    }).populate("asset");

    if (transactions.length === 0) {
      await Portfolio.findByIdAndUpdate(portfolioId, {
        aiSummary: "거래 내역이 없습니다. 자산을 추가해주시면 분석해드립니다.",
        isAnalyzing: false,
      });
      return;
    }

    // 데이터 간소화 
    const summaryData = transactions.map((t: any) => ({
      ticker: t.asset?.ticker,
      name: t.asset?.name,
      type: t.transactionType,
      qty: t.quantity,
      price: t.price,
      date: t.transactionDate,
    }));

    // 3. 프롬프트 작성 (핵심: 짧게, 요약형)
    const prompt = `
      당신은 전문 금융 자산 운용가입니다. 
      아래 포트폴리오 데이터를 바탕으로 핵심 요약 리포트를 작성해주세요.

      **제약 사항 (필수 준수):**
      1. 한국어로 작성하세요.
      2. 전체 길이는 공백 포함 **300자 이내**로 제한합니다. (모바일 화면 400px 높이 제한)
      3. 줄글이 아닌 **'•' (불렛 포인트)** 형식을 사용하여 3~4줄로 작성하세요.
      4. 구성: 
         - 현재 포트폴리오 성향 한 줄 요약
         - 주요 리스크 또는 특징 1~2가지
         - 향후 투자 조언 1가지

      **포트폴리오 정보:**
      - 기준 통화: ${portfolio.baseCurrency}
      - 거래 내역: ${JSON.stringify(summaryData)}
    `;

    // 4. Gemini 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    // 5. DB 업데이트
    await Portfolio.findByIdAndUpdate(portfolioId, {
      aiSummary: aiText,
      isAnalyzing: false,
    });

    console.log(`[AI Trigger] 포트폴리오(${portfolioId}) 분석 완료 및 저장.`);
  } catch (error) {
    console.error("[AI Trigger] 분석 실패:", error);
    // 에러 발생 시 분석 중 상태 해제 및 에러 메시지 저장
    await Portfolio.findByIdAndUpdate(portfolioId, {
      isAnalyzing: false,
      aiSummary:
        "일시적인 오류로 분석에 실패했습니다. 나중에 다시 시도해주세요.",
    });
  }
};
