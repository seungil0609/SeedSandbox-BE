import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// 현재 실행 환경이 (배포 환경)인지 확인
const isProduction = process.env.NODE_ENV === "production";

const apisPath = isProduction
  ? ["./dist/routes/*.js", "./dist/models/*.js"] // 배포 환경에서는 컴파일된 JS 파일을 스캔
  : ["./src/routes/*.ts", "./src/models/*.ts"]; // 개발 환경에서는 원본 TS 파일을 스캔

// JSDoc 주석을 읽기 위한 Swagger 설정
const options = {
  // 1. Swagger 문서의 기본 구조 정의
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SeedUp API",
      version: "1.0.0",
      description: "SeedUp 서비스의 백엔드 API 명세서입니다.",
    },
    // 2. API를 테스트할 서버 주소 (환경에 따라 동적으로 변경)
    servers: [
      {
        url: isProduction
          ? "http://seedup-be.ap-northeast-2.elasticbeanstalk.com"
          : "http://localhost:8080",
        description: isProduction
          ? "Production Server"
          : "Local Development Server",
      },
    ],
    // 3. 'Bearer 토큰' 인증 방식을 Swagger에 정의
    components: {
      securitySchemes: {
        bearerAuth: {
          // 이 이름(bearerAuth)이 API 주석의 security와 연결됨
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Firebase ID 토큰을 'Bearer ' 접두사 없이 값만 입력하세요.",
        },
      },
    },
  },
  // 4. 주석을 스캔할 파일 경로 지정 (환경에 따라 동적으로 변경됨)
  apis: apisPath,
};

// Swagger 설정 객체를 기반으로 최종 API 명세(specs) 생성
const specs = swaggerJsdoc(options);

// 다른 파일에서 사용할 수 있도록 export
export { specs, swaggerUi };
