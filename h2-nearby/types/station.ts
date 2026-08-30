/** 화면에 뱃지로 표시되는 혼잡/운영 상태 */
export type CongestionLevel =
  | "free" // 여유
  | "normal" // 보통
  | "busy" // 혼잡
  | "open" // 영업중 (대기 정보 미제공)
  | "maintenance" // 점검 중
  | "closed" // 운영 종료 / 휴무
  | "unknown"; // 정보 없음

export type RawRecord = Record<string, unknown>;

/** 충전소 현황 API에서 나오는 정적 정보 */
export interface StationBase {
  /** 충전소 관리번호. 실시간 정보와 join 하는 키 */
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  /** 이용 가능 요일 / 영업시간 원문 */
  businessHours: string | null;
  /** 충전 가능 차량 구분 원문 */
  vehicleTypes: string | null;
}

/** 실시간정보 + 운영정보 API에서 나오는 값. 없으면 전부 null */
export interface RealtimeInfo {
  /** 정보 기준 시각 원문 */
  updatedAt: string | null;
  /** 운영 상태 원문 (예: 영업중, 점검중) */
  operationStatus: string | null;
  /** API가 직접 내려주는 혼잡 상태 원문 (예: 여유, 보통, 혼잡) */
  congestionLabel: string | null;
  /** 대기 차량 수 (대) */
  waitingVehicles: number | null;
  /** 지금 완충 가능한 수소차량 대수 (대) */
  chargeableVehicles: number | null;
  /** 수소 튜브트레일러 압력 (bar) */
  tubeTrailerPressure: number | null;
  /** 충전기(디스펜서) 총 수 */
  dispenserTotal: number | null;
  /** 사용 가능한 충전기 수 */
  dispenserAvailable: number | null;
  /** 사용 중인 충전기 수 */
  dispenserInUse: number | null;
  /** kg당 판매 가격 (원) */
  pricePerKg: number | null;
  /** 충전소 공지 원문 */
  notice: string | null;
}

export interface CongestionState {
  level: CongestionLevel;
  label: string;
  /** api = 공공데이터가 문자열로 직접 준 값, derived = 대기차량 수로부터 표시 규칙 적용, none = 미제공 */
  source: "api" | "derived" | "none";
}

export interface NearbyStation extends StationBase {
  /** 사용자 위치로부터의 직선거리(m) */
  distanceMeters: number;
  /** 1이 가장 가까움 */
  rank: number;
  realtime: RealtimeInfo | null;
  congestion: CongestionState;
}

export interface NearbyMeta {
  /** 충전소 현황 API에서 읽어온 전체 충전소 수 */
  totalStations: number;
  /** 실시간 정보가 하나라도 붙었는지 */
  realtimeAvailable: boolean;
  fetchedAt: string;
  /** 부분 실패 사유. 예: ["realtime"] → 목록은 나왔지만 실시간은 실패 */
  degraded: string[];
}

export interface NearbyResponse {
  stations: NearbyStation[];
  meta: NearbyMeta;
}

export type ApiErrorCode =
  | "CONFIG_MISSING"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "BAD_REQUEST"
  | "NO_DATA"
  | "INTERNAL";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    /** 사용자에게 그대로 보여줄 수 있는 한국어 문장 */
    message: string;
    /** 개발자용 힌트. 프로덕션에서는 비어 있을 수 있음 */
    hint?: string;
  };
}
