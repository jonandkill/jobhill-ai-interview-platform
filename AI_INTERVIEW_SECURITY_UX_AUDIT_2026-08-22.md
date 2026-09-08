# JOB HILL AI 모의면접 플랫폼 보안·UX 개선 보고서

- 기준일: 2026-08-22
- 범위: 첨부 소스의 React 클라이언트, Express/tRPC API, 인증, 결제, 카메라·마이크 흐름, AI 피드백, 내보내기, 개인정보 안내
- 목적: 취약점 제거, 사용자 생애주기 재설계, 카메라 기반 면접 준비 흐름의 신뢰성과 운영 준비도 향상

## 1. 요약

가장 위험했던 항목은 평문 운영 자격 증명이 들어 있던 숨김 배포 설정, 객체 ID만 바꾸면 다른 사용자의 면접·문서·일정·연습 데이터에 접근할 수 있는 BOLA/IDOR, 브라우저가 가격이나 결제 성공 결과를 정할 수 있던 결제 경로, 사용자가 직접 크레딧 환불 수량을 보내 잔액을 늘릴 수 있던 API, OAuth state·리디렉션 검증 부족, 임의 URL 음성 변환 경로였습니다. 해당 설정 파일을 개선본에서 제거하고 서버 소유권·상태·가격 검증, 원자적 DB 처리, 서버 생성 nonce, 고정 리디렉션, 위험 경로 폐기로 보완했습니다.

카메라는 표정·감정·성격·합격 가능성을 추론하는 도구가 아니라 셀프뷰와 촬영 환경 점검으로 다시 정의했습니다. 사용자가 권한을 허용하기 전에 목적을 알 수 있고, 장치 점검·마이크 레벨·오류 복구·트랙 정리가 동작하도록 구현했습니다.

대시보드는 허구의 이용자 수·합격률·동료 비교 대신 `지원 정보 → 첫 면접 → 근거 피드백 → 재연습` 생애주기와 실제 사용자 데이터에 따른 다음 행동을 표시합니다. 기존 `passRate` 컬럼은 DB 호환을 위해 유지하되 화면과 출력물에서는 “답변 준비도”라는 연습 지표로만 해석합니다.

## 2. 보안 진단 및 조치

| 등급 | 문제 | 조치 | 상태 |
|---|---|---|---|
| Critical | `.project-config.json`에 DB·JWT·결제·AI·클라우드 자격 증명 평문 포함 | 개선본에서 파일 제거, `.env.example`만 제공. 이미 노출된 모든 값은 운영자가 폐기·재발급해야 함 | 코드 완료 / 키 회전 즉시 필요 |
| Critical | 면접 세션·QA·문서·일정·저장 연습·기업 분석·공유 목록의 BOLA/IDOR | 모든 객체 조회·수정·삭제 전에 `ctx.user.id`와 소유자 검증, 존재 여부와 권한 여부를 동일한 `NOT_FOUND`로 처리 | 완료 |
| Critical | 사용자가 `credits.refund.amount`를 보내 크레딧 무제한 생성 | 사용자 호출형 환불 API 폐기, AI 실패 시 서버가 직전 차감분만 자동 원복 | 완료 |
| Critical | 레거시 결제 결과를 브라우저가 성공 코드로 위조 | 진위를 검증할 수 없는 키움페이 브라우저 콜백·로컬 환불 경로 폐기, 서버 검증 Toss 경로만 사용 | 완료 |
| Critical | 결제 금액을 클라이언트가 지정 | `shared/products.ts` 단일 상품 카탈로그를 서버 기준으로 사용, 결제·외부 승인 신청 모두 서버 가격 강제 | 완료 |
| Critical | 결제 중복 승인과 이용권 중복 지급 | pending 상태 조건부 갱신과 이용권/구독 생성을 하나의 DB 트랜잭션으로 처리 | 완료 |
| High | OAuth state 재사용·오픈 리디렉션·세션 설정 불일치 | 서버 생성 10분 nonce 쿠키, 상대 경로만 허용, 앱 ID·JWT 비밀 검증, 30일 만료와 SameSite=Lax 통일 | 완료 |
| High | 하드코딩 결제·스케줄러 비밀과 운영 기본값 | 실제 키 제거, 32자 이상 환경변수 필수, 운영 시작 시 설정 누락을 fail-fast 처리 | 완료 |
| High | 임의 `audioUrl`을 서버가 가져오는 SSRF·비용 남용 | URL 기반 변환 API 폐기, 로그인 사용자 Base64 직접 업로드만 허용, MIME·언어·12MB 제한 | 완료 |
| High | 공유 코드 예측과 비공개 목록 노출 | 암호학적 난수 코드, 비공개 목록 소유자 검증, 최소 필드만 응답 | 완료 |
| High | 저장·내보내기 HTML 주입(XSS) | 공통 HTML 이스케이프 함수 도입, 면접·공유·히스토리·PDF HTML 생성 경로에 적용, 회귀 테스트 추가 | 완료 |
| High | OAuth·API에 넓은 요청 본문과 보안 헤더 부재 | JSON 20MB/폼 1MB, IP rate limit, CSP/HSTS/nosniff/frame deny/referrer/permissions policy, API no-store | 완료 |
| High | 영수증·약관·개인정보 화면의 하드코딩 개인정보, HTML 주입, 카드번호 노출 | 사업자·고객지원 정보는 서버/공개 클라이언트 환경변수로 이동, 민감한 레거시 결제 문서 제거, 모든 영수증 HTML 이스케이프, 카드 끝 4자리만 표시, 다운로드 파일명과 CSP 강화 | 완료 |
| Medium | 외부 결제 승인 금액과 구독 활성화가 분리되어 장애·중복 가능 | 서버 가격 저장, pending→approved와 구독 upsert를 단일 트랜잭션으로 처리, 일반 결제를 자동갱신으로 표시하지 않음 | 완료 |
| Medium | 파일 URL·이름 무제한 저장 | HTTPS URL 2,048자, 파일명 255자 제한 | 완료 |
| Medium | 세션 시작 권한과 답변 크레딧 기준 불일치 | 세션 시작과 답변 제출이 구독·체험·`questionCredits` 기준을 공유, 세션 생성 시 중복 차감 제거 | 완료 |

참고 기준: [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/), [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/).

## 3. 사용자 생애주기와 UI 개선

### 최초 방문·가입

- 검증되지 않은 “15,000명”, “89%”, 성공 후기 샘플, 긴급 할인 타이머를 제거했습니다.
- 실제 기본 혜택을 “질문 크레딧 3개”로 통일하고 음성 면접은 별도 이용권/구독이 필요함을 명시했습니다.
- OAuth 시작은 서버 state 생성 경로로만 연결합니다.

### 온보딩·지원 정보

- 대시보드가 프로필 완성 여부를 판단해 지원 회사·직무·이력서 입력을 다음 행동으로 제시합니다.
- 지원 정보가 없으면 맞춤 질문을 생성하지 않고 사용자가 먼저 자료를 보완하도록 안내합니다.

### 촬영 전 점검

- 사용자가 버튼을 눌러야 권한을 요청하며 권한 목적을 먼저 설명합니다.
- 카메라 셀프뷰, 마이크 입력 레벨, 실제 장치명, 권한 거절·장치 없음·장치 점유 오류와 재시도를 제공합니다.
- 컴포넌트 이탈·다시 점검 시 MediaStream 트랙, AudioContext, animation frame을 정리합니다.
- 카메라 사용 여부를 선택할 수 있고 카메라 사용 시 점검 완료 전 면접 시작을 막습니다.

브라우저 카메라는 보안 컨텍스트(HTTPS/localhost)와 사용자 권한이 필요합니다. 운영 배포도 이 전제를 따라야 합니다: [MDN `getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

### 면접·피드백·재연습

- 질문별 피드백은 관련성·근거·구조·직무 연관성·명료성 5개 항목(각 20점)의 고정 루브릭을 사용합니다.
- 답변에 없는 경력·성과·수치를 만들지 않고, 판단 근거가 된 답변 구절과 정보 부족 한계를 반환하도록 프롬프트·스키마를 강화했습니다.
- AI가 잘못된 JSON이나 범위 밖 점수를 반환하면 가짜 기본 점수로 대체하지 않고 실패 처리하며 크레딧을 원복합니다.
- “합격 확률”, 경쟁자 비교, 직무 적합 성격 추론, 표정·감정 점수 UI를 제거했습니다.
- 결과 화면은 실제 답변의 연습 지표와 다음 재연습 행동을 보여줍니다.

생성형 AI 평가는 실제 채용 판단이 아니라 보조 피드백으로 운영하고, 사람의 검토·한계 고지·모니터링을 유지해야 합니다: [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence).

### 접근성

- 핵심 버튼은 모바일에서 최소 44px 높이로 조정하고, 장치 상태·오류를 색상 외 텍스트와 아이콘으로도 전달합니다.
- 카메라 영역과 마이크 입력 상태에 접근성 이름을 부여했습니다.
- 실제 키보드 탐색, 200% 확대, 스크린리더, 색 대비 점검은 배포 전 장치 매트릭스에서 추가 수행해야 합니다. 기준: [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/).

## 4. 성능·안정성 개선

- 요청 본문과 AI 입력 길이를 제한해 메모리·토큰 비용 폭증을 줄였습니다.
- 면접 진행 수와 크레딧 차감을 조건부 원자 갱신으로 변경해 동시 요청 중복을 방지했습니다.
- 중복 답변 제출을 차단하고 AI 실패 시 크레딧을 복구합니다.
- 카메라 컴포넌트의 중복 요청 race를 request ID로 차단하고 모든 리소스를 정리합니다.
- 외부 결제·Toss 이용권 지급을 트랜잭션화해 재시도 시 중복 지급을 방지합니다.
- API rate limit은 현재 단일 프로세스 메모리 방식입니다. 다중 인스턴스 운영 전 Redis 등 공유 저장소 기반 제한기로 교체해야 합니다.

## 5. 검증 결과

- TypeScript 전체 검사(`tsc --noEmit`): 통과
- CI 결정론 테스트(`pnpm test:ci`): 9개 파일, 47개 테스트 모두 통과
- 별도 핵심 회귀 테스트: 63개 테스트 모두 통과
- Vite 클라이언트와 esbuild 서버 프로덕션 빌드: 통과
- 프로덕션 스모크 테스트: `/` 200 응답, CSP·HSTS·Permissions-Policy와 API rate-limit 헤더 확인
- 라우트 단위 코드 분할 후 초기 엔트리 JS: 3,022.59kB(gzip 788.05kB)에서 427.59kB(gzip 132.27kB)로 감소
- 하드코딩 결제·스케줄러 비밀, `amount: input.amount`, 임의 `userId`, `transcribeFromUrl`, SameSite=None, 레거시 결제 결과 경로 정적 검색: 운영 코드에서 제거 확인
- 상품 카탈로그와 HTML 이스케이프 회귀 테스트 추가
- 전체 레거시 테스트 중 남은 실패는 폐기된 키움페이 경로 기대값과 DB·Toss 키·Python `edge_tts`가 필요한 통합 테스트로 분리했습니다. 병합 기준 CI는 외부 자격 증명 없이 재현 가능한 회귀 테스트만 실행합니다.

## 6. 운영 배포 전 필수 체크리스트

1. 원본 `.project-config.json`에 있던 DB 비밀번호, JWT, AWS/S3, Stripe, Toss, Forge/AI 등 모든 자격 증명을 즉시 폐기·재발급하고 관련 접근 로그를 검토합니다.
2. `.env.example`의 모든 필수 값을 운영 비밀 저장소에 설정하고 `APP_BASE_URL`·OAuth URL을 HTTPS 운영 도메인으로 고정합니다. 공개 약관·개인정보 고지와 영수증에 필요한 `BUSINESS_*`, `VITE_BUSINESS_*`, `VITE_SUPPORT_*` 값도 실제 사업자 정보로 설정합니다.
3. 깨끗한 CI에서 `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test:ci`, `pnpm build`를 실행하고, 공급자 자격 증명이 있는 스테이징에서 전체 통합 테스트를 별도로 수행합니다.
4. DB 백업 후 Drizzle 마이그레이션과 결제 pending/중복 승인/부분 환불 시나리오를 스테이징에서 검증합니다.
5. 실제 OAuth 공급자, Toss 테스트 상점, STT/TTS 공급자를 이용한 E2E 테스트를 수행합니다.
6. Chrome·Safari·Edge 및 iOS/Android에서 권한 허용·거절·재허용·전화 수신·백그라운드 전환·장치 점유를 테스트합니다.
7. 영상이 서버로 전송되지 않는 현재 구조와 음성 전사 공급자·보존 기간·삭제 절차가 개인정보처리방침과 실제 운영에 일치하는지 법무·개인정보 담당자가 확인합니다.
8. 다중 서버 배포 전 Redis 기반 rate limit, 중앙 감사 로그, 오류 추적, 비용 알림을 적용합니다.
9. 접근성 회귀 검사와 실제 사용자 5~8명의 첫 면접 완료율·권한 거절률·재연습 전환율을 측정합니다.

## 7. GitHub 인수인계 상태

비공개 저장소 `jonandkill/jobhill-ai-interview-platform` 연결과 쓰기 권한을 확인했습니다. 개선 소스는 `security/ux-camera-hardening-2026-08-23` 브랜치에서 관리하며, 포함된 GitHub Actions가 잠금 의존성 설치·타입 검사·결정론 테스트·프로덕션 빌드를 검증한 뒤 PR 리뷰를 거쳐 병합합니다.

## 8. 주요 변경 파일

- 인증·보안: `server/_core/oauth.ts`, `sdk.ts`, `env.ts`, `security.ts`, `cookies.ts`, `index.ts`
- 권한·결제·AI: `server/routers.ts`, `server/db.ts`, `server/db_payment_links.ts`, `shared/products.ts`
- 카메라·생애주기: `client/src/components/InterviewMediaCheck.tsx`, `client/src/pages/Interview.tsx`, `Dashboard.tsx`, `AIEvaluation.tsx`
- 신뢰성·내보내기: `client/src/lib/safeHtml.ts`, `server/_core/pdfGenerator.ts`, `wordGenerator.ts`
- 정책·문구: `Home.tsx`, `Privacy.tsx`, `Terms.tsx`, `ReviewsSection.tsx`, 이메일 인증 화면
- 운영: `.env.example`, `pnpm-workspace.yaml`, 본 보고서

이 보고서는 첨부 소스에 대한 기술 보안·제품 UX 검토이며 침투 테스트, 결제사 인증, 개인정보 영향평가 또는 법률 의견을 대체하지 않습니다.
