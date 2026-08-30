import { extractRecords, extractUpstreamError } from "@/lib/normalize";
import type { RawRecord } from "@/types/station";

/* 이 모듈은 서버에서만 실행됩니다. 클라이언트 번들에 섞이면 즉시 실패시킵니다. */
if (typeof window !== "undefined") {
  throw new Error("lib/datago 는 서버 전용 모듈입니다.");
}

/** 어떤 문자열에서도 serviceKey 값을 지웁니다. 로그·에러 힌트에 항상 적용합니다. */
export function redact(text: string): string {
  return text.replace(/([?&](?:serviceKey|ServiceKey)=)[^&\s"']+/g, "$1***");
}

export class DataGoError extends Error {
  constructor(
    message: string,
    readonly code: "CONFIG_MISSING" | "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT",
    hint?: string,
  ) {
    super(message);
    this.name = "DataGoError";
    this.hint = hint ? redact(hint) : undefined;
  }

  readonly hint: string | undefined;
}

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_PAGES = 12;
const PAGE_SIZE = 500;

/**
 * 공공데이터포털 인증키는 Encoding / Decoding 두 벌로 발급됩니다.
 * 어느 쪽을 환경변수에 넣어도 동작하도록, 항상 "디코딩된 원문"으로 되돌린 뒤
 * 딱 한 번만 인코딩합니다. (URLSearchParams 에 인코딩 키를 넣으면 %가 %25로
 * 이중 인코딩되어 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 가 납니다.)
 */
export function normalizeServiceKey(rawKey: string): string {
  let key = rawKey.trim();
  if (/%[0-9A-Fa-f]{2}/.test(key)) {
    try {
      key = decodeURIComponent(key);
    } catch {
      /* 디코딩 실패 시 원문 사용 */
    }
  }
  return encodeURIComponent(key);
}

export function requireServiceKey(): string {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key || key.trim() === "") {
    throw new DataGoError(
      "공공데이터 인증키가 설정되지 않았습니다.",
      "CONFIG_MISSING",
      "DATA_GO_KR_KEY 환경변수를 설정하세요.",
    );
  }
  return normalizeServiceKey(key);
}

export type PagingStyle = "odcloud" | "standard";

export function detectPagingStyle(endpoint: string): PagingStyle {
  const override = process.env.H2_PAGING_STYLE;
  if (override === "odcloud" || override === "standard") return override;
  try {
    return new URL(endpoint).hostname.includes("odcloud") ? "odcloud" : "standard";
  } catch {
    return "standard";
  }
}

/** 엔드포인트 + 페이지 번호로 실제 호출 URL을 만듭니다. */
export function buildUrl(endpoint: string, page: number, serviceKey: string): string {
  const url = new URL(endpoint);
  const style = detectPagingStyle(endpoint);

  // 사용자가 Swagger에서 복사하며 함께 붙여온 키/페이징 값은 제거하고 다시 세팅
  for (const key of ["serviceKey", "ServiceKey", "page", "perPage", "pageNo", "numOfRows", "type", "dataType", "returnType"]) {
    url.searchParams.delete(key);
  }

  if (style === "odcloud") {
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(PAGE_SIZE));
  } else {
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", String(PAGE_SIZE));
    url.searchParams.set("type", "json");
    url.searchParams.set("dataType", "JSON");
  }

  // serviceKey 는 이미 인코딩된 상태이므로 searchParams 를 거치지 않고 직접 붙입니다.
  const query = url.searchParams.toString();
  return `${url.origin}${url.pathname}?${query}&serviceKey=${serviceKey}`;
}

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new DataGoError(
        "공공데이터 서버가 오류를 반환했습니다.",
        "UPSTREAM_ERROR",
        `HTTP ${response.status} ${text.slice(0, 200)}`,
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      // XML 에러 페이지가 오는 경우가 많습니다.
      throw new DataGoError(
        "공공데이터 응답을 해석하지 못했습니다.",
        "UPSTREAM_ERROR",
        `JSON 이 아닌 응답: ${text.slice(0, 200)}`,
      );
    }
  } catch (error) {
    if (error instanceof DataGoError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DataGoError("공공데이터 서버 응답이 지연되고 있습니다.", "UPSTREAM_TIMEOUT");
    }
    throw new DataGoError(
      "공공데이터 서버에 연결하지 못했습니다.",
      "UPSTREAM_ERROR",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 엔드포인트 전체 레코드를 페이지네이션하며 모읍니다. */
export async function fetchAllRecords(endpoint: string, revalidate: number): Promise<RawRecord[]> {
  const serviceKey = requireServiceKey();
  const all: RawRecord[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchJson(buildUrl(endpoint, page, serviceKey), revalidate);

    const upstreamError = extractUpstreamError(payload);
    if (upstreamError) {
      throw new DataGoError("공공데이터 API가 오류를 반환했습니다.", "UPSTREAM_ERROR", upstreamError);
    }

    const records = extractRecords(payload);
    all.push(...records);

    if (records.length < PAGE_SIZE) break;
  }

  return all;
}

export interface Endpoints {
  stationList: string | undefined;
  realtime: string | undefined;
  operation: string | undefined;
}

export function readEndpoints(): Endpoints {
  const clean = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };
  return {
    stationList: clean(process.env.H2_STATION_LIST_URL),
    realtime: clean(process.env.H2_REALTIME_URL),
    operation: clean(process.env.H2_OPERATION_URL),
  };
}
