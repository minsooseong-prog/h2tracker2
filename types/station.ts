/**
 * 서비스 전체에서 사용하는 도메인 타입.
 *
 * 원칙: 공공데이터 API 가 값을 주지 않으면 `null` 이다.
 * `null` 은 UI 에서 "정보 없음" 으로 표시되며, 어떤 경우에도 임의의 값으로 채우지 않는다.
 */

/** 충전소 운영 상태 (API 원문 라벨을 코드로 해석한 결과) */
export type OperationStatus =
  | "OPERATING" // 운영 중
  | "CLOSED" // 운영 종료 / 휴무
  | "MAINTENANCE" // 점검 / 정비 중
  | "PREPARING" // 준비 중
  | "UNKNOWN"; // API 가 값을 주지 않았거나 해석 불가

/** 혼잡도 */
export type CongestionLevel =
  | "FREE" // 여유
  | "NORMAL" // 보통 / 이용 중
  | "BUSY" // 혼잡
  | "UNKNOWN";

/** 혼잡도를 어떤 근거로 판단했는지 — UI 에서 출처를 정직하게 표기하기 위해 사용 */
export type CongestionSource = "api" | "waiting-count" | "none";

export interface StationRealtime {
  /** 운영 상태 해석 결과 */
  operationStatus: OperationStatus;
  /** API 가 준 운영 상태 원문 (해석과 무관하게 그대로 보존) */
  operationStatusLabel: string | null;

  /** 혼잡도 해석 결과 */
  congestion: CongestionLevel;
  /** API 가 준 혼잡 상태 원문 */
  congestionLabel: string | null;
  /** 혼잡도 판단 근거 */
  congestionSource: CongestionSource;

  /** 대기 차량 대수 */
  waitingVehicles: number | null;
  /** 현재 재고로 완충 가능한 수소차량 대수 */
  chargeableVehicles: number | null;

  /** 충전기 총 대수 */
  chargerTotal: number | null;
  /** 사용 가능한 충전기 대수 */
  chargerAvailable: number | null;
  /** 사용 중인 충전기 대수 */
  chargerInUse: number | null;

  /** 수소 튜브트레일러 압력 (bar) */
  tubeTrailerPressure: number | null;
  /** 판매 가격 (원/kg) */
  pricePerKg: number | null;

  /** 실시간 정보 기준 시각 (API 원문 문자열) */
  updatedAt: string | null;
}

export interface Station {
  /** 충전소 관리번호 (실시간 정보와 운영 정보를 잇는 키) */
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  /** 운영 시간 */
  businessHours: string | null;
  /** 휴무일 */
  holiday: string | null;
  /** 실시간 정보가 매칭되지 않은 충전소는 null */
  realtime: StationRealtime | null;
}

export interface NearbyStation extends Station {
  /** 1 이 가장 가까움 */
  rank: number;
  /** 사용자 위치로부터의 직선거리 (m) */
  distanceMeters: number;
}

export interface StationsMeta {
  /** 좌표를 가진 전체 충전소 수 */
  totalStations: number;
  /** 그중 실시간 정보가 매칭된 충전소 수 */
  realtimeMatched: number;
  /** 실시간 API 응답 여부 — false 면 UI 가 "실시간 정보 일시 중단" 을 알린다 */
  realtimeAvailable: boolean;
  fetchedAt: string;
}

export interface StationsResponse {
  origin: Coordinates;
  stations: NearbyStation[];
  meta: StationsMeta;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/** 사용자에게 보여줄 수 있는 오류 코드 (스택/원문은 절대 노출하지 않는다) */
export type ApiErrorCode =
  | "CONFIG_MISSING"
  | "UPSTREAM_AUTH"
  | "UPSTREAM_QUOTA"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_PARSE"
  | "BAD_REQUEST"
  | "UNKNOWN";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}
