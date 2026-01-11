import yahooFinance from "yahoo-finance2";

// 1. 가져온 게 클래스인지, 'default' 안에 숨어있는지 확인
const YahooFinanceClass = (yahooFinance as any).default || yahooFinance;

// 2. 🟢 [핵심] 에러 메시지대로 'new'를 붙여서 인스턴스(실체)를 만듭니다.
const yf = new YahooFinanceClass();

// 3. 경고 메시지 끄기
if (yf.suppressNotices) {
  yf.suppressNotices(["yahooSurvey", "ripHistorical"]);
}

// 4. 이제 이 'yf'는 확실하게 사용 가능한 객체입니다.
export default yf;
