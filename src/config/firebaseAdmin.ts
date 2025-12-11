import admin from "firebase-admin";

// 환경 변수 가져오기
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY;

let privateKey: string | undefined;

if (rawKey) {
  // 원본 키인지 Base64인지 자동 판별
  if (rawKey.includes("-----BEGIN PRIVATE KEY-----")) {
    // Case A: 로컬 (.env에 원본 키가 있는 경우)
    // 줄바꿈 문자(\n)만 실제 엔터로 바꿔줍니다.
    privateKey = rawKey.replace(/\\n/g, "\n");
  } else {
    // Case B: AWS (Base64로 인코딩된 키가 있는 경우)
    try {
      // Base64를 풀어서 원본으로 만듭니다.
      const decoded = Buffer.from(rawKey, "base64").toString("utf8");
      // 혹시 풀린 키에도 \n 문자가 있다면 변환합니다.
      privateKey = decoded.replace(/\\n/g, "\n");
    } catch (error) {
      console.error("Private Key 디코딩 실패:", error);
    }
  }
}

const firebaseConfig = {
  projectId,
  clientEmail,
  privateKey,
};

// 필수 환경 변수 체크
if (
  !firebaseConfig.projectId ||
  !firebaseConfig.clientEmail ||
  !firebaseConfig.privateKey
) {
  throw new Error(
    "Firebase 환경 변수 설정 오류: FIREBASE_PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY를 확인하세요."
  );
}

const serviceAccount = firebaseConfig as admin.ServiceAccount;

// 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
