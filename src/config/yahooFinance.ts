import yahooFinance from "yahoo-finance2";
// 🟢 [핵심] tough-cookie를 통째로 가져옵니다.
import * as toughCookie from "tough-cookie";

// 1. Yahoo Finance 모듈 호환성 처리
const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

// 2. 🟢 [핵심] CookieJar 클래스를 안전하게 꺼냅니다.
// (import 방식에 따라 위치가 다를 수 있어서 둘 다 확인)
const CookieJar =
  toughCookie.CookieJar || (toughCookie as any).default?.CookieJar;

const yf = new YahooFinanceClass({
  fetchOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  // 3. 찾은 클래스로 생성
  cookieJar: new CookieJar(),
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

// 4. 인증 시도 (서버 켜질 때)
(async () => {
  try {
    console.log("Yahoo Finance 쿠키 인증 시도...");
    await yf.search("AAPL");
    console.log("Yahoo Finance 쿠키 인증 성공!");
  } catch (e) {
    console.error("Yahoo Finance 인증 실패 (경고):", e);
  }
})();

if (typeof yf.suppressNotices === "function") {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

export default yf;
