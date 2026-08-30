import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가까운 수소충전소 찾기",
  description:
    "현재 위치에서 가장 가까운 수소차 충전소 5곳과 실시간 운영·대기 정보를 확인하세요. 한국석유관리원 공공데이터 기반.",
  keywords: ["수소충전소", "수소차", "충전소 찾기", "실시간 대기", "넥쏘"],
  openGraph: {
    title: "가까운 수소충전소 찾기",
    description: "내 주변 가장 가까운 수소충전소를 거리순으로, 실시간 운영 정보와 함께.",
    type: "website",
    locale: "ko_KR",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://dapi.kakao.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <main id="main" className="min-h-dvh">
          {children}
        </main>
      </body>
    </html>
  );
}
