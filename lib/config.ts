/**
 * 서비스 설정 한 곳.
 *
 * 서버 전용 값과 브라우저 노출 값을 파일 안에서 명확히 분리한다.
 * NEXT_PUBLIC_ 접두사가 없는 변수는 Next.js 가 클라이언트 번들에 넣지 않는다.
 */

/* ------------------------------------------------------------------ *
 * 브라우저에 노출되는 값
 * ------------------------------------------------------------------ */

/**
 * 카카오맵 JavaScript 앱키.
 *
 * JS SDK 는 브라우저에서 실행되므로 앱키는 구조상 숨길 수 없다.
 * 숨기는 대신 Kakao Developers 의 "허용 도메인" 으로 보호한다. (README 참고)
 * 저장소에 값을 남기지 않기 위해 환경변수로만 주입한다.
 */
export const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "";

/* ------------------------------------------------------------------ *
 * 서버 전용 값 (브라우저에서 import 해도 빈 문자열이 된다)
 * ------------------------------------------------------------------ */

/** 공공데이터포털 인증키 — 절대 클라이언트로 내려보내지 않는다. */
export const DATA_GO_KR_KEY = process.env.DATA_GO_KR_KEY ?? "";

/**
 * 공공데이터포털 "한국석유관리원_수소충전소_실시간정보" / "_운영정보" 요청주소.
 *
 * data.go.kr 상세 페이지의 요청주소와 다르면 Vercel 환경변수로 덮어쓸 수 있다.
 * (H2_REALTIME_URL / H2_OPERATION_URL)
 */
export const H2_REALTIME_URL =
  process.env.H2_REALTIME_URL ?? "http://el.h2nbiz.or.kr/api/chrstnList/currentInfo";

export const H2_OPERATION_URL =
  process.env.H2_OPERATION_URL ?? "http://el.h2nbiz.or.kr/api/chrstnList/operationInfo";

/**
 * /api/diagnostics 가 호출을 허용하는 호스트.
 * 임의 URL 로 인증키가 붙은 요청을 보내는 SSRF 를 막는다.
 */
export const ALLOWED_UPSTREAM_HOSTS = [
  "el.h2nbiz.or.kr",
  "www.h2nbiz.or.kr",
  "h2nbiz.or.kr",
  "apis.data.go.kr",
  "api.odcloud.kr",
  "api.data.go.kr",
] as const;

/** Production 에서 진단 라우트를 열기 위한 토큰. 없으면 진단 라우트는 404. */
export const DIAGNOSTICS_TOKEN = process.env.DIAGNOSTICS_TOKEN ?? "";

/* ------------------------------------------------------------------ *
 * 튜닝 값
 * ------------------------------------------------------------------ */

/** 사용자에게 보여줄 가까운 충전소 개수 */
export const NEAREST_COUNT = 5;

/** 실시간 데이터 캐시 (초). 공공데이터 일일 호출량을 아끼면서 신선도를 유지한다. */
export const REALTIME_CACHE_SECONDS = 60;

/** 충전소 기본 정보(주소/좌표) 캐시 (초). 자주 바뀌지 않는다. */
export const OPERATION_CACHE_SECONDS = 60 * 60 * 6;

/** 업스트림 요청 타임아웃 (ms) */
export const UPSTREAM_TIMEOUT_MS = 8000;

/** 한 번에 요청할 목록 행 수 (전국 수소충전소는 250개 안팎) */
export const UPSTREAM_PAGE_SIZE = 1000;
