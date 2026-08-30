/**
 * ============================================================================
 *  공공데이터 API 응답 필드 매핑 — 이 파일 하나만 고치면 됩니다.
 * ============================================================================
 *
 * 공공데이터포털의 "한국석유관리원_수소충전소_실시간정보 / _운영정보" 는
 * 활용신청 후 로그인해야 Swagger 명세를 볼 수 있어, 응답 필드명을 외부에서
 * 확정할 수 없습니다. 그래서 이 프로젝트는 **하나의 필드명을 단정하지 않고**
 * 후보 목록을 순서대로 확인하는 방식(tolerant mapping)을 씁니다.
 *
 * 동작 방식
 *   - 후보 중 응답에 실제로 존재하는 첫 번째 키의 값을 사용합니다.
 *   - 비교는 대소문자/언더스코어를 무시합니다. (chrstnNm == CHRSTN_NM)
 *   - 어느 후보와도 매칭되지 않으면 값은 `null` 이고 화면에는 "정보 없음" 이 뜹니다.
 *     **없는 값을 추측하거나 만들어내지 않습니다.**
 *
 * 실제 필드명 확인 방법 (배포 후 1분)
 *   1. Vercel 환경변수에 DIAGNOSTICS_TOKEN 을 임의의 긴 문자열로 추가
 *   2. https://<도메인>/api/diagnostics?token=<그 문자열> 접속
 *   3. 응답의 `realtime.sampleKeys` / `operation.sampleKeys` 가 진짜 필드명입니다
 *   4. 아래 배열 맨 앞에 그 이름을 넣고 다시 배포하면 끝입니다
 *      (인증키는 진단 응답에 절대 포함되지 않습니다)
 */

export type FieldCandidates = readonly string[];

/** 실시간 정보 + 운영 정보를 잇는 충전소 식별자 */
export const ID_FIELDS: FieldCandidates = [
  "chrstnCd",
  "chrstnMngNo",
  "chrgsCd",
  "stationCd",
  "stationId",
  "csId",
  "mngNo",
  "code",
  "id",
];

export const NAME_FIELDS: FieldCandidates = [
  "chrstnNm",
  "chrgsNm",
  "stationNm",
  "csNm",
  "name",
  "충전소명",
];

export const ADDRESS_FIELDS: FieldCandidates = [
  "rnAdres",
  "roadAddr",
  "roadAddress",
  "adres",
  "lnmAdres",
  "addr",
  "address",
  "주소",
];

export const LAT_FIELDS: FieldCandidates = ["lat", "latitude", "ycrd", "yCrd", "y", "위도"];
export const LNG_FIELDS: FieldCandidates = ["lng", "lon", "longitude", "xcrd", "xCrd", "x", "경도"];

export const PHONE_FIELDS: FieldCandidates = [
  "telno",
  "tel",
  "phone",
  "phoneNumber",
  "cttpcTelno",
  "전화번호",
];

export const BUSINESS_HOURS_FIELDS: FieldCandidates = [
  "bsnsTime",
  "operationTime",
  "oprtnTime",
  "useTime",
  "weekdayOperationTime",
  "wkdyBsnsTime",
  "운영시간",
];

export const HOLIDAY_FIELDS: FieldCandidates = [
  "rstde",
  "restDay",
  "holiday",
  "closeDay",
  "휴무일",
];

/* --------------------------- 실시간 항목 --------------------------- */

export const OPERATION_STATUS_FIELDS: FieldCandidates = [
  "oprtnSttus",
  "operationStatus",
  "bsnsSttus",
  "sttus",
  "status",
  "chrstnSttus",
  "운영상태",
];

/** 수소차량 혼잡상태 */
export const CONGESTION_FIELDS: FieldCandidates = [
  "cnfsSttus",
  "cnfsnSttus",
  "congestion",
  "congestionStatus",
  "jamSttus",
  "혼잡상태",
];

/** 수소차량 대기차수 */
export const WAITING_FIELDS: FieldCandidates = [
  "wtngVhcleCnt",
  "wtngCnt",
  "waitCnt",
  "waitingCount",
  "waitingVehicles",
  "대기차수",
];

/** 완충 가능한 수소차량 대수 */
export const CHARGEABLE_FIELDS: FieldCandidates = [
  "chrgPsbltyVhcleCnt",
  "fullChrgPsbltyVhcleCnt",
  "chargeableVehicles",
  "psbltyVhcleCnt",
  "완충가능대수",
];

export const CHARGER_TOTAL_FIELDS: FieldCandidates = [
  "chrgrCnt",
  "chargerCount",
  "totalCharger",
  "chrgrTotCnt",
  "충전기수",
];

export const CHARGER_AVAILABLE_FIELDS: FieldCandidates = [
  "chrgrUsePsbltyCnt",
  "availableCharger",
  "usePsbltyChrgrCnt",
  "idleChrgrCnt",
];

export const CHARGER_IN_USE_FIELDS: FieldCandidates = [
  "chrgrUseCnt",
  "inUseCharger",
  "useChrgrCnt",
  "chrgngChrgrCnt",
];

/** 수소 튜브트레일러 압력 */
export const PRESSURE_FIELDS: FieldCandidates = [
  "tubeTrailerPrssr",
  "tubeTrailerPressure",
  "prssr",
  "pressure",
  "압력",
];

export const PRICE_FIELDS: FieldCandidates = ["pric", "price", "unitPrice", "salePrice", "가격"];

export const UPDATED_AT_FIELDS: FieldCandidates = [
  "updtDt",
  "updateDt",
  "lastUpdate",
  "bassDt",
  "collectDt",
  "regDt",
  "기준일시",
];

/* ------------------------- 응답 래퍼(컨테이너) ------------------------- */

/**
 * 목록 배열이 담길 만한 위치들. 위에서부터 순서대로 확인한다.
 * data.go.kr 은 기관마다 래핑 구조가 제각각이라 여러 형태를 모두 지원한다.
 */
export const LIST_CONTAINER_PATHS: readonly string[][] = [
  ["response", "body", "items", "item"],
  ["response", "body", "items"],
  ["response", "body", "item"],
  ["body", "items", "item"],
  ["body", "items"],
  ["items", "item"],
  ["items"],
  ["data"],
  ["list"],
  ["result"],
  ["records"],
];
