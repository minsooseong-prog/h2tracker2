import { NextResponse } from "next/server";
import { DataGoError } from "@/lib/datago";
import { isValidLatLng } from "@/lib/geo";
import { findNearbyStations } from "@/lib/stations";
import type { ApiErrorBody, ApiErrorCode } from "@/types/station";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function fail(code: ApiErrorCode, message: string, status: number, hint?: string) {
  const body: ApiErrorBody = {
    error: { code, message, ...(process.env.NODE_ENV !== "production" && hint ? { hint } : {}) },
  };
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!isValidLatLng({ lat, lng })) {
    return fail("BAD_REQUEST", "위치 정보가 올바르지 않습니다. 다시 시도해 주세요.", 400);
  }

  const requested = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(requested)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(requested)))
    : DEFAULT_LIMIT;

  try {
    const result = await findNearbyStations({ lat, lng }, limit);

    if (result.meta.totalStations === 0) {
      return fail(
        "NO_DATA",
        "공공데이터에서 충전소 목록을 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
        502,
        "응답은 왔지만 파싱된 레코드가 0건입니다. npm run probe 로 응답 형태를 확인하세요.",
      );
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DataGoError) {
      const status = error.code === "CONFIG_MISSING" ? 503 : error.code === "UPSTREAM_TIMEOUT" ? 504 : 502;
      const message =
        error.code === "CONFIG_MISSING"
          ? "서비스 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : error.code === "UPSTREAM_TIMEOUT"
            ? "공공데이터 서버 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요."
            : "충전소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

      if (error.code === "CONFIG_MISSING" || error.code === "UPSTREAM_ERROR") {
        console.error("[stations]", error.code, error.hint ?? error.message);
      }
      return fail(error.code, message, status, error.hint);
    }

    console.error("[stations] unexpected", error);
    return fail("INTERNAL", "예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
