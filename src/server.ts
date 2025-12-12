import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db.js";

//  1. 라우트 파일들을 모두 가져옴
import userRoutes from "./routes/userRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
// import watchlistRoutes from "./routes/watchlistRoutes.js"; // watchlist 비활성화
import marketIndexRoutes from "./routes/marketIndexRoutes.js";

// 2. Swagger 설정 파일을 가져옴
import { specs, swaggerUi } from "./config/swagger.js";

// DB 연결
connectDB();

const app = express();
const PORT = 8080;

// CORS 설정
const allowedOrigins = [
  "http://localhost:8080",
  "https://seedsandbox.site",
  "https://seedsandbox.vercel.app",
];

// CORS 미들웨어 적용
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

// 3. Swagger UI 라우트를 설정
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// 4. 모든 API 라우트들을 설정한다.
app.use("/api/users", userRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/posts", postRoutes);
// app.use("/api/watchlist", watchlistRoutes); // watchlist 비활성화
app.use("/api/market-index", marketIndexRoutes);

// 기본 루트 경로
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, SeedSandbox Backend!");
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
