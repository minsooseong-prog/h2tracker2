#!/usr/bin/env node
/**
 * 공공데이터 응답 형태 확인용 스크립트 (의존성 없음).
 *
 *   npm run probe
 *
 * .env.local 을 읽어 각 엔드포인트를 1페이지만 호출하고,
 *  - 실제 응답 봉투 모양
 *  - 첫 레코드의 키 목록
 *  - lib/fields.ts 후보 목록에 매칭된 값 / 매칭되지 않은 키
 * 를 출력합니다. 인증키는 절대 출력하지 않습니다.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* ── .env.local 로드 ─────────────────────────────────────── */
function loadEnv(file) {
  try {
    const text = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of text.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  } catch {
    /* 파일이 없으면 실제 환경변수만 사용 */
  }
}
loadEnv(".env.local");
loadEnv(".env");

/* ── lib/fields.ts 와 동일한 후보 목록 ───────────────────── */
const STATION_FIELDS = {
  id: ["chrstnCd", "chrstnNo", "chrgStnId", "stationId", "stdgCd", "mngNo", "충전소관리번호", "충전소코드", "관리번호"],
  name: ["chrstnNm", "chrgStnNm", "stationName", "stationNm", "bzentyNm", "충전소명", "충전소이름"],
  address: ["adres", "addr", "rdnmadr", "lnmadr", "address", "주소", "소재지도로명주소", "소재지지번주소"],
  lat: ["la", "lat", "latitude", "ycrd", "위도"],
  lng: ["lo", "lng", "longitude", "xcrd", "경도"],
  phone: ["telno", "tel", "phoneNumber", "cttpcTelno", "전화번호", "연락처"],
  hours: ["useTime", "operTime", "bsnsTime", "useAblDay", "useprsnDay", "이용가능요일", "영업시간", "운영시간"],
  vehicleTypes: ["chrgPsbltyVhcleCd", "vhcleCd", "chrgVhcleSe", "충전가능차량코드", "충전가능차량"],
  restInfo: ["rstDe", "restDe", "휴식일정", "휴무일"],
};

const REALTIME_FIELDS = {
  id: STATION_FIELDS.id,
  waitingVehicles: ["wtngVhcleCnt", "wtngVhcleCo", "wtngCarCnt", "waitCnt", "waitingCount", "standbyCnt", "수소차량대기차수", "대기차량수", "대기차수"],
  chargeableVehicles: ["chrgPsbltyVhcleCo", "chrgPsbltyVhcleCnt", "fullChrgPsbltyVhcleCo", "완충가능차량대수", "충전가능대수", "완충가능대수"],
  tubeTrailerPressure: ["tubeTrailerPrssr", "tubTrlrPrssr", "trailerPress", "prssr", "수소튜브트레일러압력", "튜브트레일러압력", "압력"],
  congestionLabel: ["cnfsnSttus", "cngstnSttus", "cnfsnSttusNm", "혼잡상태", "수소차량혼잡상태"],
  operationStatus: ["operSttus", "oprtSttus", "bsnsSttus", "operSttusNm", "sttus", "운영상태", "영업상태", "운영상태명"],
  updatedAt: ["infoDt", "baseDe", "baseDt", "updtDt", "bassDt", "기준일시", "기준일자", "수정일시"],
  pricePerKg: ["untpc", "sellPc", "prc", "avrgPrc", "판매가격", "평균가격", "단가"],
  notice: ["ntcCn", "noticeCn", "ntc", "공지사항", "공지"],
  dispenserTotal: ["chrgrCo", "chrgrCnt", "dspnsrCo", "충전기수", "디스펜서수"],
  dispenserAvailable: ["usePsbltyChrgrCo", "ablChrgrCo", "사용가능충전기수", "이용가능충전기수"],
  dispenserInUse: ["useChrgrCo", "usingChrgrCo", "사용중충전기수"],
};

const canon = (key) => key.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

function normalizeServiceKey(rawKey) {
  let key = rawKey.trim();
  if (/%[0-9A-Fa-f]{2}/.test(key)) {
    try {
      key = decodeURIComponent(key);
    } catch {}
  }
  return encodeURIComponent(key);
}

function buildUrl(endpoint, serviceKey) {
  const url = new URL(endpoint);
  const odcloud = url.hostname.includes("odcloud");
  for (const key of ["serviceKey", "ServiceKey", "page", "perPage", "pageNo", "numOfRows", "type", "dataType", "returnType"]) {
    url.searchParams.delete(key);
  }
  if (odcloud) {
    url.searchParams.set("page", "1");
    url.searchParams.set("perPage", "5");
  } else {
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "5");
    url.searchParams.set("type", "json");
    url.searchParams.set("dataType", "JSON");
  }
  return `${url.origin}${url.pathname}?${url.searchParams.toString()}&serviceKey=${serviceKey}`;
}

function envelopeShape(payload) {
  if (Array.isArray(payload)) return "순수 배열";
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return "odcloud { data: [...] }";
    if (Array.isArray(payload.items)) return "{ items: [...] }";
    if (payload.response?.body) return "표준 { response.body.items }";
  }
  return "알 수 없음";
}

function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  const items = payload.response?.body?.items;
  if (Array.isArray(items)) return items;
  if (items && Array.isArray(items.item)) return items.item;
  if (items && typeof items === "object") return [items];
  return [];
}

async function probe(name, endpoint, fields, serviceKey) {
  console.log(`\n━━━ ${name} ━━━`);
  if (!endpoint) {
    console.log("  (설정 안 됨 — .env.local 확인)");
    return;
  }
  console.log(`  ${new URL(endpoint).origin}${new URL(endpoint).pathname}`);

  let payload;
  try {
    const response = await fetch(buildUrl(endpoint, serviceKey), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status}\n  ${text.slice(0, 300)}`);
      return;
    }
    try {
      payload = JSON.parse(text);
    } catch {
      console.log(`  ✗ JSON 아님 (보통 인증키 오류입니다)\n  ${text.slice(0, 400)}`);
      return;
    }
  } catch (error) {
    console.log(`  ✗ 요청 실패: ${error.message}`);
    return;
  }

  console.log(`  봉투: ${envelopeShape(payload)}`);

  const records = extractRecords(payload);
  console.log(`  레코드: ${records.length}건`);
  const sample = records[0];
  if (!sample) {
    console.log(`  ✗ 레코드가 없습니다. 원문 앞부분:\n  ${JSON.stringify(payload).slice(0, 400)}`);
    return;
  }

  const index = new Map();
  for (const [key, value] of Object.entries(sample)) {
    if (!index.has(canon(key))) index.set(canon(key), value);
  }

  console.log("\n  [매칭 결과]");
  const known = new Set();
  for (const [field, candidates] of Object.entries(fields)) {
    for (const candidate of candidates) known.add(canon(candidate));
    const hit = candidates.find((candidate) => {
      const value = index.get(canon(candidate));
      return value !== undefined && value !== null && value !== "";
    });
    const mark = hit ? "✓" : "✗";
    const value = hit ? JSON.stringify(index.get(canon(hit))) : "";
    console.log(`   ${mark} ${field.padEnd(20)} ${hit ? `${hit} = ${value}` : "매칭 실패"}`);
  }

  const unmatched = Object.keys(sample).filter((key) => !known.has(canon(key)));
  if (unmatched.length > 0) {
    console.log("\n  [후보 목록에 없는 키 — lib/fields.ts 에 추가하세요]");
    for (const key of unmatched) {
      console.log(`   · ${key} = ${JSON.stringify(sample[key]).slice(0, 60)}`);
    }
  }
}

const rawKey = process.env.DATA_GO_KR_KEY;
if (!rawKey) {
  console.error("DATA_GO_KR_KEY 가 없습니다. .env.local 에 추가하세요.");
  process.exit(1);
}
const serviceKey = normalizeServiceKey(rawKey);

console.log("공공데이터 응답 진단 (인증키는 출력되지 않습니다)");
await probe("충전소 현황 (H2_STATION_LIST_URL)", process.env.H2_STATION_LIST_URL, STATION_FIELDS, serviceKey);
await probe("실시간정보 (H2_REALTIME_URL)", process.env.H2_REALTIME_URL, REALTIME_FIELDS, serviceKey);
await probe("운영정보 (H2_OPERATION_URL)", process.env.H2_OPERATION_URL, REALTIME_FIELDS, serviceKey);
console.log("");
