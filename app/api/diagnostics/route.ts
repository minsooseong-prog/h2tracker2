import { NextResponse } from "next/server";

import {
  ALLOWED_UPSTREAM_HOSTS,
  DIAGNOSTICS_TOKEN,
  H2_OPERATION_URL,
  H2_REALTIME_URL,
} from "@/lib/config";
import { fetchOperationRaw, fetchRealtimeRaw } from "@/lib/dataGoKr";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 실제 API 응답의 필드명을 확인하기 위한 진단 라우트.
 *
 * 보안
 *  - Production 에서는 DIAGNOSTICS_TOKEN 환경변수가 있고 토큰이 일치할 때만 열린다.
 *    (토큰이 없으면 라우트 자체가 404 로 존재하지 않는 것처럼 동작한다)
 *  - 인증키는 응답 어디에도 포함되지 않는다.
 *  - 호출 대상 호스트는 config 의 허용 목록으로 고정되어 있다. (SSRF 방지)
 */

/** 타이밍 공격을 피하기 위한 상수 시간 비교 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!DIAGNOSTICS_TOKEN) return false;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return safeEqual(token, DIAGNOSTICS_TOKEN);
}

/**
 * 필드명 확인이 목적이므로 값 자체는 타입과 길이만 남긴다.
 * 진단 URL 이 우연히 공유되어도 데이터가 그대로 새어나가지 않게 한다.
 */
function maskRow(row: unknown): Record<string, string> | null {
  if (typeof row !== "object" || row === null) return null;
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      masked[key] = "null";
    } else if (typeof value === "number") {
      masked[key] = `number(${value})`;
    } else if (typeof value === "string") {
      masked[key] = `string(len ${value.length})`;
    } else {
      masked[key] = typeof value;
    }
  }
  return masked;
}

function describeEndpoint(url: string) {
  let host = "invalid-url";
  try {
    host = new URL(url).host;
  } catch {
    /* 형식이 잘못된 경우 그대로 둔다 */
  }
  return { host, allowed: (ALLOWED_UPSTREAM_HOSTS as readonly string[]).includes(host) };
}

async function probe(label: string, url: string, run: () => Promise<{ rows: unknown[]; sampleKeys: string[]; sampleRow: unknown }>) {
  const endpoint = describeEndpoint(url);
  if (!endpoint.allowed) {
    return { label, host: endpoint.host, ok: false, reason: "허용되지 않은 호스트입니다." };
  }
  try {
    const result = await run();
    return {
      label,
      host: endpoint.host,
      ok: true,
      rowCount: result.rows.length,
      sampleKeys: result.sampleKeys,
      sampleRow: maskRow(result.sampleRow),
    };
  } catch (error) {
    const apiError = toApiError(error);
    return { label, host: endpoint.host, ok: false, reason: apiError.code, detail: apiError.message };
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const [operation, realtime] = await Promise.all([
    probe("operation", H2_OPERATION_URL, fetchOperationRaw),
    probe("realtime", H2_REALTIME_URL, fetchRealtimeRaw),
  ]);

  return NextResponse.json(
    {
      hint: "sampleKeys 가 API 의 실제 필드명입니다. lib/fieldMap.ts 의 각 배열 맨 앞에 넣고 재배포하세요.",
      keyConfigured: Boolean(process.env.DATA_GO_KR_KEY),
      operation,
      realtime,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
