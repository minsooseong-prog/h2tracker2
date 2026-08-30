import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

/** Vercel 은 배포마다 VERCEL_URL 을 주입한다. 없으면 로컬로 본다. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "가까운 수소충전소 · H2 근처",
  description:
    "내 위치에서 가장 가까운 수소차 충전소 5곳을 찾고, 운영 상태와 대기 차량 등 실시간 정보를 확인하세요.",
  applicationName: "H2 근처",
  keywords: ["수소충전소", "수소차", "충전소 찾기", "실시간 충전소", "넥쏘"],
  openGraph: {
    title: "가까운 수소충전소 · H2 근처",
    description: "내 주변 가장 가까운 수소충전소를 실시간 정보와 함께 찾아보세요.",
    type: "website",
    locale: "ko_KR",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://dapi.kakao.com" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh bg-paper pb-[env(safe-area-inset-bottom)] text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
