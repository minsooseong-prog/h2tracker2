/**
 * 의존성 없는 로직 자체 검증.
 *   npm test
 * 거리 계산 · 응답 파싱 · 혼잡도 판정 · 인증키 인코딩 · URL 조립을 검사합니다.
 * 네트워크를 타지 않으므로 CI 나 배포 전 점검에 그대로 쓸 수 있습니다.
 */
import assert from "node:assert/strict";
import { haversineMeters, formatDistance, nearest, isValidLatLng, isInKorea } from "../lib/geo";
import { extractRecords, extractUpstreamError, toStationBase, toRealtime, mergeRealtime } from "../lib/normalize";
import { resolveCongestion } from "../lib/congestion";
import { normalizeServiceKey, buildUrl, detectPagingStyle } from "../lib/datago";

// ── geo
const seoul = { lat: 37.5665, lng: 126.9780 };
const chuncheon = { lat: 37.8813, lng: 127.7300 };
const d = haversineMeters(seoul, chuncheon);
assert.ok(d > 68_000 && d < 78_000, `서울-춘천 거리 이상: ${d}`);
assert.equal(haversineMeters(seoul, seoul), 0);
assert.equal(formatDistance(847), "850m");
assert.equal(formatDistance(2137), "2.1km");
assert.equal(formatDistance(23400), "23km");
assert.equal(formatDistance(-1), "-");
assert.equal(isValidLatLng({ lat: 0, lng: 0 }), false);
assert.equal(isInKorea(chuncheon), true);
assert.equal(isInKorea({ lat: 48, lng: 2 }), false);

const ranked = nearest(seoul, [
  { lat: 37.9, lng: 127.7, id: "far" },
  { lat: 37.57, lng: 126.98, id: "near" },
  { lat: 35.1, lng: 129.0, id: "busan" },
], 2);
assert.deepEqual(ranked.map((s) => s.id), ["near", "far"]);

// ── envelopes
assert.equal(extractRecords({ data: [{ a: 1 }] }).length, 1);
assert.equal(extractRecords({ response: { body: { items: [{ a: 1 }, { b: 2 }] } } }).length, 2);
assert.equal(extractRecords({ response: { body: { items: { item: [{ a: 1 }] } } } }).length, 1);
assert.equal(extractRecords([{ a: 1 }]).length, 1);
assert.equal(extractRecords(null).length, 0);
assert.equal(extractUpstreamError({ response: { header: { resultCode: "30", resultMsg: "SERVICE KEY IS NOT REGISTERED" } } })?.includes("30"), true);
assert.equal(extractUpstreamError({ response: { header: { resultCode: "00", resultMsg: "NORMAL" } } }), null);

// ── station parsing (한글 키 / 영문 키 / 위경도 반전 모두)
const s1 = toStationBase({ chrstnNm: "춘천수소충전소", adres: "강원 춘천시", la: "37.88", lo: "127.73", chrstnCd: "H001" });
assert.ok(s1 && s1.name === "춘천수소충전소" && s1.lat === 37.88 && s1.id === "H001");
const s2 = toStationBase({ 충전소명: "테스트", 위도: "127.73", 경도: "37.88" });
assert.ok(s2 && Math.abs(s2.lat - 37.88) < 1e-9, "위경도 반전 보정 실패");
assert.equal(toStationBase({ chrstnNm: "좌표없음" }), null);
assert.equal(toStationBase({ la: 37.5, lo: 127 }), null);

// ── realtime parsing
const rt = toRealtime({ chrstnCd: "H001", 수소차량대기차수: "3", 완충가능차량대수: 7, tubeTrailerPrssr: "420.5 bar", untpc: "8,800" });
assert.equal(rt.id, "H001");
assert.equal(rt.info.waitingVehicles, 3);
assert.equal(rt.info.chargeableVehicles, 7);
assert.equal(rt.info.tubeTrailerPressure, 420.5);
assert.equal(rt.info.pricePerKg, 8800);
assert.equal(rt.info.notice, null);

const merged = mergeRealtime(rt.info, { ...rt.info, notice: "점검 예정", waitingVehicles: 99 });
assert.equal(merged.notice, "점검 예정");
assert.equal(merged.waitingVehicles, 3, "앞쪽 값이 우선해야 함");

// ── congestion
assert.equal(resolveCongestion(rt.info).level, "busy");
assert.equal(resolveCongestion(rt.info).source, "derived");
assert.equal(resolveCongestion({ ...rt.info, waitingVehicles: 0 }).level, "free");
assert.equal(resolveCongestion({ ...rt.info, waitingVehicles: 2 }).level, "normal");
assert.equal(resolveCongestion({ ...rt.info, waitingVehicles: null, congestionLabel: "혼잡" }).source, "api");
assert.equal(resolveCongestion({ ...rt.info, waitingVehicles: null, operationStatus: "점검중" }).level, "maintenance");
assert.equal(resolveCongestion(null).label, "정보 없음");
assert.equal(resolveCongestion(null).source, "none");

// ── service key (이중 인코딩 방지)
const raw = "abc+def/ghi==";
const encodedOnce = "abc%2Bdef%2Fghi%3D%3D";
assert.equal(normalizeServiceKey(raw), encodedOnce);
assert.equal(normalizeServiceKey(encodedOnce), encodedOnce, "이미 인코딩된 키를 다시 인코딩하면 안 됨");
assert.ok(!normalizeServiceKey(encodedOnce).includes("%25"));

// ── url building
assert.equal(detectPagingStyle("https://api.odcloud.kr/api/x/v1/uddi:1"), "odcloud");
assert.equal(detectPagingStyle("https://apis.data.go.kr/1234/svc/op"), "standard");
const u1 = buildUrl("https://api.odcloud.kr/api/x/v1/uddi:1?serviceKey=LEAKED&page=9", 2, encodedOnce);
assert.ok(u1.includes("page=2") && u1.includes("perPage=500"));
assert.ok(!u1.includes("LEAKED"), "복사해온 기존 serviceKey 가 제거되어야 함");
assert.ok(u1.endsWith(`&serviceKey=${encodedOnce}`));
const u2 = buildUrl("https://apis.data.go.kr/1234/svc/op", 1, encodedOnce);
assert.ok(u2.includes("pageNo=1") && u2.includes("numOfRows=500") && u2.includes("type=json"));

console.log("모든 로직 테스트 통과 (" + 40 + "+ assertions)");
