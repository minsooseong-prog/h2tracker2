# H₂ 근처 — 가까운 수소충전소 찾기

현재 위치에서 가장 가까운 수소차 충전소 5곳을 거리순으로 찾고, 각 충전소의 운영 상태와 대기 차량 등 실시간 정보를 확인하는 웹서비스입니다.

한국석유관리원이 공공데이터포털로 개방한 수소충전소 운영정보·실시간정보를 서버에서 가져와, 카카오맵 위에 순위와 함께 표시합니다.

---

## 목차

- [주요 기능](#주요-기능)
- [Screenshot](#screenshot)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [로컬 실행](#로컬-실행)
- [환경변수](#환경변수)
- [카카오맵 설정](#카카오맵-설정)
- [공공데이터 API](#공공데이터-api)
- [API Key 보안](#api-key-보안)
- [GitHub 업로드](#github-업로드)
- [Vercel 배포](#vercel-배포)
- [Troubleshooting](#troubleshooting)
- [알려진 제한사항](#알려진-제한사항)

---

## 주요 기능

**가까운 충전소 5곳 찾기**
브라우저 Geolocation 으로 현재 좌표를 얻고, Haversine 공식으로 전국 충전소와의 직선거리를 계산해 가까운 순으로 5곳을 고릅니다. 거리는 `850m`, `2.1km` 처럼 읽기 쉬운 단위로 표시합니다.

**실시간 운영 정보**
운영 상태, 혼잡도, 대기 차량 대수, 완충 가능 대수, 충전기 수와 사용 가능 대수, 튜브트레일러 압력, 판매가격을 배지와 게이지로 보여줍니다. **API 가 제공하지 않는 값은 화면에 나타나지 않습니다.** 임의의 값으로 채우지 않습니다.

**지도 UX**
현재 위치 마커, 1~5 순위가 붙은 충전소 마커, 마커 클릭 시 해당 카드로 스크롤, 카드 클릭 시 지도 이동, 내 위치로 돌아가기, 전체 보기(자동 범위 조정)를 지원합니다.

**위치 권한 없이도 사용 가능**
권한을 거부했거나 브라우저가 위치를 지원하지 않으면 지역·주소 검색으로 대체할 수 있습니다.

**모든 상태 대응**
위치 확인 중 / 충전소 검색 중 / 위치 실패 / 지도 로딩 실패 / API 호출 실패 / 네트워크 오류 / 결과 없음 각각에 대한 화면이 준비되어 있고, 기술적인 오류 내용 대신 한국어 안내 문구를 보여줍니다.

**접근성**
Semantic HTML, 본문 건너뛰기 링크, 모든 상호작용 요소의 `aria-label`, 키보드 포커스 링, `aria-live` 상태 알림, `prefers-reduced-motion` 존중. 지도가 로드되지 않아도 목록만으로 모든 정보를 얻을 수 있습니다.

---

## Screenshot

> 배포 후 아래에 스크린샷을 추가하세요.

| 첫 화면 | 결과 (모바일) | 결과 (데스크톱) |
| --- | --- | --- |
| `docs/screenshot-hero.png` | `docs/screenshot-mobile.png` | `docs/screenshot-desktop.png` |

---

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript (strict, `noUncheckedIndexedAccess`) |
| UI | React 19 |
| 스타일 | Tailwind CSS v4 |
| 지도 | Kakao Maps JavaScript SDK (`services` 라이브러리 포함) |
| 데이터 | 공공데이터포털 · 한국석유관리원 수소충전소 실시간정보 / 운영정보 |
| 배포 | Vercel (Node.js Serverless Functions) |
| 폰트 | Pretendard (CDN) |

---

## 프로젝트 구조

```
h2-nearby/
├─ app/
│  ├─ layout.tsx              루트 레이아웃 · 메타데이터 · 폰트
│  ├─ page.tsx                홈 (헤더 · StationFinder · 푸터)
│  ├─ globals.css             Tailwind v4 토큰과 기본 스타일
│  ├─ error.tsx               예기치 못한 오류 화면
│  ├─ not-found.tsx           404
│  └─ api/
│     ├─ stations/route.ts    가까운 충전소 조회 (인증키는 여기서만 사용)
│     └─ diagnostics/route.ts 실제 API 응답 필드명 확인용 (토큰 보호)
│
├─ components/
│  ├─ Hero.tsx                첫 화면과 서비스 시작 버튼
│  ├─ StationFinder.tsx       전체 흐름 조율 (위치 → 조회 → 결과)
│  ├─ KakaoMap.tsx            지도 · 마커 · 범위 조정 · 생명주기 관리
│  ├─ StationList.tsx         목록 헤더와 새로고침
│  ├─ StationCard.tsx         충전소 카드
│  ├─ StatusBadge.tsx         운영 상태 · 혼잡도 배지
│  ├─ ChargerGauge.tsx        충전기 사용 가능 대수 게이지
│  ├─ RegionSearch.tsx        지역 · 주소 검색 (위치 권한 대체 수단)
│  └─ States.tsx              Loading · Error · Empty
│
├─ hooks/
│  ├─ useGeolocation.ts       위치 권한 요청과 실패 분기
│  ├─ useKakaoLoader.ts       SDK 단일 로드 보장
│  └─ useNearestStations.ts   서버 라우트 호출 · 취소 · 재시도
│
├─ lib/
│  ├─ config.ts               환경변수와 튜닝 값 한 곳
│  ├─ distance.ts             Haversine 거리 계산과 포맷
│  ├─ dataGoKr.ts             공공데이터 호출 (server-only)
│  ├─ normalize.ts            응답 정규화
│  ├─ fieldMap.ts             ★ API 필드명 매핑 — 여기만 고치면 됨
│  ├─ status.ts               운영 상태 · 혼잡도 해석
│  └─ errors.ts               오류 코드와 사용자용 한국어 문구
│
├─ types/
│  ├─ station.ts              도메인 타입
│  └─ kakao.d.ts              카카오맵 SDK 타입 선언
│
├─ .env.local.example
└─ .gitignore
```

---

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 값을 채워 넣으세요
npm run dev                        # http://localhost:3000
```

빌드와 검증:

```bash
npm run build       # 프로덕션 빌드
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

Node.js 20.9 이상이 필요합니다.

---

## 환경변수

| 이름 | 필수 | 노출 범위 | 설명 |
| --- | --- | --- | --- |
| `DATA_GO_KR_KEY` | 필수 | **서버 전용** | 공공데이터포털 인증키. Encoding / Decoding 어느 쪽이든 됩니다. |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 필수 | 브라우저 | 카카오맵 JavaScript 앱키 |
| `H2_REALTIME_URL` | 선택 | 서버 전용 | 실시간정보 요청주소 (기본값과 다를 때만) |
| `H2_OPERATION_URL` | 선택 | 서버 전용 | 운영정보 요청주소 (기본값과 다를 때만) |
| `DIAGNOSTICS_TOKEN` | 선택 | 서버 전용 | 설정 시 Production 에서 `/api/diagnostics` 접근 허용 |

`NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저 번들에 포함됩니다. `DATA_GO_KR_KEY` 는 접두사가 없으므로 클라이언트로 내려가지 않습니다.

---

## 카카오맵 설정

1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 애플리케이션 추가
2. **앱 키** 탭에서 **JavaScript 키**를 복사해 `NEXT_PUBLIC_KAKAO_MAP_KEY` 에 넣습니다
3. **플랫폼** → **Web** → 사이트 도메인에 아래를 모두 등록합니다

   ```
   http://localhost:3000
   https://<프로젝트명>.vercel.app
   https://<커스텀 도메인>          ← 있는 경우
   ```

   Vercel 의 Preview 배포에서도 지도를 보려면 해당 Preview 도메인도 추가해야 합니다. Preview URL 은 배포마다 바뀌므로, 상시 확인이 필요하면 Vercel 의 고정 Preview 도메인을 쓰는 편이 낫습니다.

4. 지역·주소 검색 기능은 SDK 의 `services` 라이브러리를 사용하며 같은 JavaScript 키로 동작합니다. 별도 REST 키는 필요하지 않습니다.

**JS 앱키 보안에 대해.** 카카오맵 JavaScript SDK 는 브라우저에서 실행되므로 앱키를 숨길 방법이 없습니다. 개발자 도구를 열면 누구나 볼 수 있습니다. 실제 보호 수단은 **허용 도메인 등록**입니다. 등록되지 않은 도메인에서 호출하면 카카오가 거부하므로, 키가 유출되어도 제3자가 다른 사이트에서 쓸 수 없습니다. 이 프로젝트는 앱키를 코드에 하드코딩하지 않고 환경변수로만 주입해 저장소에는 남기지 않습니다.

---

## 공공데이터 API

사용하는 데이터셋:

- **한국석유관리원 수소충전소 실시간정보** ([data.go.kr/data/15133338](https://www.data.go.kr/data/15133338/openapi.do))
  수소튜브트레일러 압력, 완충 가능한 수소차량 대수, 수소차량 대기차수, 수소차량 혼잡상태
- **한국석유관리원 수소충전소 운영정보**
  충전소명, 주소, 위경도, 운영시간 등 기본 정보

두 데이터셋 모두 공공데이터포털에서 **활용신청**을 해야 인증키가 동작합니다. 개발계정 트래픽은 일 10,000 건입니다.

### 응답 필드명 확정하기 — 배포 후 반드시 한 번

이 API 의 상세 명세는 로그인 후 Swagger UI 에서만 볼 수 있어, 코드에는 응답 필드명을 **단정하지 않고 후보 목록으로** 넣어두었습니다 (`lib/fieldMap.ts`). 후보 중 실제 응답에 있는 키를 찾아 쓰고, 못 찾으면 값은 `null` 이 되어 화면에 "정보 없음" 으로 처리됩니다. 없는 값을 지어내지 않습니다.

실제 필드명을 확정하는 절차는 1 분이면 됩니다.

1. Vercel 환경변수에 `DIAGNOSTICS_TOKEN` 을 아무나 모를 긴 문자열로 추가하고 재배포
2. 브라우저에서 접속

   ```
   https://<도메인>/api/diagnostics?token=<그 문자열>
   ```

3. 응답의 `operation.sampleKeys` / `realtime.sampleKeys` 가 **API 의 진짜 필드명**입니다
4. `lib/fieldMap.ts` 의 해당 배열 맨 앞에 그 이름을 넣고 커밋 → 재배포
5. 확인이 끝나면 `DIAGNOSTICS_TOKEN` 을 삭제해 진단 라우트를 닫습니다 (토큰이 없으면 404)

진단 응답에는 인증키가 포함되지 않으며, 호출 대상 호스트는 `lib/config.ts` 의 허용 목록으로 고정되어 있습니다.

요청주소가 기본값과 다르면 `H2_REALTIME_URL` / `H2_OPERATION_URL` 환경변수로 덮어쓸 수 있습니다. 코드 수정 없이 주소만 바꿔 확인할 수 있습니다.

---

## API Key 보안

이 프로젝트가 공공데이터 인증키를 지키는 방법입니다.

**1. 서버에서만 읽습니다.**
`process.env.DATA_GO_KR_KEY` 는 `app/api/*` 와 `lib/dataGoKr.ts` 에서만 참조합니다. 브라우저는 공공데이터 API 를 직접 호출하지 않고, 항상 `/api/stations` 를 거칩니다.

**2. 컴파일 단계에서 차단합니다.**
`lib/dataGoKr.ts` 맨 위에 `import "server-only"` 가 있습니다. 이 파일을 클라이언트 컴포넌트에서 import 하면 **빌드가 실패합니다.** 실수로 키가 클라이언트 번들에 섞이는 일을 사람이 아니라 컴파일러가 막습니다.

**3. 저장소에 남기지 않습니다.**
`.gitignore` 에 `.env`, `.env.local`, `.env.*.local` 이 모두 포함되어 있습니다. `.env.local.example` 에는 자리표시자만 있습니다.

**4. 오류에 실려 나가지 않습니다.**
업스트림 오류는 `lib/errors.ts` 에서 정해진 코드로만 좁혀 전달합니다. 스택 트레이스, 요청 URL, 인증키는 클라이언트 응답에 절대 포함되지 않습니다. 원인은 서버 로그에만 남습니다.

**5. 인코딩 실수를 방지합니다.**
공공데이터포털은 Encoding 키와 Decoding 키를 함께 발급합니다. Encoding 키를 한 번 더 인코딩하면 `%2B` 가 `%252B` 가 되어 인증에 실패합니다. `buildServiceKeyParam()` 이 이미 인코딩된 문자열인지 판별해 한 번만 인코딩합니다.

### 커밋 전 최종 확인

```bash
# 저장소 어디에도 키 원문이 없는지 확인 (아무것도 출력되지 않아야 정상)
git grep -nE "DATA_GO_KR_KEY\s*=\s*[A-Za-z0-9%+/]{20,}"
git grep -n "$(head -c 8 <<< \"$DATA_GO_KR_KEY\")"   # 키 앞 8자로 검색 (셸 변수에 담아 사용)
git ls-files | grep -E "^\.env" # .env.local.example 만 나와야 함
```

키가 이미 커밋된 뒤라면 파일만 지워서는 소용이 없습니다. 히스토리에 남아 있으므로 **공공데이터포털에서 키를 재발급**하는 것이 유일한 해결책입니다.

---

## GitHub 업로드

```bash
git init
git add .
git commit -m "Initial hydrogen station finder"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

푸시 전에 위의 [커밋 전 최종 확인](#커밋-전-최종-확인) 을 실행하세요.

---

## Vercel 배포

**1. 프로젝트 생성**
[vercel.com/new](https://vercel.com/new) → GitHub 저장소 선택 → Import.
Framework Preset 은 Next.js 로 자동 인식됩니다. Build Command 와 Output Directory 는 기본값 그대로 두면 됩니다.

**2. 환경변수 설정**
Project → Settings → Environment Variables 에서 아래를 추가합니다. Production, Preview, Development 세 환경 모두 체크하세요.

| Key | Value |
| --- | --- |
| `DATA_GO_KR_KEY` | 공공데이터포털 인증키 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오맵 JavaScript 앱키 |

`NEXT_PUBLIC_` 변수는 **빌드 시점에 번들에 박힙니다.** 나중에 값을 바꾸면 반드시 재배포해야 반영됩니다.

**3. 카카오 도메인 등록**
배포 URL 이 나오면 Kakao Developers 의 Web 플랫폼에 그 도메인을 추가합니다. 이걸 빼먹으면 지도만 비어 보입니다.

**4. 배포 후 확인**

- [ ] 첫 화면이 뜨고 **서비스 시작** 버튼이 보인다
- [ ] 버튼을 누르면 브라우저가 위치 권한을 묻는다
- [ ] 허용하면 지도가 뜨고 1~5 번 마커가 표시된다
- [ ] 카드를 누르면 지도가 해당 마커로 이동한다
- [ ] 마커를 누르면 해당 카드로 스크롤된다
- [ ] 개발자 도구 Network 탭에서 `el.h2nbiz.or.kr` 로 가는 요청이 **없다** (모두 `/api/stations` 를 거쳐야 함)
- [ ] 개발자 도구에서 페이지 소스를 검색해 공공데이터 인증키가 나오지 않는다
- [ ] 위치 권한을 거부해도 지역 검색으로 충전소를 찾을 수 있다
- [ ] Console 에 오류가 없다

---

## Troubleshooting

**지도 영역이 비어 있고 "지도를 불러오지 못했습니다" 가 뜬다**
Kakao Developers 의 Web 플랫폼 사이트 도메인에 현재 접속 중인 도메인이 등록되어 있는지 확인하세요. `http://localhost:3000` 과 `https://<프로젝트>.vercel.app` 은 서로 다른 도메인입니다. 포트와 프로토콜까지 정확히 일치해야 합니다.

**"카카오맵 앱키가 설정되지 않았습니다"**
`NEXT_PUBLIC_KAKAO_MAP_KEY` 가 비어 있습니다. Vercel 에 추가했다면 **재배포**가 필요합니다. `NEXT_PUBLIC_` 변수는 런타임이 아니라 빌드 시점에 주입됩니다.

**"공공데이터 인증에 실패했습니다"**
세 가지를 확인하세요. ① 해당 데이터셋에 **활용신청**이 승인되었는지 ② 키를 공백 없이 정확히 붙여넣었는지 ③ 개발계정 키의 유효기간이 남아 있는지. 신청 직후에는 반영까지 몇 분에서 한 시간 정도 걸릴 수 있습니다.

**"오늘 조회 가능한 횟수를 모두 사용했습니다"**
개발계정 일일 한도(10,000건)를 초과했습니다. 자정에 초기화됩니다. 운영계정으로 트래픽 증설을 신청할 수 있습니다. 참고로 이 서비스는 실시간 데이터를 60초, 기본 정보를 6시간 캐시해 호출을 줄입니다.

**충전소는 나오는데 실시간 정보가 전부 "정보 없음" 이다**
`lib/fieldMap.ts` 의 후보 필드명이 실제 응답과 다릅니다. 위의 [응답 필드명 확정하기](#응답-필드명-확정하기--배포-후-반드시-한-번) 절차를 따라주세요.

**목록이 비어 있다 (충전소를 하나도 못 찾음)**
운영정보 API 응답에 위경도가 없거나 필드명이 다를 가능성이 큽니다. `/api/diagnostics` 로 `sampleRow` 를 확인해 좌표 필드명을 `LAT_FIELDS` / `LNG_FIELDS` 에 추가하세요.

**위치가 부정확하다**
데스크톱 브라우저는 IP 기반으로 위치를 추정해 수 km 오차가 납니다. 모바일에서 GPS 로 확인하거나, 지역 검색으로 정확한 기준점을 지정하세요.

**HTTPS 페이지인데 위치 권한을 못 받는다**
Geolocation API 는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작합니다. Vercel 은 기본이 HTTPS 이므로 문제되지 않지만, 사설 IP 로 접속 중이라면 권한 요청이 무시됩니다.

**빌드가 `server-only` 오류로 실패한다**
클라이언트 컴포넌트(`"use client"`)에서 `lib/dataGoKr.ts` 나 서버 전용 값을 import 했다는 뜻입니다. 의도한 방어 장치입니다. 해당 로직을 API 라우트로 옮기세요.

---

## 알려진 제한사항

**거리는 직선거리입니다.** Haversine 으로 계산한 대권거리이며 실제 주행거리가 아닙니다. 강이나 산으로 막힌 경우 순위가 체감과 다를 수 있습니다. 주행거리를 쓰려면 카카오 내비 길찾기 API 가 별도로 필요합니다.

**API 필드명이 확정되지 않았습니다.** 위에 설명한 대로 후보 매칭 방식으로 동작합니다. 배포 후 `/api/diagnostics` 로 한 번 확정하는 것을 전제로 만들어졌습니다.

**혼잡도의 일부는 파생 값입니다.** API 가 혼잡상태를 직접 주면 그 값을 그대로 씁니다. 주지 않고 대기 차량 대수만 있으면 `0대 → 여유`, `1~2대 → 이용 중`, `3대 이상 → 혼잡` 으로 구간을 나눕니다. 숫자 자체는 API 실측값이고 구간 구분만 이 서비스의 표현이며, 해당 배지에는 그 사실이 툴팁으로 표시됩니다. 둘 다 없으면 혼잡도를 표시하지 않습니다.

**충전기 개별 상태는 다루지 않습니다.** 데이터셋 설명에 개별 충전기 단위 상태가 명시되어 있지 않아, 충전기 관련 항목은 응답에 있을 때만 표시됩니다.

**즐겨찾기와 길찾기가 없습니다.** 현재 범위는 "가장 가까운 곳 찾기" 에 집중되어 있습니다.

**실시간성에는 지연이 있습니다.** 서버가 60초간 캐시하며, 원본 데이터 자체도 충전소 단말에서 수집되는 주기가 있습니다. 방문 전 충전소에 확인하시기 바랍니다.

---

## 데이터 출처

- 충전소 정보: 공공데이터포털 · 한국석유관리원 수소유통정보시스템(하잉)
- 지도: 카카오맵
