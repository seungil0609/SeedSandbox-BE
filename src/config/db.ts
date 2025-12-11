import mongoose from "mongoose";
import "dotenv/config"; // .env 파일의 환경 변수를 process.env로 로드함

const connectDB = async () => {
  try {
    // .env 파일에서 MONGO_URI 값을 가져옴
    const mongoURI = process.env.MONGO_URI;

    // MONGO_URI 값이 없으면 에러 발생
    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    // MongoDB에 연결 시도
    await mongoose.connect(mongoURI);

    console.log("MongoDB Connected...");
  } catch (err: any) {
    // 연결 실패 시 에러 출력 후 프로세스 종료
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
