"use client";

import { useEffect, useState } from "react";

import { KAKAO_MAP_APP_KEY } from "@/lib/config";

export type KakaoLoadState = "idle" | "loading" | "ready" | "error";

export interface KakaoLoaderResult {
  state: KakaoLoadState;
  /** 설정 누락과 네트워크 실패를 구분해 다른 안내를 보여주기 위한 플래그 */
  missingKey: boolean;
}

const SCRIPT_ID = "kakao-maps-sdk";

/**
 * SDK 로드는 페이지당 한 번이면 충분하다.
 * React Strict Mode 의 이중 실행이나 컴포넌트 재마운트에도
 * 스크립트가 중복 삽입되지 않도록 모듈 스코프에 Promise 를 캐시한다.
 */
let loaderPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window unavailable"));
      return;
    }

    if (window.kakao?.maps?.Map) {
      resolve();
      return;
    }

    const finish = () => {
      if (!window.kakao?.maps) {
        reject(new Error("kakao namespace missing"));
        return;
      }
      // autoload=false 이므로 명시적으로 로드를 완료시켜야 한다.
      window.kakao.maps.load(() => resolve());
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("sdk load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      KAKAO_MAP_APP_KEY,
    )}&libraries=services&autoload=false`;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => {
        // 다음 시도에서 다시 붙을 수 있도록 캐시를 비운다.
        loaderPromise = null;
        script.remove();
        reject(new Error("sdk load failed"));
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function useKakaoLoader(enabled: boolean): KakaoLoaderResult {
  const missingKey = KAKAO_MAP_APP_KEY.trim() === "";
  const [state, setState] = useState<KakaoLoadState>("idle");

  useEffect(() => {
    if (!enabled) return;
    if (missingKey) {
      setState("error");
      return;
    }

    let cancelled = false;
    setState((current) => (current === "ready" ? current : "loading"));

    loadKakaoSdk()
      .then(() => {
        if (!cancelled) setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, missingKey]);

  return { state, missingKey };
}
