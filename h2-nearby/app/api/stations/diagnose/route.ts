import { NextResponse } from "next/server";
import { DataGoError, fetchAllRecords, readEndpoints } from "@/lib/datago";
import { REALTIME_FIELDS, STATION_FIELDS, unmatchedKeys } from "@/lib/fields";
import { toRealtime, toStationBase } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 실제 응답의 필드명을 확인하기 위한 진단 엔드포인트입니다.
 * 인증키는 어떤 경우에도 응답에 포함되지 않습니다.
 *
 * 개발환경     : 그냥 열림
 * 프로덕션 환경 : DIAGNOSE_TOKEN 환경변수를 설정하고 ?token=... 을 붙여야 열림
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const expected = process.env.DIAGNOSE_TOKEN;

  if (process.env.NODE_ENV === "production") {
    if (!expected || token !== expected) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  const endpoints = readEndpoints();
  const targets = [
    { name: "stationList", url: endpoints.stationList, groups: Object.values(STATION_FIELDS) },
    { name: "realtime", url: endpoints.realtime, groups: Object.values(REALTIME_FIELDS) },
    { name: "operation", url: endpoints.operation, groups: Object.values(REALTIME_FIELDS) },
  ] as const;

  const report = await Promise.all(
    targets.map(async (target) => {
      if (!target.url) return { source: target.name, configured: false as const };

      try {
        const records = await fetchAllRecords(target.url, 0);
        const sample = records[0];
        if (!sample) {
          return { source: target.name, configured: true as const, count: 0, note: "레코드 0건" };
        }
        return {
          source: target.name,
          configured: true as const,
          count: records.length,
          sampleKeys: Object.keys(sample),
          unmatchedKeys: unmatchedKeys(sample, target.groups),
          parsed:
            target.name === "stationList" ? toStationBase(sample) : toRealtime(sample),
          sample,
        };
      } catch (error) {
        return {
          source: target.name,
          configured: true as const,
          failed: true as const,
          reason: error instanceof DataGoError ? (error.hint ?? error.message) : String(error),
        };
      }
    }),
  );

  return NextResponse.json(
    { keyConfigured: Boolean(process.env.DATA_GO_KR_KEY), report },
    { headers: { "Cache-Control": "no-store" } },
  );
}
