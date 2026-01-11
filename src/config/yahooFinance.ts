import yahooFinance from "yahoo-finance2";

const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

// 인스턴스 생성
const yf = new YahooFinanceClass({
  fetchOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  // 🟢 [추가] 쿠키 저장소 활성화 (메모리에 저장)
  cookieJar: new (yahooFinance as any).default.CookieJar(),
  queue: {
    concurrency: 1,
    limit: 1,
    interval: 2000,
  },
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  },
});

// 🟢 [핵심] 서버 켜질 때 "Crumb(인증 조각)" 받아오기
(async () => {
  try {
    console.log("Yahoo Finance 인증 준비 중...");
    // 야후 메인 페이지를 찔러서 쿠키와 Crumb를 받아옴
    await yf.setGlobalConfig({
      cookieJar: new (yahooFinance as any).default.CookieJar(),
    });
    console.log("Yahoo Finance 인증 성공!");
  } catch (e) {
    console.error("Yahoo Finance 인증 실패:", e);
  }
})();

if (typeof yf.suppressNotices === "function") {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

export default yf;
