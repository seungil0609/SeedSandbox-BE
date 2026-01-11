import yahooFinance from "yahoo-finance2";

const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

const yf = new YahooFinanceClass({
  fetchOptions: {
    headers: {
      // 1. 최신 맥북 크롬으로 위장
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

      // 2. [추가] 브라우저가 보내는 필수 헤더들 (이게 없으면 로봇으로 의심받음)
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      Pragma: "no-cache",
    },
  },
  queue: {
    concurrency: 1,
    limit: 1,
    interval: 2000, // 2초 (여유 있게)
  },
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  },
});

if (typeof yf.suppressNotices === "function") {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

export default yf;
