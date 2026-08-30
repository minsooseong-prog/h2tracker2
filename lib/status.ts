import type { CongestionLevel, CongestionSource, OperationStatus } from "@/types/station";

/**
 * API 가 준 문자열을 해석해 운영 상태 코드로 바꾼다.
 * 해석에 실패하면 UNKNOWN 을 반환하고, 화면에는 원문 라벨을 그대로 보여준다.
 * 값이 없으면 상태를 지어내지 않는다.
 */
export function resolveOperationStatus(label: string | null): OperationStatus {
  if (!label) return "UNKNOWN";
  const text = label.replace(/\s+/g, "");

  if (/(점검|정비|고장|장애|수리)/.test(text)) return "MAINTENANCE";
  if (/(종료|마감|휴무|중지|중단|폐쇄|미운영|영업종료)/.test(text)) return "CLOSED";
  if (/(준비|대기중|개시전|공사)/.test(text)) return "PREPARING";
  if (/(운영|영업|정상|가능|open)/i.test(text)) return "OPERATING";

  return "UNKNOWN";
}

export const OPERATION_STATUS_LABEL: Record<OperationStatus, string> = {
  OPERATING: "운영 중",
  CLOSED: "운영 종료",
  MAINTENANCE: "점검 중",
  PREPARING: "준비 중",
  UNKNOWN: "정보 없음",
};

/**
 * 혼잡도 판단.
 *
 * 1순위: API 가 혼잡상태 값을 직접 준 경우 — 그대로 사용한다.
 * 2순위: 대기 차량 대수가 있는 경우 — 그 숫자를 기준으로 구간을 나눈다.
 *        (숫자 자체는 API 실측값이며, 구간 구분만 이 서비스의 표현이다.)
 * 둘 다 없으면 UNKNOWN. 추측하지 않는다.
 */
export function resolveCongestion(
  label: string | null,
  waitingVehicles: number | null,
): { level: CongestionLevel; source: CongestionSource } {
  if (label) {
    const text = label.replace(/\s+/g, "");
    if (/(혼잡|많음|포화|busy)/i.test(text)) return { level: "BUSY", source: "api" };
    if (/(보통|이용중|normal)/i.test(text)) return { level: "NORMAL", source: "api" };
    if (/(여유|원활|한산|free|smooth)/i.test(text)) return { level: "FREE", source: "api" };
  }

  if (waitingVehicles !== null) {
    if (waitingVehicles <= 0) return { level: "FREE", source: "waiting-count" };
    if (waitingVehicles <= 2) return { level: "NORMAL", source: "waiting-count" };
    return { level: "BUSY", source: "waiting-count" };
  }

  return { level: "UNKNOWN", source: "none" };
}

export const CONGESTION_LABEL: Record<CongestionLevel, string> = {
  FREE: "여유",
  NORMAL: "이용 중",
  BUSY: "혼잡",
  UNKNOWN: "정보 없음",
};
