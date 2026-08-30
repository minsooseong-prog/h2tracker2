export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** 두 좌표 사이 직선거리(m). Haversine 공식. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 850m, 2.1km 처럼 사람이 읽는 문자열로 변환 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "-";
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

/** 대한민국 영역 안의 좌표인지 (제주·울릉·독도 포함) */
export function isInKorea(p: LatLng): boolean {
  return p.lat >= 32.5 && p.lat <= 39.5 && p.lng >= 124 && p.lng <= 132.5;
}

export function isValidLatLng(p: Partial<LatLng>): p is LatLng {
  return (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180 &&
    !(p.lat === 0 && p.lng === 0)
  );
}

/** origin에서 가까운 순으로 정렬한 뒤 앞에서 limit개를 잘라냅니다. */
export function nearest<T extends LatLng>(
  origin: LatLng,
  items: readonly T[],
  limit: number,
): Array<T & { distanceMeters: number }> {
  return items
    .map((item) => ({ ...item, distanceMeters: haversineMeters(origin, item) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, Math.max(0, limit));
}
