import type { ApiErrorCode } from "@/types/station";

/**
 * 서버 내부 오류를 사용자에게 보여줄 수 있는 형태로만 좁혀서 전달한다.
 * 스택 트레이스, 업스트림 URL, 인증키는 어떤 경우에도 응답에 포함되지 않는다.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly httpStatus: number;

  constructor(code: ApiErrorCode, httpStatus = 502, internalMessage?: string) {
    super(internalMessage ?? code);
    this.name = "ApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 사용자에게 그대로 노출되는 한국어 문구 */
export const ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  CONFIG_MISSING: "서비스 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.",
  UPSTREAM_AUTH: "공공데이터 인증에 실패했습니다. 서비스 관리자에게 문의해 주세요.",
  UPSTREAM_QUOTA: "오늘 조회 가능한 횟수를 모두 사용했습니다. 잠시 후 다시 시도해 주세요.",
  UPSTREAM_UNAVAILABLE: "충전소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  UPSTREAM_PARSE: "충전소 정보를 읽는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  BAD_REQUEST: "요청한 위치 정보가 올바르지 않습니다.",
  UNKNOWN: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("UPSTREAM_UNAVAILABLE", 504, "upstream timeout");
  }
  return new ApiError("UNKNOWN", 500, error instanceof Error ? error.message : "unknown");
}

/**
 * data.go.kr 게이트웨이는 HTTP 200 으로도 인증/한도 오류를 돌려준다.
 * 본문 문자열에서 오류 코드를 찾아 사용자용 코드로 옮긴다.
 */
export function detectUpstreamError(body: string): ApiError | null {
  if (!body) return null;
  const text = body.slice(0, 2000);

  if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE_ACCESS_DENIED|SERVICE_KEY_IS_NULL|PERMISSION_DENIED|DEADLINE_HAS_EXPIRED/i.test(text)) {
    return new ApiError("UPSTREAM_AUTH", 502, "upstream auth rejected");
  }
  if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS/i.test(text)) {
    return new ApiError("UPSTREAM_QUOTA", 429, "upstream quota exceeded");
  }
  if (/NO_OPENAPI_SERVICE_ERROR|HTTP_ERROR|APPLICATION_ERROR|SERVICETIMEOUT_ERROR/i.test(text)) {
    return new ApiError("UPSTREAM_UNAVAILABLE", 502, "upstream gateway error");
  }
  if (/INVALID_REQUEST_PARAMETER/i.test(text)) {
    return new ApiError("UPSTREAM_UNAVAILABLE", 502, "upstream parameter rejected");
  }
  return null;
}
