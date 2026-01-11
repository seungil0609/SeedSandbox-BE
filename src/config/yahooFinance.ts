import yahooFinance from "yahoo-finance2";

const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

const yf = new YahooFinanceClass({
  fetchOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  queue: {
    concurrency: 1,
    limit: 1,
    interval: 2000, // 2초로 더 늘림 (안전빵)
  },
  // 🟢 [추가] 유효성 검사 끄기 (야후가 봇 감지 로직을 돌리는 걸 방지)
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  },
});

// 🟢 [수정] suppressNotices 설정 방식 변경 (인스턴스 생성 후 호출 대신, 생성자 옵션으로 넣거나 이렇게 별도로 처리)
if (typeof yf.suppressNotices === "function") {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

export default yf;
