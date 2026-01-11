import yahooFinance from "yahoo-finance2";

// 1. ESM/CJS 호환성 처리
const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

// 2. 🟢 [핵심] 설정을 'new' 할 때 괄호 안에 넣습니다.
const yf = new YahooFinanceClass({
  // 가짜 신분증 (User-Agent)
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  // 요청 속도 제한 (1초에 1번)
  queue: {
    concurrency: 1,
    limit: 1,
    interval: 1000,
  },
  // 경고 메시지 끄기
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export default yf;
