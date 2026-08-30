"use client";

export const KAKAO_APP_KEY =
  process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "ab45981f899d810312db82e79bb21881";

const SDK_ID = "kakao-maps-sdk";
let loader: Promise<typeof kakao> | null = null;

/**
 * Kakao Maps SDK를 딱 한 번만 로드합니다.
 * autoload=false + kakao.maps.load() 조합이라 SPA 전환에도 안전합니다.
 */
export function loadKakaoMaps(): Promise<typeof kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있습니다."));
  }
  if (loader) return loader;

  loader = new Promise<typeof kakao>((resolve, reject) => {
    const ready = () => {
      const sdk = window.kakao;
      if (!sdk) {
        reject(new Error("Kakao SDK 객체를 찾을 수 없습니다."));
        return;
      }
      sdk.maps.load(() => resolve(sdk));
    };

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps) {
        ready();
      } else {
        existing.addEventListener("load", ready, { once: true });
        existing.addEventListener("error", () => reject(new Error("SDK 로드 실패")), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => {
        loader = null;
        script.remove();
        reject(new Error("Kakao 지도를 불러오지 못했습니다."));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loader;
}
