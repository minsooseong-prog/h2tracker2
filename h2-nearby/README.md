# 가까운 수소충전소 찾기

현재 위치에서 가장 가까운 수소차 충전소 **5곳**을 거리순으로 찾아, 한국석유관리원 공공데이터의
**실시간 운영·대기 정보**와 함께 보여주는 웹서비스입니다.

- 지도: Kakao Maps JavaScript SDK
- 데이터: 공공데이터포털 / 한국석유관리원 수소충전소 API (서버에서만 호출)
- 배포: Vercel (Next.js App Router)

---

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 위치 기반 검색 | Geolocation API로 현재 위치를 받아 Haversine 직선거리로 가까운 5곳 선정 |
| 지도 | 현재 위치 마커 + 1~5 순위 마커, 자동 범위 조정, 마커/카드 양방향 연동, 내 위치 복귀 |
| 실시간 정보 | 대기 차량 수, 완충 가능 대수, 운영 상태, 트레일러 압력, 판매가, 공지 (API가 주는 값만) |
| 혼잡도 뱃지 | 여유 / 보통 / 혼잡 / 영업 중 / 점검 중 / 운영 종료 / 정보 없음 |
| 위치 권한 거부 | 안내 메시지 + 지역·주소 직접 검색(카카오 로컬)으로 대체 |
| 상태 처리 | Loading · Error · Empty 각각 별도 화면. 기술적 스택은 사용자에게 노출하지 않음 |
| 반응형 | 데스크톱 = 지도 고정 + 목록 스크롤 / 모바일 = 지도 위, 카드 아래 |

### 스크린샷

<!-- 배포 후 캡처를 넣어주세요 -->
| 첫 화면 | 검색 결과 (데스크톱) | 검색 결과 (모바일) |
| --- | --- | --- |
| `docs/hero.png` | `docs/desktop.png` | `docs/mobile.png` |

---

## 기술 스택

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3.4 · Vercel Serverless Functions

외부 런타임 의존성은 Next/React뿐입니다. 지도·HTTP·상태관리 라이브러리를 따로 쓰지 않습니다.

---

## 프로젝트 구조

```
app/
  layout.tsx                     루트 레이아웃, 메타데이터, Pretendard
  page.tsx                       진입점
  error.tsx / not-found.tsx      전역 오류 · 404
  icon.svg                       파비콘
  globals.css                    Tailwind + 디자인 토큰
  api/stations/route.ts          가까운 충전소 조회 (서버 전용, 인증키 사용)
  api/stations/diagnose/route.ts 응답 필드 진단 (프로덕션에서는 토큰 필요)
components/
  Hero.tsx  Finder.tsx  KakaoMap.tsx
  StationList.tsx  StationCard.tsx  StatusBadge.tsx  RankMarker.tsx
  AddressSearch.tsx  Loading.tsx  ErrorMessage.tsx  EmptyState.tsx
lib/
  datago.ts        공공데이터 호출: 인증키 정규화, 페이징, 타임아웃, 키 마스킹
  stations.ts      목록 + 실시간 병합, 캐시, 가까운 순 선별
  normalize.ts     응답 봉투 해석 및 레코드 → 도메인 타입 변환
  fields.ts        필드명 후보 목록  ← 실제 필드명이 다를 때 여기만 고치면 됨
  congestion.ts    혼잡도 판정 규칙
  geo.ts           Haversine, 거리 포맷, 좌표 검증
  kakao.ts         Kakao SDK 단일 로더
types/
  station.ts  kakao.d.ts
scripts/
  probe.mjs        실제 응답 필드 확인 도구 (npm run probe)
  selftest.ts      로직 자체 검증 (npm test)
```

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local     # 값 채우기 (아래 참고)
npm run dev                    # http://localhost:3000
```

검증 명령:

```bash
npm test        # 로직 검증 (네트워크 불필요)
npm run probe   # 실제 공공데이터 응답 필드 확인
npm run typecheck
npm run lint
npm run build
```

---

## 환경변수

| 이름 | 위치 | 필수 | 설명 |
| --- | --- | --- | --- |
| `DATA_GO_KR_KEY` | 서버 전용 | ✅ | 공공데이터포털 인증키. Encoding/Decoding 어느 쪽이든 됩니다 |
| `H2_STATION_LIST_URL` | 서버 전용 | ✅ | 수소충전소 **현황**(위경도 포함) 목록조회 엔드포인트 |
| `H2_REALTIME_URL` | 서버 전용 | 권장 | 수소충전소 **실시간정보** 목록조회 엔드포인트 |
| `H2_OPERATION_URL` | 서버 전용 | 선택 | 수소충전소 **운영정보** 목록조회 엔드포인트 |
| `H2_PAGING_STYLE` | 서버 전용 | 선택 | `odcloud` 또는 `standard`. 자동 감지 실패 시에만 |
| `DIAGNOSE_TOKEN` | 서버 전용 | 선택 | 프로덕션에서 `/api/stations/diagnose` 를 열 때 필요 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 브라우저 | 선택 | Kakao JavaScript 키. 미설정 시 코드의 기본값 사용 |

`NEXT_PUBLIC_` 접두사가 붙은 것만 브라우저로 나갑니다. 나머지는 서버에서만 읽힙니다.

### 엔드포인트 확인 (최초 1회, 2분)

이 앱은 어떤 URL도 하드코딩하지 않습니다. 실제 주소는 공공데이터포털에서 복사합니다.

1. data.go.kr 로그인 → 마이페이지 → 오픈API → 활용신청한 목록에서 아래 3건을 엽니다.
   - 한국석유관리원_수소충전소 현황
   - 한국석유관리원_수소충전소_실시간정보 (`data.go.kr/data/15133338/openapi.do`)
   - 한국석유관리원_수소충전소_운영정보
2. 각 상세 페이지 → **활용명세 → 상세기능 → Swagger UI** 에서 목록조회를 한 번 실행합니다.
3. Swagger가 보여주는 **Request URL** 에서 `?` 앞부분(`https://.../목록조회`)만 복사해
   `.env.local` 의 해당 변수에 붙여넣습니다. `serviceKey`, `page`, `numOfRows` 같은
   파라미터는 서버가 알아서 붙이므로 함께 붙여넣어도 무시됩니다.
4. `npm run probe` 로 확인합니다. 레코드 건수, 매칭된 필드, 매칭되지 않은 키가 출력됩니다.
5. `✗ 매칭 실패` 가 있으면 출력된 실제 키 이름을 `lib/fields.ts` 의 해당 후보 배열에
   한 줄 추가하면 앱 전체에 반영됩니다. (인증키는 어떤 경우에도 출력되지 않습니다.)

배포 후에는 `DIAGNOSE_TOKEN` 을 설정하고
`https://<도메인>/api/stations/diagnose?token=<토큰>` 으로 같은 진단을 할 수 있습니다.

---

## 공공데이터 API 설명

### 실제로 사용하는 값

수소충전소 실시간정보(15133338)는 데이터셋 설명상 **수소튜브트레일러 압력, 완충 가능한 수소차량
대수, 수소차량 대기차수, 수소차량 혼잡상태**를 제공합니다. 이 앱은 그 값만 표시합니다.

- 대기 차량 수 → `대기 차량 3대` 처럼 숫자를 그대로 표시
- 혼잡상태 문자열이 있으면 그대로 뱃지에 사용
- 없으면 대기 차량 수로 환산: **0대 여유 / 1~2대 보통 / 3대 이상 혼잡**
  (수소유통정보시스템 '하잉'의 표기 방식을 따른 화면 표시 규칙이며, 화면 하단에 명시합니다)
- 대기 차량 수도 없으면 운영 상태 문자열만 표시
- 셋 다 없으면 **정보 없음** — 값을 만들어내지 않습니다

### 제공되지 않아 구현하지 않은 것

- 충전기(디스펜서)별 개별 상태와 "현재 사용 중인 충전기 수" — 필드가 내려오면 자동 표시되도록
  파서는 준비돼 있으나, 없으면 항목 자체가 렌더링되지 않습니다
- 예상 대기 시간, 실시간 수소 재고량(kg), 예약 가능 여부
- 도로 기준 주행거리 (표시하는 거리는 위경도 직선거리입니다)

---

## Kakao Map 설정

1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → **JavaScript 키**
2. 앱 설정 → **플랫폼 → Web → 사이트 도메인** 에 아래를 모두 등록합니다.
   - `http://localhost:3000`
   - `https://<프로젝트>.vercel.app` (Production)
   - Vercel Preview 도메인을 쓴다면 해당 도메인도 추가
   - 커스텀 도메인이 있다면 그 도메인도 추가
3. 등록하지 않은 도메인에서는 지도가 뜨지 않고 콘솔에 인증 오류가 납니다.

**JavaScript 키는 브라우저에 노출되는 것이 정상입니다.** 숨길 수 없으며, 보호 수단은
위의 사이트 도메인 화이트리스트입니다. 그래서 이 키만 `NEXT_PUBLIC_` 으로 다룹니다.

---

## API Key 보안

- 공공데이터 인증키는 `process.env.DATA_GO_KR_KEY` 로 **서버(Route Handler)에서만** 읽습니다.
- `lib/datago.ts` 는 `window` 가 정의된 환경에서 import 되면 즉시 예외를 던져, 클라이언트
  번들에 섞이는 실수를 빌드/런타임에서 잡습니다.
- 브라우저는 `/api/stations` 만 호출합니다. 공공데이터 도메인을 직접 부르지 않습니다.
- 에러 메시지·서버 로그에 들어가는 문자열은 `redact()` 로 `serviceKey=***` 처리합니다.
- 상세 힌트는 `NODE_ENV !== "production"` 일 때만 응답에 포함됩니다.
- `.env`, `.env.local`, `.env*.local` 은 `.gitignore` 에 포함돼 있습니다.
- 저장소에는 인증키 원문이 존재하지 않습니다. 커밋 전 확인:

  ```bash
  git grep -n "$(printf 'service')Key=" -- . | grep -v README   # 결과 없어야 정상
  ```

> 참고: 인증키를 채팅·이슈·스크린샷 등으로 외부에 공유한 적이 있다면
> data.go.kr 마이페이지에서 재발급받는 편이 안전합니다.

---

## GitHub

```bash
cd h2-nearby
git init
git add .
git commit -m "Initial hydrogen station finder"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

푸시 전에 `.env.local` 이 스테이징되지 않았는지 확인하세요.

```bash
git status --short | grep ".env" || echo "env 파일 없음 - OK"
```

---

## Vercel 배포

1. **저장소 연결** — Vercel → Add New → Project → 위 GitHub 저장소 Import
2. **프로젝트 생성** — Framework Preset이 Next.js로 자동 인식됩니다. 빌드 설정은 기본값 그대로.
3. **환경변수 설정** — Settings → Environment Variables 에서 추가합니다.

   | Key | Environments |
   | --- | --- |
   | `DATA_GO_KR_KEY` | Production, Preview, Development |
   | `H2_STATION_LIST_URL` | Production, Preview, Development |
   | `H2_REALTIME_URL` | Production, Preview, Development |
   | `H2_OPERATION_URL` | (사용 시) |
   | `NEXT_PUBLIC_KAKAO_MAP_KEY` | Production, Preview, Development |

   `DATA_GO_KR_KEY` 는 이미 등록돼 있다면 그대로 두고 나머지만 추가하면 됩니다.
   **환경변수를 추가·수정한 뒤에는 반드시 재배포**해야 반영됩니다 (Deployments → Redeploy).
4. **Kakao 도메인 등록** — 배포 URL이 나오면 Kakao Developers에 Production/Preview 도메인을 추가합니다.
5. **Deploy** — 이후 `main` 에 푸시할 때마다 자동 배포됩니다.

### 배포 후 확인

1. `https://<도메인>` 접속 → 첫 화면이 뜨는지
2. **서비스 시작** → 위치 권한 허용 → 지도와 카드 5개가 나오는지
3. 위치 권한을 **거부**했을 때 안내 문구와 주소 검색이 나오는지
4. 브라우저 콘솔에 Kakao 인증 오류가 없는지
5. 네트워크 탭에서 `apis.data.go.kr` 로 나가는 요청이 **없는지** (있으면 안 됩니다)
6. `https://<도메인>/api/stations?lat=37.5665&lng=126.9780` 가 JSON을 반환하는지

---

## Troubleshooting

| 증상 | 원인 / 해결 |
| --- | --- |
| `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` | 해당 API 활용신청이 승인되지 않았거나 키 오타. 신청 후 반영까지 몇 분 걸립니다 |
| 인증키가 맞는데 계속 실패 | Encoding 키를 그대로 넣어도 서버가 처리합니다. 앞뒤 공백·줄바꿈이 섞였는지 확인하세요 |
| `충전소 정보를 불러오지 못했습니다` | `npm run probe` 로 어떤 엔드포인트가 실패하는지 확인 |
| 목록은 나오는데 카드에 실시간 값이 비어 있음 | 필드명이 다른 경우입니다. `npm run probe` 의 "후보 목록에 없는 키"를 `lib/fields.ts` 에 추가 |
| 레코드 0건 | 응답 봉투가 예상 밖입니다. probe의 "봉투" 출력을 보고 `extractRecords` 를 확장하세요 |
| 지도가 회색으로만 표시 | Kakao Developers 사이트 도메인 미등록. 포트까지 정확히 일치해야 합니다 |
| 로컬은 되는데 Vercel에서 지도가 안 뜸 | Vercel 도메인이 Kakao에 등록되지 않았거나, 환경변수 추가 후 재배포하지 않음 |
| 위치 권한 요청이 아예 안 뜸 | Geolocation은 HTTPS 또는 localhost에서만 동작합니다 |
| `LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR` | 일일 호출량 초과. 실시간 60초 / 목록 6시간 캐시가 걸려 있으나, 개발계정은 10,000건 제한입니다 |

---

## 라이선스 / 출처

- 충전소 데이터: 한국석유관리원, 공공데이터포털 (이용허락범위 제한 없음)
- 지도: Kakao Maps
