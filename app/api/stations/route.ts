import { NextResponse } from "next/server";

import { NEAREST_COUNT, REALTIME_CACHE_SECONDS } from "@/lib/config";
import { loadStationDataset } from "@/lib/dataGoKr";
import { haversineMeters, isPlausibleKoreanCoordinate } from "@/lib/distance";
import { ApiError, ERROR_MESSAGE, toApiError } from "@/lib/errors";
import type { ApiErrorBody, NearbyStation, StationsResponse } from "@/types/station";

export const runtime = "nodejs";
/** 좌표별로 응답이 달라지므로 동적. 업스트림 호출 자체는 fetch 캐시로 재사용된다. */
export const dynamic = "force-dynamic";

const MAX_LIMIT = 20;

function errorResponse(error: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    { error: { code: error.code, message: ERROR_MESSAGE[error.code] } },
    { status: error.httpStatus, headers: { "Cache-Control": "no-store" } },
  );
}

function parseLimit(raw: string | null): number {
  if (!raw) return NEAREST_COUNT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return NEAREST_COUNT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request): Promise<NextResponse<StationsResponse | ApiErrorBody>> {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!isPlausibleKoreanCoordinate(lat, lng)) {
    return errorResponse(new ApiError("BAD_REQUEST", 400, "coordinates out of range"));
  }

  const limit = parseLimit(searchParams.get("limit"));

  try {
    const dataset = await loadStationDataset();
    const origin = { lat, lng };

    const stations: NearbyStation[] = dataset.stations
      .map((station) => ({
        station,
        distanceMeters: haversineMeters(origin, { lat: station.lat, lng: station.lng }),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit)
      .map(({ station, distanceMeters }, arrayIndex) => ({
        ...station,
        rank: arrayIndex + 1,
        distanceMeters: Math.round(distanceMeters),
      }));

    return NextResponse.json<StationsResponse>(
      {
        origin,
        stations,
        meta: {
          totalStations: dataset.stations.length,
          realtimeMatched: dataset.realtimeMatched,
          realtimeAvailable: dataset.realtimeAvailable,
          fetchedAt: dataset.fetchedAt,
        },
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REALTIME_CACHE_SECONDS}, stale-while-revalidate=${REALTIME_CACHE_SECONDS * 2}`,
        },
      },
    );
  } catch (error) {
    const apiError = toApiError(error);
    // 서버 로그에만 원인을 남기고, 클라이언트에는 코드와 안내 문구만 보낸다.
    console.error("[api/stations]", apiError.code, apiError.message);
    return errorResponse(apiError);
  }
}
