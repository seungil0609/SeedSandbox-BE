import yahooFinance from "yahoo-finance2";
import * as toughCookie from "tough-cookie";
import { HttpsProxyAgent } from "https-proxy-agent";

// 호환성 처리
const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;
const CookieJar =
  toughCookie.CookieJar || (toughCookie as any).default?.CookieJar;

// 환경 변수에서 프록시 URL 가져오기
const proxyUrl = process.env.PROXY_URL;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const yf = new YahooFinanceClass({
  fetchOptions: {
    agent: agent, // 프록시 에이전트 적용
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  cookieJar: new CookieJar(),
  queue: {
    concurrency: 1,
    limit: 1,
    interval: 2000,
  },
  validation: {
    logErrors: true,
    logOptionsErrors: false,
  },
});

// 연결 테스트 로그
(async () => {
  try {
    console.log(
      `Yahoo Finance 연결 시도... (Proxy: ${proxyUrl ? "ON" : "OFF"})`
    );
    // 연결 테스트를 위해 가벼운 정보 조회
    await yf.quote("AAPL");
    console.log("Yahoo Finance 연결 성공!");
  } catch (e) {
    console.error("Yahoo Finance 연결 실패:", e);
  }
})();

if (typeof yf.suppressNotices === "function") {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

export default yf;
