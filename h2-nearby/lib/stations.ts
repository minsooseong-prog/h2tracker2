import { DataGoError, fetchAllRecords, readEndpoints } from "@/lib/datago";
import { resolveCongestion } from "@/lib/congestion";
import { nearest, type LatLng } from "@/lib/geo";
import { mergeRealtime, nameKey, toRealtime, toStationBase } from "@/lib/normalize";
import type { NearbyResponse, NearbyStation, RealtimeInfo, StationBase } from "@/types/station";

/** 충전소 위치/주소는 거의 바뀌지 않습니다. */
const STATION_LIST_TTL_SEC = 60 * 60 * 6;
/** 실시간 정보는 60초. 공공데이터 일일 호출량을 아끼는 목적도 있습니다. */
const REALTIME_TTL_SEC = 60;

interface Memo<T> {
  value: T;
  expiresAt: number;
}

let stationMemo: Memo<StationBase[]> | null = null;
let realtimeMemo: Memo<RealtimeIndex> | null = null;

function fresh<T>(memo: Memo<T> | null): T | null {
  return memo && memo.expiresAt > Date.now() ? memo.value : null;
}

async function loadStations(): Promise<StationBase[]> {
  const cached = fresh(stationMemo);
  if (cached) return cached;

  const { stationList } = readEndpoints();
  if (!stationList) {
    throw new DataGoError(
      "충전소 목록을 불러올 주소가 설정되지 않았습니다.",
      "CONFIG_MISSING",
      "H2_STATION_LIST_URL 환경변수를 설정하세요. README의 '엔드포인트 확인' 절을 참고하세요.",
    );
  }

  const records = await fetchAllRecords(stationList, STATION_LIST_TTL_SEC);

  const seen = new Set<string>();
  const stations: StationBase[] = [];
  for (const record of records) {
    const station = toStationBase(record);
    if (!station || seen.has(station.id)) continue;
    seen.add(station.id);
    stations.push(station);
  }

  stationMemo = { value: stations, expiresAt: Date.now() + STATION_LIST_TTL_SEC * 1000 };
  return stations;
}

/** 실시간 + 운영 정보를 한 번에 받아 관리번호/이름 두 키로 색인합니다. */
interface RealtimeIndex {
  byId: Map<string, RealtimeInfo>;
  byName: Map<string, RealtimeInfo>;
}

async function loadRealtime(): Promise<RealtimeIndex> {
  const cached = fresh(realtimeMemo);
  if (cached) return cached;

  const { realtime, operation } = readEndpoints();
  const sources = [realtime, operation].filter((url): url is string => Boolean(url));
  if (sources.length === 0) return { byId: new Map(), byName: new Map() };

  const byId = new Map<string, RealtimeInfo>();
  const byName = new Map<string, RealtimeInfo>();

  const results = await Promise.allSettled(
    sources.map((url) => fetchAllRecords(url, REALTIME_TTL_SEC)),
  );

  let anyFulfilled = false;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    anyFulfilled = true;
    for (const record of result.value) {
      const { id, name, info } = toRealtime(record);
      if (id) {
        const existing = byId.get(id);
        byId.set(id, existing ? mergeRealtime(existing, info) : info);
      }
      // 현황 API 와 실시간 API 의 관리번호 체계가 다를 때를 대비한 보조 색인
      if (name) {
        const key = nameKey(name);
        const existing = byName.get(key);
        byName.set(key, existing ? mergeRealtime(existing, info) : info);
      }
    }
  }

  if (!anyFulfilled) {
    const first = results[0];
    if (first && first.status === "rejected") {
      throw first.reason instanceof Error
        ? first.reason
        : new DataGoError("실시간 정보를 불러오지 못했습니다.", "UPSTREAM_ERROR");
    }
  }

  const index: RealtimeIndex = { byId, byName };
  realtimeMemo = { value: index, expiresAt: Date.now() + REALTIME_TTL_SEC * 1000 };
  return index;
}

export async function findNearbyStations(origin: LatLng, limit: number): Promise<NearbyResponse> {
  const stations = await loadStations();
  const degraded: string[] = [];

  let realtimeIndex: RealtimeIndex = { byId: new Map(), byName: new Map() };
  try {
    realtimeIndex = await loadRealtime();
  } catch {
    // 실시간이 죽어도 "가까운 충전소 찾기" 자체는 계속 동작해야 합니다.
    degraded.push("realtime");
  }

  const closest = nearest(origin, stations, limit);

  const result: NearbyStation[] = closest.map((station, position) => {
    const realtime =
      realtimeIndex.byId.get(station.id) ?? realtimeIndex.byName.get(nameKey(station.name)) ?? null;
    return {
      ...station,
      rank: position + 1,
      realtime,
      congestion: resolveCongestion(realtime),
    };
  });

  return {
    stations: result,
    meta: {
      totalStations: stations.length,
      realtimeAvailable: result.some((station) => station.realtime !== null),
      fetchedAt: new Date().toISOString(),
      degraded,
    },
  };
}

/** 테스트/진단용. 서버 재시작 없이 캐시를 비웁니다. */
export function clearStationCache(): void {
  stationMemo = null;
  realtimeMemo = null;
}
