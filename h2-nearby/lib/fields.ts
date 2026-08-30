import type { RawRecord } from "@/types/station";

/**
 * 공공데이터포털 응답의 필드명은 데이터셋마다 표기가 다릅니다.
 * (영문 축약 camelCase / 한글 컬럼명 / 대소문자 혼용)
 *
 * 그래서 값을 "후보 키 목록"으로 찾습니다. 실제 응답 키를 확인하려면
 *   npm run probe
 * 를 실행하세요. 매칭되지 않은 키를 전부 출력해 주므로, 아래 목록에
 * 실제 키 하나만 추가하면 전체 앱에 반영됩니다. 이 파일이 유일한 수정 지점입니다.
 */

/** 비교용으로 키를 정규화: 소문자 + 영숫자/한글만 남김 */
function canon(key: string): string {
  return key.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

/** 레코드를 정규화된 키 → 원본 값 맵으로 1회 변환 (반복 조회 비용 절약) */
export function indexRecord(record: RawRecord): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    const c = canon(key);
    if (!map.has(c)) map.set(c, value);
  }
  return map;
}

/** 후보 키 중 처음으로 값이 있는 것을 반환 */
export function pick(index: Map<string, unknown>, candidates: readonly string[]): unknown {
  for (const candidate of candidates) {
    const value = index.get(canon(candidate));
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function asString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "null") return null;
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/** "12", 12, "12.5 bar", "1,200원" 모두 숫자로. 숫자가 없으면 null */
export function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const match = /-?\d+(\.\d+)?/.exec(cleaned);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function pickString(index: Map<string, unknown>, candidates: readonly string[]): string | null {
  return asString(pick(index, candidates));
}

export function pickNumber(index: Map<string, unknown>, candidates: readonly string[]): number | null {
  return asNumber(pick(index, candidates));
}

/* ── 충전소 현황(정적) ─────────────────────────────────────── */

export const STATION_FIELDS = {
  id: ["chrstnCd", "chrstnNo", "chrgStnId", "stationId", "stdgCd", "mngNo", "충전소관리번호", "충전소코드", "관리번호"],
  name: ["chrstnNm", "chrgStnNm", "stationName", "stationNm", "bzentyNm", "충전소명", "충전소이름"],
  address: ["adres", "addr", "rdnmadr", "lnmadr", "address", "주소", "소재지도로명주소", "소재지지번주소"],
  lat: ["la", "lat", "latitude", "ycrd", "위도"],
  lng: ["lo", "lng", "longitude", "xcrd", "경도"],
  phone: ["telno", "tel", "phoneNumber", "cttpcTelno", "전화번호", "연락처"],
  hours: ["useTime", "operTime", "bsnsTime", "useAblDay", "useprsnDay", "이용가능요일", "영업시간", "운영시간"],
  vehicleTypes: ["chrgPsbltyVhcleCd", "vhcleCd", "chrgVhcleSe", "충전가능차량코드", "충전가능차량"],
  restInfo: ["rstDe", "restDe", "휴식일정", "휴무일"],
} as const;

/* ── 실시간정보 / 운영정보 ─────────────────────────────────── */

export const REALTIME_FIELDS = {
  id: STATION_FIELDS.id,
  waitingVehicles: [
    "wtngVhcleCnt", "wtngVhcleCo", "wtngCarCnt", "waitCnt", "waitingCount",
    "standbyCnt", "수소차량대기차수", "대기차량수", "대기차수",
  ],
  chargeableVehicles: [
    "chrgPsbltyVhcleCo", "chrgPsbltyVhcleCnt", "fullChrgPsbltyVhcleCo",
    "완충가능차량대수", "충전가능대수", "완충가능대수",
  ],
  tubeTrailerPressure: [
    "tubeTrailerPrssr", "tubTrlrPrssr", "trailerPress", "prssr",
    "수소튜브트레일러압력", "튜브트레일러압력", "압력",
  ],
  congestionLabel: ["cnfsnSttus", "cngstnSttus", "cnfsnSttusNm", "혼잡상태", "수소차량혼잡상태"],
  operationStatus: [
    "operSttus", "oprtSttus", "bsnsSttus", "operSttusNm", "sttus",
    "운영상태", "영업상태", "운영상태명",
  ],
  updatedAt: ["infoDt", "baseDe", "baseDt", "updtDt", "bassDt", "기준일시", "기준일자", "수정일시"],
  pricePerKg: ["untpc", "sellPc", "prc", "avrgPrc", "판매가격", "평균가격", "단가"],
  notice: ["ntcCn", "noticeCn", "ntc", "공지사항", "공지"],
  dispenserTotal: ["chrgrCo", "chrgrCnt", "dspnsrCo", "충전기수", "디스펜서수"],
  dispenserAvailable: ["usePsbltyChrgrCo", "ablChrgrCo", "사용가능충전기수", "이용가능충전기수"],
  dispenserInUse: ["useChrgrCo", "usingChrgrCo", "사용중충전기수"],
} as const;

/** 후보 목록에 한 번도 잡히지 않은 키들 (probe 스크립트에서 사용) */
export function unmatchedKeys(record: RawRecord, groups: ReadonlyArray<readonly string[]>): string[] {
  const known = new Set<string>();
  for (const group of groups) for (const key of group) known.add(canon(key));
  return Object.keys(record).filter((key) => !known.has(canon(key)));
}
