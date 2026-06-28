// 모든 백엔드 API 호출의 베이스 URL.
// - 비어있으면 상대경로 → 개발은 Vite 프록시(/api → http://localhost:8000)가 처리.
// - 배포(Vercel)에선 환경변수 VITE_API_BASE_URL 에 백엔드 절대주소를 넣는다.
//   예: https://backend-production-4f28.up.railway.app
// 값에 BOM(U+FEFF)·공백·개행이 섞여 들어올 수 있어 trim 으로 제거하고(자바스크립트
// trim 은 U+FEFF 도 공백으로 취급) 끝 슬래시를 정리한다.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
