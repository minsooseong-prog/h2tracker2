import type { CongestionLevel, CongestionState, RealtimeInfo } from "@/types/station";

/**
 * 대기 차량 수 → 뱃지 구간.
 * 공공데이터는 "대기 차량 수"라는 숫자만 주고, 여유/보통/혼잡 구간은
 * 수소유통정보시스템(하잉)의 표기 방식을 따른 화면 표시 규칙입니다.
 * 화면 하단에도 이 기준을 명시합니다.
 */
export const WAITING_THRESHOLDS = { free: 0, normal: 2 } as const;

const KEYWORD_RULES: ReadonlyArray<{ level: CongestionLevel; label: string; match: readonly string[] }> = [
  { level: "busy", label: "혼잡", match: ["혼잡"] },
  { level: "normal", label: "보통", match: ["보통", "다소혼잡"] },
  { level: "free", label: "여유", match: ["여유", "원활"] },
  { level: "maintenance", label: "점검 중", match: ["점검", "고장", "정비", "수리"] },
  { level: "closed", label: "운영 종료", match: ["종료", "휴무", "미영업", "영업종료", "운영종료", "폐쇄", "중단"] },
  { level: "open", label: "영업 중", match: ["영업", "운영중", "정상"] },
];

function matchKeyword(text: string): { level: CongestionLevel; label: string } | null {
  const squished = text.replace(/\s/g, "");
  for (const rule of KEYWORD_RULES) {
    if (rule.match.some((keyword) => squished.includes(keyword))) {
      return { level: rule.level, label: rule.label };
    }
  }
  return null;
}

export function levelFromWaiting(count: number): { level: CongestionLevel; label: string } {
  if (count <= WAITING_THRESHOLDS.free) return { level: "free", label: "여유" };
  if (count <= WAITING_THRESHOLDS.normal) return { level: "normal", label: "보통" };
  return { level: "busy", label: "혼잡" };
}

/**
 * 우선순위
 *  1. API가 혼잡상태 문자열을 직접 주면 그대로 사용
 *  2. 대기 차량 수가 있으면 구간으로 환산
 *  3. 운영상태 문자열만 있으면 그것으로 표시
 *  4. 아무것도 없으면 "정보 없음" — 값을 지어내지 않습니다
 */
export function resolveCongestion(realtime: RealtimeInfo | null): CongestionState {
  if (realtime?.congestionLabel) {
    const matched = matchKeyword(realtime.congestionLabel);
    if (matched) return { ...matched, source: "api" };
    return { level: "unknown", label: realtime.congestionLabel, source: "api" };
  }

  if (typeof realtime?.waitingVehicles === "number") {
    return { ...levelFromWaiting(realtime.waitingVehicles), source: "derived" };
  }

  if (realtime?.operationStatus) {
    const matched = matchKeyword(realtime.operationStatus);
    if (matched) return { ...matched, source: "api" };
    return { level: "unknown", label: realtime.operationStatus, source: "api" };
  }

  return { level: "unknown", label: "정보 없음", source: "none" };
}
